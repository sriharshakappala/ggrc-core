# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: david@reciprocitylabs.com
# Maintained By: david@reciprocitylabs.com

import datetime
from ggrc import db
from ggrc.models.mixins import deferred, Base, Described
from sqlalchemy.ext.declarative import declared_attr

class Context(Base, Described, db.Model):
  __tablename__ = 'contexts'

  name = deferred(db.Column(db.String(128), nullable=True), 'Context')
  related_object_id = deferred(
      db.Column(db.Integer(), nullable=True), 'Context')
  related_object_type = deferred(
      db.Column(db.String(128), nullable=True), 'Context')

  @property
  def related_object(self, obj=[]):
    if len(obj) == 0:
      if self.related_object_type:
        import ggrc.models
        import ggrc.services.util
        service = ggrc.services.util.service_for(str(self.related_object_type))
        model_class = service._model
        obj.append(db.session.query(model_class).get(self.related_object_id))
      else:
        obj.append(None)
    return obj[0]

  @related_object.setter
  def related_object(self, obj):
    if obj is not None:
      self.related_object_id = obj.id
      self.related_object_type = obj.__class__.__name__
    else:
      self.related_object_id = None
      self.related_object_type = None

  _publish_attrs = ['name', 'related_object',]
  _sanitize_html = ['name',]

class Contextable(object):
  @declared_attr
  def contexts(cls):
    joinstr = 'and_(remote(Context.related_object_id) == {type}.id, '\
                    'remote(Context.related_object_type) == "{type}")'
    joinstr = joinstr.format(type=cls.__name__)
    return db.relationship(
        'Context',
        primaryjoin=joinstr,
        foreign_keys='Context.related_object_id',
        cascade='all, delete-orphan',
        order_by='Context.id')

  def get_or_create_object_context(self, context, name=None, description=None):
    if len(self.contexts) == 0:
      if name is None:
        name='{object_type} Context {timestamp}'.format(
          object_type=self.__class__.__name__,
          timestamp=datetime.datetime.now()),
      if description is None:
        description = ''
      new_context = Context(
          name=name,
          description=description,
          related_object=self)
      if isinstance(context, Context):
        new_context.context = context
      else:
        new_context.context_id = context
      self.contexts.append(new_context)
    return self.contexts[0]
