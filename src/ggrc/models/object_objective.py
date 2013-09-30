# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: dan@reciprocitylabs.com
# Maintained By: dan@reciprocitylabs.com

from ggrc import db
from sqlalchemy.ext.associationproxy import association_proxy
from sqlalchemy.ext.declarative import declared_attr
from .mixins import deferred, Base, Timeboxed
from .reflection import PublishOnly

class ObjectObjective(Base, Timeboxed, db.Model):
  __tablename__ = 'object_objectives'

  role = deferred(db.Column(db.String), 'ObjectObjective')
  notes = deferred(db.Column(db.Text), 'ObjectObjective')
  objective_id = db.Column(db.Integer, db.ForeignKey('objectives.id'), nullable=False)
  objectiveable_id = db.Column(db.Integer, nullable=False)
  objectiveable_type = db.Column(db.String, nullable=False)

  @property
  def objectiveable_attr(self):
    return '{0}_objectiveable'.format(self.objectiveable_type)

  @property
  def objectiveable(self):
    return getattr(self, self.objectiveable_attr)

  @objectiveable.setter
  def objectiveable(self, value):
    self.objectiveable_id = value.id if value is not None else None
    self.objectiveable_type = value.__class__.__name__ if value is not None \
        else None
    return setattr(self, self.objectiveable_attr, value)

  __table_args__ = (
    db.UniqueConstraint('objective_id', 'objectiveable_id', 'objectiveable_type'),
  )

  _publish_attrs = [
      'role',
      'notes',
      'objective',
      'objectiveable',
      ]
  _sanitize_html = [
      'notes',
      ]

  @classmethod
  def eager_query(cls):
    from sqlalchemy import orm

    query = super(ObjectObjective, cls).eager_query()
    return query.options(
        orm.subqueryload('objective'))

  def _display_name(self):
    return self.objectiveable.display_name + '<->' + self.objective.display_name

class Objectiveable(object):
  @declared_attr
  def object_objectives(cls):
    cls.objectives = association_proxy(
        'object_objectives', 'objective',
        creator=lambda objective: ObjectObjective(
            objective=objective,
            objectiveable_type=cls.__name__,
            )
        )
    joinstr = 'and_(foreign(ObjectObjective.objectiveable_id) == {type}.id, '\
                   'foreign(ObjectObjective.objectiveable_type) == "{type}")'
    joinstr = joinstr.format(type=cls.__name__)
    return db.relationship(
        'ObjectObjective',
        primaryjoin=joinstr,
        backref='{0}_objectiveable'.format(cls.__name__),
        cascade='all, delete-orphan',
        )

  _publish_attrs = [
      PublishOnly('objectives'),
      'object_objectives',
      ]

  @classmethod
  def eager_query(cls):
    from sqlalchemy import orm

    query = super(Objectiveable, cls).eager_query()
    return query.options(orm.subqueryload('object_objectives'))
