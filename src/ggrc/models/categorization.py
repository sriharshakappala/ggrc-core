# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: david@reciprocitylabs.com
# Maintained By: david@reciprocitylabs.com

from ggrc import db
from sqlalchemy.ext.associationproxy import association_proxy
from .mixins import polymorphic_link, Base

BACKREF_NAME_FORMAT = '{type}_{scope}_categorizable'

class Categorization(Base, db.Model):
  __tablename__ = 'categorizations'

  category_id = db.Column(
      db.Integer, db.ForeignKey('categories.id'), nullable=False)
  categorizable_id = db.Column(db.Integer)
  categorizable_type = db.Column(db.String)

  @property
  def categorizable_attr(self):
    return BACKREF_NAME_FORMAT.format(
        type=self.categorizable_type, scope=self.category.scope_id)

  @polymorphic_link
  def categorizable(self):
    return getattr(self, self.categorizable_attr)

  @categorizable.setter
  def categorizable(self, value):
    setattr(self, self.categorizable_attr, value)

  _publish_attrs = [
      'categorizable',
      'category',
      ]
  _update_attrs = []

  @classmethod
  def eager_query(cls):
    from sqlalchemy import orm
    query = super(Categorization, cls).eager_query()
    return query.options(
        orm.subqueryload('category'))

class Categorizable(object):
  """Subclasses **MUST** provide a declared_attr method that defines the
  relationship and association_proxy. For example:
    
  ..
     
     @declared_attr
     def control_categorizations(cls):
       return cls.categorizations(
           'control_categorizations', 'control_categories', 100)
  """
  @classmethod
  def _categorization_attrs(cls):
    if not hasattr(cls, '_eager_loading_categorizations'):
      cls._eager_loading_categorizations = []
    return cls._eager_loading_categorizations

  @classmethod
  def _categorization_scopes(cls):
    if not hasattr(cls, '_categorization_scopes_map'):
      cls._categorization_scopes_map = {}
    return cls._categorization_scopes_map

  @classmethod
  def _categorizations(cls, rel_name, proxy_name, scope):
    cls._categorization_attrs().append(rel_name)
    cls._categorization_scopes()[rel_name] = scope
    setattr(cls, proxy_name, association_proxy(
        rel_name, 'category',
        creator=lambda category: Categorization(
            category=category,
            categorizable_type=cls.__name__,
            ),
        ))
    joinstr = 'and_(foreign(Categorization.categorizable_id) == {type}.id, '\
                   'foreign(Categorization.categorizable_type) == "{type}", '\
                   'Categorization.category_id == Category.id, '\
                   'Category.scope_id == {scope})'
    joinstr = joinstr.format(type=cls.__name__, scope=scope)
    return db.relationship(
        'Categorization',
        primaryjoin=joinstr,
        backref=BACKREF_NAME_FORMAT.format(type=cls.__name__, scope=scope),
        )

  # Method seems to not work
  @classmethod
  def eager_query(cls):
    from sqlalchemy import orm
    from sqlalchemy.sql.expression import and_, select
    from ggrc.models import Category
    query = super(Categorizable, cls).eager_query()
    for r in cls._categorization_attrs():
      scope_id = cls._categorization_scopes()[r]
      subselect = select(
          (Categorization.id, Categorization.category_id,
            Categorization.categorizable_id, Categorization.categorizable_type),
          and_(
            Categorization.categorizable_type == cls.__name__,
            Category.id == Categorization.category_id,
            Category.scope_id == scope_id))
      alias = orm.aliased(subselect)
      query = query\
          .outerjoin(alias, alias.c.categorizable_id == cls.id)\
          .options(orm.contains_eager(getattr(cls, r), alias=alias))

    return query
