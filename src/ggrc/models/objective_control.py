# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: dan@reciprocitylabs.com
# Maintained By: dan@reciprocitylabs.com

from ggrc import db
from .mixins import Base

class ObjectiveControl(Base, db.Model):
  __tablename__ = 'objective_controls'

  __table_args__ = (
    db.UniqueConstraint('objective_id', 'control_id'),
  )

  objective_id = db.Column(db.Integer, db.ForeignKey('objectives.id'), nullable = False)
  control_id = db.Column(db.Integer, db.ForeignKey('controls.id'), nullable = False)

  _publish_attrs = [
      'objective',
      'control',
      ]

  def _display_name(self):
    return self.objective.display_name + '<->' + self.control.display_name
