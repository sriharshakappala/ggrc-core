# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: david@reciprocitylabs.com
# Maintained By: dan@reciprocitylabs.com

from ggrc import settings, db
from sqlalchemy import event
from sqlalchemy.ext.declarative import declared_attr
from sqlalchemy.orm import relationship
from sqlalchemy.orm.session import Session
from uuid import uuid1
from .inflector import ModelInflectorDescriptor
from .reflection import PublishOnly
from .computed_property import computed_property

"""Mixins to add common attributes and relationships. Note, all model classes
must also inherit from ``db.Model``. For example:

  ..

     class Market(BusinessObject, db.Model):
       __tablename__ = 'markets'

"""

def deferred(column, classname):
  """Defer column loading for basic properties, such as boolean or string, so
  that they are not loaded on joins. However, Identifiable provides an
  eager_query implementation that will specify undefer in the options so that
  when the resource is loaded itself, rather than through a join, it is
  completely loaded.

  In join tables, this function should not wrap foreign keys nor should it wrap
  type properties for polymorphic relations.
  """
  return db.deferred(column, group=classname+'_complete')

class polymorphic_link(property):
  pass

class Identifiable(object):
  """A model with an ``id`` property that is the primary key."""
  id = db.Column(db.Integer, primary_key=True)

  # REST properties
  _publish_attrs = ['id']
  _update_attrs = []

  _inflector = ModelInflectorDescriptor()

  @classmethod
  def eager_query(cls):
    mapper_class = cls._sa_class_manager.mapper.base_mapper.class_
    return db.session.query(cls).options(
        db.undefer_group(mapper_class.__name__+'_complete'),
        )

def created_at_args():
  """Sqlite doesn't have a server, per se, so the server_* args are useless."""
  return {'default': db.text('current_timestamp'),}

def updated_at_args():
  """Sqlite doesn't have a server, per se, so the server_* args are useless."""
  return {
    'default': db.text('current_timestamp'),
    'onupdate': db.text('current_timestamp'),
    }

class ChangeTracked(object):
  """A model with fields to tracked the last user to modify the model, the
  creation time of the model, and the last time the model was updated.
  """
  # FIXME: change modified_by_id to nullable=False when there is an Account
  # model
  @declared_attr
  def modified_by_id(cls):
    return deferred(db.Column(db.Integer), cls.__name__)

  @declared_attr
  def created_at(cls):
    return deferred(db.Column(
      db.DateTime,
      **created_at_args()), cls.__name__)

  @declared_attr
  def updated_at(cls):
    return deferred(db.Column(
      db.DateTime,
      **updated_at_args()), cls.__name__)

  @declared_attr
  def modified_by(cls):
    return db.relationship(
        'Person',
        primaryjoin='{0}.modified_by_id == Person.id'.format(cls.__name__),
        foreign_keys='{0}.modified_by_id'.format(cls.__name__),
        uselist=False,
        )
  #TODO Add a transaction id, this will be handy for generating etags
  #and for tracking the changes made to several resources together.
  #transaction_id = db.Column(db.Integer)

  # REST properties
  _publish_attrs = [
      'modified_by',
      'created_at',
      'updated_at',
      ]
  _update_attrs = []

class Relatable(object):
  @declared_attr
  def related_sources(cls):
    joinstr = 'and_(remote(Relationship.destination_id) == {type}.id, '\
                    'remote(Relationship.destination_type) == "{type}")'
    joinstr = joinstr.format(type=cls.__name__)
    return db.relationship(
        'Relationship',
        primaryjoin=joinstr,
        foreign_keys = 'Relationship.destination_id',
        cascade = 'all, delete-orphan')

  @declared_attr
  def related_destinations(cls):
    joinstr = 'and_(remote(Relationship.source_id) == {type}.id, '\
                    'remote(Relationship.source_type) == "{type}")'
    joinstr = joinstr.format(type=cls.__name__)
    return db.relationship(
        'Relationship',
        primaryjoin=joinstr,
        foreign_keys = 'Relationship.source_id',
        cascade = 'all, delete-orphan')

  #_publish_attrs = [
  #    'related_sources',
  #    'related_destinations'
  #    ]

  #@classmethod
  #def eager_query(cls):
  #  from sqlalchemy import orm

  #  query = super(Relatable, cls).eager_query()
  #  return query.options(
  #      orm.subqueryload('related_sources'),
  #      orm.subqueryload('related_destinations'))

class Described(object):
  @declared_attr
  def description(cls):
    return deferred(db.Column(db.Text), cls.__name__)


  # REST properties
  _publish_attrs = ['description']
  _fulltext_attrs = ['description']

class Hyperlinked(object):
  @declared_attr
  def url(cls):
    return deferred(db.Column(db.String), cls.__name__)


  # REST properties
  _publish_attrs = ['url']

class Hierarchical(object):
  @declared_attr
  def parent_id(cls):
    return deferred(db.Column(
        db.Integer, db.ForeignKey('{0}.id'.format(cls.__tablename__))),
        cls.__name__)

  @declared_attr
  def children(cls):
    return db.relationship(
        cls.__name__,
        backref=db.backref('parent', remote_side='{0}.id'.format(cls.__name__)),
        )

  # REST properties
  _publish_attrs = [
      'children',
      'parent',
      ]

  @classmethod
  def eager_query(cls):
    from sqlalchemy import orm

    query = super(Hierarchical, cls).eager_query()
    return query.options(
        orm.subqueryload('children'),
        #orm.joinedload('parent'),
        )


class Timeboxed(object):
  @declared_attr
  def start_date(cls):
    return deferred(db.Column(db.DateTime), cls.__name__)

  @declared_attr
  def end_date(cls):
    return deferred(db.Column(db.DateTime), cls.__name__)


  # REST properties
  _publish_attrs = ['start_date', 'end_date']

class ContextRBAC(object):
  @declared_attr
  def context_id(cls):
    return deferred(
        db.Column(db.Integer, db.ForeignKey('contexts.id')), cls.__name__)

  @declared_attr
  def context(self):
    return db.relationship('Context', uselist=False)

  _publish_attrs = ['context']

  #@classmethod
  #def eager_query(cls):
    #from sqlalchemy import orm

    #query = super(ContextRBAC, cls).eager_query()
    #return query.options(
        #orm.subqueryload('context'))

class Base(ChangeTracked, Relatable, ContextRBAC, Identifiable):
  """Several of the models use the same mixins. This class covers that common
  case.
  """

  def to_json(self):
    d = {}
    for column in self.__table__.columns:
      d[column.name] = getattr(self, column.name)
    d['display_name'] = self.display_name
    return d

  @computed_property
  def display_name(self):
    return self._display_name()

  def _display_name(self):
    return getattr(self, "title", None) or getattr(self, "name", "")


class Slugged(Base):
  """Several classes make use of the common mixins and additional are
  "slugged" and have additional fields related to their publishing in the
  system.
  """
  @declared_attr
  def slug(cls):
    return deferred(db.Column(db.String, nullable=False), cls.__name__)

  @declared_attr
  def title(cls):
    return deferred(db.Column(db.String, nullable=False), cls.__name__)

  # REST properties
  _publish_attrs = ['slug', 'title']
  _fulltext_attrs = ['slug', 'title']

  @classmethod
  def generate_slug_for(cls, obj):
    id = obj.id if hasattr(obj, 'id') else uuid1()
    obj.slug = "{0}-{1}".format(obj.__class__.__name__.upper(), id)

  @classmethod
  def ensure_slug_before_flush(cls, session, flush_context, instances):
    """Set the slug to a default string so we don't run afoul of the NOT NULL
    constraint.
    """
    for o in session.new:
      if isinstance(o, Slugged) and (o.slug is None or o.slug == ''):
        o.slug = str(uuid1())
        o._replace_slug = True

  @classmethod
  def ensure_slug_after_flush_postexec(cls, session, flush_context):
    """Replace the placeholder slug with a real slug that will be set on the
    next flush/commit.
    """
    for o in session.identity_map.values():
      if isinstance(o, Slugged) and hasattr(o, '_replace_slug'):
        cls.generate_slug_for(o)
        delattr(o, '_replace_slug')

event.listen(Session, 'before_flush', Slugged.ensure_slug_before_flush)
event.listen(
  Session, 'after_flush_postexec', Slugged.ensure_slug_after_flush_postexec)

class BusinessObject(Slugged, Described, Hyperlinked):
  @declared_attr
  def owner_id(cls):
    return deferred(
        db.Column(db.Integer, db.ForeignKey('people.id')), cls.__name__)
  @declared_attr
  def owner(self):
    return db.relationship('Person', uselist=False)

  _publish_attrs = ['owner']
