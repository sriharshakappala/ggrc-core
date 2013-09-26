# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: dan@reciprocitylabs.com
# Maintained By: dan@reciprocitylabs.com

"""ggrc.login

Provides basic login and session management using Flask-Login with various
backends
"""

import flask_login
from ggrc.extensions import get_extension_module_for

def get_login_module():
  return get_extension_module_for('LOGIN_MANAGER', False)

def user_loader(id):
  from .common import find_user_by_id
  return find_user_by_id(id)

def init_app(app):
  login_module = get_login_module()
  if not login_module:
    return

  login_manager = flask_login.LoginManager()
  login_manager.init_app(app)
  login_manager.login_view = 'login'
  login_manager.login_message = None
  #login_manager.session_protection = 'strong'

  app.route('/login')(login_module.login)
  app.route('/logout')(login_module.logout)

  app.login_manager.user_loader(user_loader)
  #app.before_request(login_module.user_load_or_create)
  #app.context_processor(login_module.session_context)

def get_current_user():
  if get_login_module():
    return flask_login.current_user
  else:
    return None

def get_current_user_id():
  user = get_current_user()
  if user is not None and not user.is_anonymous():
    return user.id
  else:
    return None

def login_required(func):
  if get_login_module():
    return flask_login.login_required(func)
  else:
    return func
#login_required = flask_login.login_required
