
# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By:
# Maintained By:

if __name__ == "__main__" and (__package__ is None or __package__ == ""):
  import os, sys
  parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
  if sys.path[0].endswith('ggrc'):
    # FIXME Not sure how this is getting in there, but it happens on Flask
    # restart!
    del sys.path[0]
  sys.path.insert(0, parent_dir)
  import ggrc
  __package__ = "ggrc"
  del os, sys

from .app import app

host = app.config.get("HOST") or "0.0.0.0"
port = app.config.get("PORT") or 8080

#from werkzeug.contrib.profiler import ProfilerMiddleware
#app.config['PROFILE'] = True
#app.wsgi_app = ProfilerMiddleware(app.wsgi_app, restrictions=[60])
#import logging
#logging.getLogger().setLevel(logging.DEBUG)

app.run(host=host, port=port)
