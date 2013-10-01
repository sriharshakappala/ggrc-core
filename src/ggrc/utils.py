# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: david@reciprocitylabs.com
# Maintained By: vraj@reciprocitylabs.com

import datetime
import json
import sys
import time
from flask import current_app

class DateTimeEncoder(json.JSONEncoder):
  """Custom JSON Encoder to handle datetime objects

  from:
     `http://stackoverflow.com/questions/12122007/python-json-encoder-to-support-datetime`_
  also consider:
     `http://hg.tryton.org/2.4/trytond/file/ade5432ac476/trytond/protocols/jsonrpc.py#l53`_
  """
  def default(self, obj):
    if isinstance(obj, datetime.datetime):
      return obj.isoformat()
    elif isinstance(obj, datetime.date):
      return obj.isoformat()
    elif isinstance(obj, datetime.timedelta):
      return (datetime.datetime.min + obj).time().isoformat()
    else:
      return super(DateTimeEncoder, self).default(obj)

class UnicodeSafeJsonWrapper(dict):
  """JSON received via POST has keys as unicode. This makes get work with plain
  `str` keys.
  """
  def __getitem__(self, key):
    ret = self.get(key)
    if ret is None:
      raise KeyError(key)
    return ret

  def get(self, key, default=None):
    return super(UnicodeSafeJsonWrapper, self).get(unicode(key), default)

def as_json(obj, **kwargs):
  return json.dumps(obj, cls=DateTimeEncoder, **kwargs)

def service_for(obj):
  module = sys.modules['ggrc.services']
  if type(obj) is str or type(obj) is unicode:
    model_type = obj
  else:
    model_type = obj.__class__.__name__
  return getattr(module, model_type, None)

def url_for(obj, id=None):
  service = service_for(obj)
  if service is None:
    return None
  if id:
    return service.url_for(id=id)
  return service.url_for(obj)

def view_service_for(obj):
  module = sys.modules['ggrc.views']
  if type(obj) is str or type(obj) is unicode:
    model_type = obj
  else:
    model_type = obj.__class__.__name__
  return getattr(module, model_type, None)

def view_url_for(obj, id=None):
  service = view_service_for(obj)
  if service is None:
    return None
  if id:
    return service.url_for(id=id)
  return service.url_for(obj)


class BenchmarkContextManager(object):
  def __init__(self, message):
    self.message = message

  def __enter__(self):
    self.start = time.time()

  def __exit__(self, exc_type, exc_value, exc_trace):
    end = time.time()
    current_app.logger.info("{:.4f} {}".format(end - self.start, self.message))

benchmark = BenchmarkContextManager
