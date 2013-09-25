# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: dan@reciprocitylabs.com
# Maintained By: dan@reciprocitylabs.com

from ggrc import db
from sqlalchemy.ext.associationproxy import association_proxy
from sqlalchemy.ext.declarative import declared_attr
from .mixins import deferred, Base, Timeboxed
from .reflection import PublishOnly

class ObjectControl(Base, Timeboxed, db.Model):
  __tablename__ = 'object_controls'

  role = deferred(db.Column(db.String), 'ObjectControl')
  notes = deferred(db.Column(db.Text), 'ObjectControl')
  control_id = db.Column(
      db.Integer, db.ForeignKey('controls.id'), nullable=False)
  controllable_id = db.Column(db.Integer, nullable=False)
  controllable_type = db.Column(db.String, nullable=False)

  @property
  def controllable_attr(self):
    return '{0}_controllable'.format(self.controllable_type)

  @property
  def controllable(self):
    return getattr(self, self.controllable_attr)

  @controllable.setter
  def controllable(self, value):
    self.controllable_id = value.id if value is not None else None
    self.controllable_type = value.__class__.__name__ if value is not None \
        else None
    return setattr(self, self.controllable_attr, value)

  __table_args__ = (
    db.UniqueConstraint('control_id', 'controllable_id', 'controllable_type'),
  )

  _publish_attrs = [
      'role',
      'notes',
      'control',
      'controllable',
      ]
  _sanitize_html = [
      'notes',
      ]

  @classmethod
  def eager_query(cls):
    from sqlalchemy import orm

    query = super(ObjectControl, cls).eager_query()
    return query.options(
        orm.subqueryload('control'))

  def _display_name(self):
    return self.controllable.display_name + '<->' + self.control.display_name

class Controllable(object):
  @declared_attr
  def object_controls(cls):
    cls.controls = association_proxy(
        'object_controls', 'control',
        creator=lambda control: ObjectControl(
            control=control,
            controllable_type=cls.__name__,
            )
        )
    joinstr = 'and_(foreign(ObjectControl.controllable_id) == {type}.id, '\
                   'foreign(ObjectControl.controllable_type) == "{type}")'
    joinstr = joinstr.format(type=cls.__name__)
    return db.relationship(
        'ObjectControl',
        primaryjoin=joinstr,
        backref='{0}_controllable'.format(cls.__name__),
        cascade='all, delete-orphan',
        )

  _publish_attrs = [
      PublishOnly('controls'),
      'object_controls',
      ]

  _include_links = [
      'object_controls',
      ]

  @classmethod
  def eager_query(cls):
    from sqlalchemy import orm

    query = super(Controllable, cls).eager_query()
    return cls.eager_inclusions(query, Controllable._include_links).options(
        orm.subqueryload('object_controls'))
