# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: david@reciprocitylabs.com
# Maintained By: david@reciprocitylabs.com

import datetime
import factory
import random
from factory.base import BaseFactory, FactoryMetaClass, CREATE_STRATEGY
from factory.fuzzy import FuzzyChoice, FuzzyDate, FuzzyDateTime, FuzzyInteger
from factory.compat import UTC
from ggrc import models
from ggrc.models.reflection import AttributeInfo

def random_string(prefix=''):
  return '{prefix}{suffix}'.format(
      prefix=prefix,
      suffix=random.randint(0,9999999999),
      )

def random_string_attribute(prefix=''):
  return factory.LazyAttribute(lambda m: random_string(prefix))

class FactoryStubMarker(object):
  def __init__(self, class_):
    self.class_ = class_

class FactoryAttributeGenerator(object):
  """Use the SQLAlchemy ORM model to generate factory attributes."""
  @classmethod
  def generate(cls, attrs, model_class, attr):
    """Generate a factory attribute for `attr` by inspecting the mapping
    type of the attribute in `model_class`. Add the attribute to the
    `attrs` dictionary.
    """
    if (hasattr(attr, '__call__')):
      attr_name = attr.attr_name
      value = []
    else:
      attr_name = attr
      class_attr = getattr(model_class, attr_name)
      #look up the class method to use to generate the attribute
      method = getattr(cls, class_attr.__class__.__name__)
      value = method(attr_name, class_attr)
    attrs[attr_name] = value

  @classmethod
  def InstrumentedAttribute(cls, attr_name, class_attr):
    method = getattr(cls, class_attr.property.__class__.__name__)
    return method(attr_name, class_attr)

  @classmethod
  def ColumnProperty(cls, attr_name, class_attr):
    method = getattr(
        cls,
        class_attr.property.expression.type.__class__.__name__,
        cls.default_column_handler)
    return method(attr_name, class_attr)

  @classmethod
  def default_column_handler(cls, attr_name, class_attr):
    return random_string_attribute(attr_name)

  @classmethod
  def DateTime(cls, attr_name, class_attr):
    return FuzzyDateTime(
      datetime.datetime(2013,1,1,tzinfo=UTC),
      datetime.datetime.now(UTC) + datetime.timedelta(days=730),
      )

  @classmethod
  def Date(cls, attr_name, class_attr):
    return FuzzyDate(
      datetime.date(2013,1,1),
      datetime.date.today() + datetime.timedelta(days=730),
      )

  @classmethod
  def Boolean(cls, attr_name, class_attr):
    return FuzzyChoice([True, False])

  @classmethod
  def Integer(cls, attr_name, class_attr):
    return FuzzyInteger(0,100000)

  @classmethod
  def RelationshipProperty(cls, attr_name, class_attr):
    if class_attr.property.uselist:
      return []
    else:
      columns = tuple(class_attr.property.local_columns)
      # FIXME: ? Doesn't handle multiple local columns, so won't work for
      #   polymorphic links
      if columns[0].nullable:
        # Not a required association, so skip it
        return None
      elif columns[0].primary_key:
        # This is a 'reverse' association, so skip it (primary keys are
        #   not nullable, but the relationship may still be optional)
        return None
      else:
        return FactoryStubMarker(class_attr.property.mapper.class_)

  @classmethod
  def AssociationProxy(cls, attr_name, class_attr):
    return []

  @classmethod
  def polymorphic_link(cls, attr_name, class_attr):
    return None

  @classmethod
  def property(cls, attr_name, class_attr):
    return None

class ModelFactoryMetaClass(FactoryMetaClass):
  def __new__(cls, class_name, bases, attrs, extra_attrs=None):
    """Use model reflection to build up the list of factory attributes.
    The default attributes can be overridden by defining a subclass
    of `ModelFactory` and defining the attribute to be overriden.
    """
    model_class = attrs.pop('MODEL', None)
    if model_class:
      attrs['FACTORY_FOR'] = dict
      attribute_info = AttributeInfo(model_class)
      for attr in attribute_info._create_attrs:
        if hasattr(attr, '__call__'):
          attr_name = attr.attr_name
        else:
          attr_name = attr
        if not attr_name in attrs:
          FactoryAttributeGenerator.generate(attrs, model_class, attr)
    return super(ModelFactoryMetaClass, cls).__new__(
        cls, class_name, bases, attrs)

ModelFactory = ModelFactoryMetaClass(
    'ModelFactory', (BaseFactory,), {
    'ABSTRACT_FACTORY': True,
    'FACTORY_STRATEGY': CREATE_STRATEGY,
    '__doc__': """ModelFactory base with build and create support.

    This class has supports SQLAlchemy ORM.
    """,
    })

def factory_for(model_class):
  """Get the factory for a model by name or by class.
  If there is a factory defined for this model in globals() that factory
  will be used. Otherwise, one will be created and added to globals().
  """
  if type(model_class) is str or type(model_class) is unicode:
    if '.' in model_class:
      import sys
      path = model_class.split('.')
      module_name = '.'.join(path[:-1])
      factory_name = path[-1]
      __import__(module_name)
      model_class = getattr(sys.modules[module_name], factory_name)
    else:
      factory_name = model_class
      import ggrc.models
      model_class = getattr(ggrc.models, model_class)
  else:
    factory_name = model_class.__name__
  factory_name = '{0}Factory'.format(factory_name)
  factory = globals().get(factory_name, None)
  if not factory:
    class model_factory(ModelFactory):
      MODEL = model_class
    model_factory.__name__ = factory_name
    globals()[factory_name] = model_factory
    factory = model_factory
  return factory

class ProgramFactory(ModelFactory):
  MODEL = models.Program
  kind = FuzzyChoice(['Directive', 'Company Controls'])

class ContractFactory(ModelFactory):
  MODEL = models.Contract
  kind = FuzzyChoice(MODEL.valid_kinds)

class PolicyFactory(ModelFactory):
  MODEL = models.Policy
  kind = FuzzyChoice(MODEL.valid_kinds)

class RegulationFactory(ModelFactory):
  MODEL = models.Regulation
  kind = FuzzyChoice(MODEL.valid_kinds)
