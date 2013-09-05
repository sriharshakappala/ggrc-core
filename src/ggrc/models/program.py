# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: david@reciprocitylabs.com
# Maintained By: david@reciprocitylabs.com

from ggrc import db
from .associationproxy import association_proxy
from .context import Contextable
from .mixins import deferred, BusinessObject, Timeboxed
from .object_document import Documentable
from .object_objective import Objectiveable
from .object_person import Personable
from .reflection import PublishOnly
from .relationship import Relatable

class Program(
    Documentable, Personable, Objectiveable, Relatable, Contextable,
    BusinessObject, Timeboxed, db.Model):
  __tablename__ = 'programs'

  KINDS = [
      'Directive',
      ]

  KINDS_HIDDEN = [
      'Company Controls Policy',
      ]

  kind = deferred(db.Column(db.String), 'Program')

  program_controls = db.relationship(
      'ProgramControl', backref='program', cascade='all, delete-orphan')
  controls = association_proxy(
      'program_controls', 'control', 'ProgramControl')
  program_directives = db.relationship(
      'ProgramDirective', backref='program', cascade='all, delete-orphan')
  directives = association_proxy(
      'program_directives', 'directive', 'ProgramDirective')
  cycles = db.relationship(
      'Cycle', backref='program', cascade='all, delete-orphan')
  scope = deferred(db.Column(db.Text), 'Program')
  organization = deferred(db.Column(db.String), 'Program')

  _publish_attrs = [
      'kind',
      PublishOnly('program_controls'),
      'controls',
      'program_directives',
      'directives',
      'cycles',
      'scope',
      'organization',
      ]

  @classmethod
  def eager_query(cls):
    from sqlalchemy import orm

    query = super(Program, cls).eager_query()
    return query.options(
        orm.subqueryload_all('program_directives.directive'),
        orm.subqueryload('cycles'),
        orm.subqueryload_all('program_controls.control'))
