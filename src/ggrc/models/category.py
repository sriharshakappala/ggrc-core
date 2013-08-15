
# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By:
# Maintained By:

from ggrc import db
from sqlalchemy.ext.associationproxy import association_proxy
from .categorization import Categorization
from .mixins import deferred, polymorphic_link, Base, Hierarchical

class CategorizedPublishable(object):
  def __init__(self, attr_name, type_name):
    self.attr_name = attr_name
    self.type_name = type_name

  @property
  def rel_class(self):
    import ggrc.models
    return getattr(ggrc.models, self.type_name)

  def __call__(self, updater, obj, json_obj):
    return updater.query_for(self.rel_class, json_obj, self.attr_name, True)

class Category(Hierarchical, Base, db.Model):
  __tablename__ = 'categories'

  name = deferred(db.Column(db.String), 'Category')
  lft = deferred(db.Column(db.Integer), 'Category')
  rgt = deferred(db.Column(db.Integer), 'Category')
  scope_id = deferred(db.Column(db.Integer), 'Category')
  depth = deferred(db.Column(db.Integer), 'Category')
  required = deferred(db.Column(db.Boolean), 'Category')

  categorizations = db.relationship(
      'ggrc.models.categorization.Categorization',
      backref='category', 
      cascade='all, delete-orphan',
      )
  control_categorizations = db.relationship(
      'Categorization',
      primaryjoin=\
          'and_(foreign(Categorization.category_id) == Category.id, '
               'foreign(Categorization.categorizable_type) == "Control")',
      )
  risk_categorizations = db.relationship(
      'Categorization',
      primaryjoin=\
          'and_(foreign(Categorization.category_id) == Category.id, '
               'foreign(Categorization.categorizable_type) == "Risk")',
      )
  controls = association_proxy(
      'control_categorizations', 'categorizable',
      creator=lambda categorizable: Categorization(
          categorizable=categorizable,
          categorizable_type='Control',
          ),
      )
  risks = association_proxy(
      'risk_categorizations', 'categorizable',
      creator=lambda categorizable: Categorization(
          categorizable=categorizable,
          categorizable_type='Risk',
          ),
      )

  # REST properties
  _publish_attrs = [
      'name',
      'scope_id',
      'required',
      'categorizations',
      'control_categorizations',
      'risk_categorizations',
      CategorizedPublishable('controls', 'Control'),
      CategorizedPublishable('risks', 'Risk'),
      ]

  @classmethod
  def eager_query(cls):
    from sqlalchemy import orm

    query = super(Category, cls).eager_query()
    return query.options(
        orm.subqueryload('categorizations'),
        orm.subqueryload('risk_categorizations'),
        orm.subqueryload('control_categorizations'))
