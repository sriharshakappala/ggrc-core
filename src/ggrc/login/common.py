"""Handle the interface to GGRC models for all login methods.
"""

from ggrc import db
from ggrc.models.context import Context
from ggrc.models.person import Person
from ggrc.fulltext import get_indexer
from ggrc.fulltext.recordbuilder import fts_record_for
from ggrc.services.common import log_event

def _base_user_query():
  from sqlalchemy import orm
  return Person.query.options(
      orm.undefer_group('Person_complete'))

def find_user_by_id(id):
  """Find Person object by some ``id``.
  Note that ``id`` need not be Person().id, but should match the value
  returned by ``Person().get_id()``.
  """
  return _base_user_query().filter(Person.id==int(id)).first()

def find_user_by_email(email):
  return _base_user_query().filter(Person.email==email).first()

def create_user(email, **kwargs):
  user = Person(email=email, **kwargs)
  db.session.add(user)
  db.session.flush()
  log_event(db.session, user, user.id)
  user_context = Context(
      name='Personal Context for {0}'.format(email),
      description='',
      related_object=user,
      context_id=1,
      )
  db.session.add(user_context)
  db.session.commit()
  get_indexer().create_record(fts_record_for(user))
  return user

def find_or_create_user_by_email(email, **kwargs):
  user = find_user_by_email(email)
  if not user:
    user = create_user(email, **kwargs)
  return user

def get_next_url(request, default_url):
  if 'next' in request.args:
    next_url = request.args['next']
    return next_url
  else:
    return default_url
