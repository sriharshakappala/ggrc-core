# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: david@reciprocitylabs.com
# Maintained By: david@reciprocitylabs.com

import json
from ggrc import db
from ggrc.models.context import Context
from ggrc.models.mixins import Base, Described

class Role(Base, Described, db.Model):
  """A user role. All roles have a unique name. This name could be a simple
  string, an email address, or some other form of string identifier.
  
  :permissions:
    example -
      { 'create': ['Program', 'Control'],
        'read': ['Program', 'Control'],
        'update': ['Program', 'Control'],
        'delete': ['Program']
      }
  """
  __tablename__ = 'roles'

  name  = db.Column(db.String(128), nullable=False)
  permissions_json = db.Column(db.Text(), nullable=False)

  @property
  def permissions(self):
    permissions = json.loads(self.permissions_json) or {}
    # make sure not to omit actions
    for action in ['create', 'read', 'update', 'delete']:
      if action not in permissions:
        permissions[action] = []
    return permissions

  @permissions.setter
  def permissions(self, value):
    self.permissions_json = json.dumps(value)

  _publish_attrs = ['name', 'permissions']

class UserRole(Base, db.Model):
  __tablename__ = 'user_roles'

  role_id = db.Column(db.Integer(), db.ForeignKey('roles.id'), nullable=False)
  role = db.relationship('Role')
  person_id = db.Column(db.Integer(), db.ForeignKey('people.id'), nullable=False)
  person = db.relationship('Person')

  _publish_attrs = ['role', 'person']

  @classmethod
  def role_assignments_for(cls, context):
    context_id = context.id if type(context) is Context else context
    all_assignments = db.session.query(UserRole)\
        .filter(UserRole.context_id == context_id)
    assignments_by_user = {}
    for assignment in all_assignments:
        assignments_by_user.setdefault(assignment.person.email, [])\
            .append(assignment.role)
    print 'role_assignments_for', assignments_by_user
    return assignments_by_user

  @classmethod
  def eager_query(cls):
    from sqlalchemy import orm

    query = super(UserRole, cls).eager_query()
    return query.options(
        orm.subqueryload('role'),
        orm.subqueryload('person'))
