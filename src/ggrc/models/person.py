# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: david@reciprocitylabs.com
# Maintained By: david@reciprocitylabs.com

from ggrc import db
from sqlalchemy.orm import validates
from .mixins import deferred, Base
from .reflection import PublishOnly
from .utils import validate_option
from .exceptions import ValidationError
from .context import Contextable
import re

class Person(Base, Contextable, db.Model):
  __tablename__ = 'people'

  email = deferred(db.Column(db.String), 'Person')
  name = deferred(db.Column(db.String), 'Person')
  language_id = deferred(db.Column(db.Integer), 'Person')
  company = deferred(db.Column(db.String), 'Person')

  object_people = db.relationship(
      'ObjectPerson', backref='person', cascade='all, delete-orphan')
  language = db.relationship(
      'Option',
      primaryjoin='and_(foreign(Person.language_id) == Option.id, '\
                       'Option.role == "person_language")',
      uselist=False,
      )

  _fulltext_attrs = [
      'company',
      'email',
      'name',
      ]
  _publish_attrs = [
      'company',
      'email',
      'language',
      'name',
      PublishOnly('object_people'),
      ]
  _sanitize_html = [
      'company',
      'name',
      ]

  # Methods required by Flask-Login
  def is_authenticated(self):
    return True

  def is_active(self):
    return True #self.active

  def is_anonymous(self):
    return False

  def get_id(self):
    return unicode(self.id)

  @validates('language')
  def validate_person_options(self, key, option):
    return validate_option(self.__class__.__name__, key, option, 'person_language')

  @validates('email')
  def validate_email(self, key, email):
    if re.match("[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?", email) is None:
      message = "Must provide a valid email address"
      raise ValidationError(message)
    return email

  def get_or_create_personal_context(self):
    return self.get_or_create_object_context(
        context=1,
        name='Personal Context for {0}'.format(self.id),
        description='')

  @classmethod
  def eager_query(cls):
    from sqlalchemy import orm

    #query = super(Person, cls).eager_query()
    # Completely overriding eager_query to avoid eager loading of the 
    # modified_by relationship
    return db.session.query(cls).options(
        orm.undefer('id'),
        orm.undefer('modified_by_id'),
        orm.undefer('created_at'),
        orm.undefer('updated_at'),
        orm.undefer('context_id'),
        orm.undefer('email'),
        orm.undefer('name'),
        orm.undefer('language_id'),
        orm.undefer('company'),
        orm.joinedload('language'),
        orm.subqueryload('object_people'),
        )

  def _display_name(self):
    return self.email
