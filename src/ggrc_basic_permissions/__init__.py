# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: david@reciprocitylabs.com
# Maintained By: david@reciprocitylabs.com

import datetime
from flask import session, Blueprint
import sqlalchemy.orm
from ggrc import db, settings
from ggrc.login import get_current_user, login_required
from ggrc.models.context import Context
from ggrc.models.program import Program
from ggrc.rbac import permissions
from ggrc.rbac.permissions_provider import DefaultUserPermissions
from ggrc.services.registry import service
from ggrc.services.common import Resource
from ggrc.views import object_view
from .models import Role, UserRole

blueprint = Blueprint(
    'permissions',
    __name__,
    template_folder='templates',
    static_folder='static',
    static_url_path='/static/ggrc_basic_permissions',
    )

class CompletePermissionsProvider(object):
  def __init__(self, settings):
    pass

  def permissions_for(self, user):
    ret = UserPermissions()
    # force the permissions to be loaded into session, otherwise templates
    # that depend on the permissions being available in session may assert
    # the user has no permissions!
    ret.check_permissions()
    return ret

  def handle_admin_user(self, user):
    pass

class UserPermissions(DefaultUserPermissions):
  def _is_allowed(self, permission):
    self.check_permissions()
    return super(UserPermissions, self)._is_allowed(permission)

  def _get_contexts_for(self, action, resource_type):
    self.check_permissions()
    return super(UserPermissions, self)\
        ._get_contexts_for(action, resource_type)

  def check_permissions(self):
    if 'permissions' not in session:
      self.load_permissions()
    elif session['permissions'] is None\
        and 'permissions_header_asserted' not in session:
      self.load_permissions()
    elif session['permissions'] is not None\
        and '__header_override' in session['permissions']:
      pass
    elif session['permissions'] is None\
        or '__user' not in session['permissions']\
        or session['permissions']['__user'] != \
            self.get_email_for(get_current_user()):
      self.load_permissions()
    elif 'permissions__ts' in session and not get_current_user().is_anonymous():
      self.load_permissions()
      #if not session['permissions__ts']:
        #self.load_permissions()
      #else:
        #current_most_recent_role_ts = db.session.query(UserRole.updated_at)\
            #.filter(UserRole.person_id==get_current_user().id)\
            #.order_by(UserRole.updated_at.desc())\
            #.first()
        #if current_most_recent_role_ts\
            #and current_most_recent_role_ts[0] > session['permissions__ts']:
          #self.load_permissions()

  def get_email_for(self, user):
    return user.email if hasattr(user, 'email') else 'ANONYMOUS'

  def load_permissions(self):
    if hasattr(session, '_permissions_loaded'):
      return
    session._permissions_loaded = True
    user = get_current_user()
    email = self.get_email_for(user)
    session['permissions'] = {}
    session['permissions']['__user'] = email
    if user is None or user.is_anonymous():
      session['permissions'] = {}
      session['permissions__ts'] = None
    elif hasattr(settings, 'BOOTSTRAP_ADMIN_USERS') \
        and email in settings.BOOTSTRAP_ADMIN_USERS:
      session['permissions'] = {
          DefaultUserPermissions.ADMIN_PERMISSION.action: {
            DefaultUserPermissions.ADMIN_PERMISSION.resource_type: [
              DefaultUserPermissions.ADMIN_PERMISSION.context_id,
              ],
            },
          }
      session['permissions']['__user'] = email
    else:
      session['permissions'] = {}
      session['permissions']['__user'] = email
      user_roles = db.session.query(UserRole)\
          .options(
              sqlalchemy.orm.undefer_group('UserRole_complete'),
              sqlalchemy.orm.undefer_group('Role_complete'),
              sqlalchemy.orm.joinedload('role'))\
          .filter(UserRole.person_id==user.id)\
          .order_by(UserRole.updated_at.desc())\
          .all()
      if len(user_roles) > 0:
        session['permissions__ts'] = user_roles[0].updated_at
      else:
        session['permissions__ts'] = None
      for user_role in user_roles:
        if isinstance(user_role.role.permissions, dict):
          for action, resource_types in user_role.role.permissions.items():
            for resource_type in resource_types:
              session['permissions'].setdefault(action, {})\
                  .setdefault(resource_type, list())\
                  .append(user_role.context_id)
      #grab personal context
      personal_context = db.session.query(Context).filter(
          Context.related_object_id == user.id,
          Context.related_object_type == 'Person',
          ).first()
      if not personal_context:
        personal_context = Context(
            name='Personal Context for {0}'.format(user.id),
            description='',
            context_id=1,
            related_object_id=user.id,
            related_object_type='Person',
            )
        db.session.add(personal_context)
        db.session.commit()
      session['permissions']['__GGRC_ADMIN__'] = {
          '__GGRC_ALL__': [personal_context.id,],
          }

def all_collections():
  """The list of all collections provided by this extension."""
  return [
      service('roles', Role),
      service('user_roles', UserRole),
      ]

@Resource.model_posted.connect_via(Program)
def handle_program_post(sender, obj=None, src=None, service=None):
  if src.get('private', False):
    # get the personal context for this logged in user
    personal_context = service.personal_context()

    # create a context specific to the program
    context = Context(
        context=personal_context,
        name='{object_type} Context {timestamp}'.format(
          object_type=service.model.__name__,
          timestamp=datetime.datetime.now()),
        description='',
        )
    db.session.add(context)
    db.session.flush()
    obj.context = context

    # add a user_roles mapping assigning the user creating the program
    # the ProgramOwner role in the program's context.
    program_owner_role = db.session.query(Role)\
        .filter(Role.name == 'ProgramOwner').first()
    user_role = UserRole(
        person=get_current_user(),
        role=program_owner_role,
        context=context,
        )
    db.session.add(user_role)
    db.session.flush()

    assign_role_reader(get_current_user())

@Resource.model_posted.connect_via(UserRole)
def handle_program_owner_role_assignment(
    sender, obj=None, src=None, service=None):
  if obj.role.name == 'ProgramOwner':
    assign_role_reader(obj.person)

def assign_role_reader(user):
    # assign the user RoleReader if they don't already have that role
    role_reader_role = db.session.query(Role)\
        .filter(Role.name == 'RoleReader').first()
    role_reader_for_user = db.session.query(UserRole)\
        .join(Role, UserRole.role == role_reader_role)\
        .filter(UserRole.person_id == user.id\
            and Role.name == 'RoleReader'
            and UserRole.context_id == 1)\
        .first()
    if not role_reader_for_user:
      role_reader_for_user = UserRole(
          person_id=user.id,
          role=role_reader_role,
          context_id=1,
          )
      db.session.add(role_reader_for_user)
      db.session.flush()
    
    # force a reload of permissions
    #del session['permissions']

# Removed because this is now handled purely client-side, but kept
# here as a reference for the next one.
# @BaseObjectView.extension_contributions.connect_via(Program)
def contribute_to_program_view(sender, obj=None, context=None):
  if obj.context_id != None and \
      permissions.is_allowed_read('Role', 1) and \
      permissions.is_allowed_read('UserRole', obj.context_id) and \
      permissions.is_allowed_create('UserRole', obj.context_id) and \
      permissions.is_allowed_update('UserRole', obj.context_id) and \
      permissions.is_allowed_delete('UserRole', obj.context_id):
    return 'permissions/programs/_role_assignments.haml'
  return None

from ggrc.app import app
@app.context_processor
def authorized_users_for():
  return {'authorized_users_for': UserRole.role_assignments_for,}

def initialize_all_object_views(app):
  role_view_entry = object_view(Role)
  role_view_entry.service_class.add_to(
      app,
      '/{0}'.format(role_view_entry.url),
      role_view_entry.model_class,
      decorators=(login_required,),
      )
