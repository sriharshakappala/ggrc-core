# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: vraj@reciprocitylabs.com
# Maintained By: vraj@reciprocitylabs.com

from ggrc import db
from .mixins import Base

class DirectiveControl(Base, db.Model):
  __tablename__ = 'directive_controls'

  __table_args__ = (
    db.UniqueConstraint('directive_id', 'control_id'),
  )

  directive_id = db.Column(db.Integer, db.ForeignKey('directives.id'), nullable = False)
  control_id = db.Column(db.Integer, db.ForeignKey('controls.id'), nullable = False)

  _publish_attrs = [
      'directive',
      'control',
      ]

  def _display_name(self):
    return self.directive.display_name + '<->' + self.control.display_name
