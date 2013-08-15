# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: david@reciprocitylabs.com
# Maintained By: david@reciprocitylabs.com

from ggrc import db
from sqlalchemy.ext.associationproxy import association_proxy
from sqlalchemy.ext.declarative import declared_attr
from .mixins import deferred, polymorphic_link, Base, Timeboxed
from .reflection import PublishOnly

class ObjectPerson(Base, Timeboxed, db.Model):
  __tablename__ = 'object_people'

  role = deferred(db.Column(db.String), 'ObjectPerson')
  notes = deferred(db.Column(db.Text), 'ObjectPerson')
  person_id = db.Column(db.Integer, db.ForeignKey('people.id'), nullable=False)

  # TODO: Polymorphic relationship
  personable_id = db.Column(db.Integer)
  personable_type = db.Column(db.String)

  @property
  def personable_attr(self):
    return '{0}_personable'.format(self.personable_type)

  @polymorphic_link
  def personable(self):
    return getattr(self, self.personable_attr)

  @personable.setter
  def personable(self, value):
    self.personable_id = value.id if value is not None else None
    self.personable_type = value.__class__.__name__ if value is not None \
        else None
    return setattr(self, self.personable_attr, value)

  _publish_attrs = [
      'role',
      'notes',
      'person',
      'personable',
      ]

  @classmethod
  def eager_query(cls):
    from sqlalchemy import orm

    query = super(ObjectPerson, cls).eager_query()
    return query.options(
        orm.subqueryload_all('person'))

  def _display_name(self):
    return self.personable.display_name + '<->' + self.person.display_name

class Personable(object):
  @declared_attr
  def object_people(cls):
    cls.people = association_proxy(
        'object_people', 'person',
        creator=lambda person: ObjectPerson(
            person=person,
            personable_type=cls.__name__,
            )
        )
    joinstr = 'and_(foreign(ObjectPerson.personable_id) == {type}.id, '\
                   'foreign(ObjectPerson.personable_type) == "{type}")'
    joinstr = joinstr.format(type=cls.__name__)
    return db.relationship(
        'ObjectPerson',
        primaryjoin=joinstr,
        backref='{0}_personable'.format(cls.__name__),
        cascade='all, delete-orphan',
        )

  _publish_attrs = [
      PublishOnly('people'),
      'object_people',
      ]

  @classmethod
  def eager_query(cls):
    from sqlalchemy import orm

    query = super(Personable, cls).eager_query()
    return query.options(
        #orm.subqueryload_all('object_people.person'))
        orm.joinedload('object_people'))
