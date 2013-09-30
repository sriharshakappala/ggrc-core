# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: david@reciprocitylabs.com
# Maintained By: david@reciprocitylabs.com

from ggrc import db
from ggrc.models.all_models import all_models
from ggrc.rbac import permissions
from sqlalchemy import event, and_, or_, text
from sqlalchemy.schema import DDL
from .sql import SqlIndexer

class MysqlRecordProperty(db.Model):
  __tablename__ = 'fulltext_record_properties'
  __table_args__ = {'mysql_engine': 'myisam'}

  key = db.Column(db.Integer, primary_key=True)
  type = db.Column(db.String(64), primary_key=True)
  context_id = db.Column(db.Integer)
  tags = db.Column(db.String)
  property = db.Column(db.String(64), primary_key=True)
  content = db.Column(db.Text)

event.listen(
    MysqlRecordProperty.__table__,
    'after_create',
    DDL('ALTER TABLE {tablename} ADD FULLTEXT INDEX {tablename}_text_idx '
      '(content)'.format(tablename=MysqlRecordProperty.__tablename__))
    )

class MysqlIndexer(SqlIndexer):
  record_type = MysqlRecordProperty

  def _get_type_query(
      self, types=None, permission_type='read', permission_model=None):
    model_names = [model.__name__ for model in all_models]
    if types is not None:
      model_names = [m for m in model_names if m in types]

    type_queries = []
    for model_name in model_names:
      type_query = None
      if permission_type == 'read':
        type_permissions = permissions.read_contexts_for(
            permission_model or model_name)
      elif permission_type == 'create':
        type_permissions = permissions.create_contexts_for(
            permission_model or model_name)
      elif permission_type == 'update':
        type_permissions = permissions.update_contexts_for(
            permission_model or model_name)
      elif permission_type == 'delete':
        type_permissions = permissions.delete_contexts_for(
            permission_model or model_name)

      if permission_model and type_permissions:
        type_permissions = set(type_permissions) & set(
            permissions.read_contexts_for(model_name))

      if type_permissions is None:
        type_query = (MysqlRecordProperty.type == model_name)
      elif type_permissions:
        type_query = and_(
            MysqlRecordProperty.type == model_name,
            MysqlRecordProperty.context_id.in_(type_permissions))
      else:
        type_query = False
      type_queries.append(type_query)

    return and_(
        MysqlRecordProperty.type.in_(model_names),
        or_(
          MysqlRecordProperty.context_id == None,
          *type_queries))

  def _get_filter_query(self, terms):
    if not terms:
      return True
    # FIXME: Temporary (slow) fix for words shorter than MySQL default limit
    elif len(terms) < 4:
      return MysqlRecordProperty.content.contains(terms)
    else:
      return MysqlRecordProperty.content.match(terms)

  def search(
      self, terms, types=None, permission_type='read', permission_model=None):
    query = self._get_type_query(types, permission_type, permission_model)
    query = and_(query, self._get_filter_query(terms))
    return db.session.query(self.record_type).filter(query)

  def counts(self, terms, group_by_type=True, types=None):
    from sqlalchemy import func, distinct

    query = db.session.query(
        self.record_type.type, func.count(distinct(self.record_type.key)))
    query = query.filter(self._get_type_query(types))
    query = query.filter(self._get_filter_query(terms))
    query = query.group_by(self.record_type.type)
    # FIXME: Is this needed for correct group_by/count-distinct behavior?
    #query = query.order_by(self.record_type.type, self.record_type.key)
    return query.all()

Indexer = MysqlIndexer
