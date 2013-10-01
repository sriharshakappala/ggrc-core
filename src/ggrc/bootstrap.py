
# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By:
# Maintained By:

# Load initial project settings
import settings

# FIXME: This should probably be done in `settings/app_engine.py`
if getattr(settings, 'APP_ENGINE', False):
  import sys
  import os
  sys.path.insert(0, os.path.join(settings.BASE_DIR, 'packages.zip'))
  del os
  del sys

# FIXME: This should be more complete
import logging
#logging.getLogger().setLevel(logging.DEBUG)
logger = logging.getLogger(__name__)
#logger.setLevel(logging.DEBUG)

from flask.ext.sqlalchemy import SQLAlchemy
db = SQLAlchemy()

class String(db.String):
  """Simple subclass of sqlalchemy.orm.String which provides a default
  length for `String` types to satisfy MySQL
  """
  def __init__(self, length=None, *args, **kwargs):
    # TODO: Check for MySQL and only apply when needed
    if length is None:
      length = 250
    return super(String, self).__init__(length, *args, **kwargs)

db.String = String
