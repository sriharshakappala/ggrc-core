# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: silas@reciprocitylabs.com
# Maintained By: silas@reciprocitylabs.com

from datetime import datetime
from os.path import abspath, dirname, join

from mock import patch

from ggrc import db
from ggrc.converters.import_helper import handle_csv_import
from ggrc.converters.controls import ControlsConverter
from ggrc.models import Control, Category, Policy, System
from tests.ggrc import TestCase

THIS_ABS_PATH = abspath(dirname(__file__))
CSV_DIR = join(THIS_ABS_PATH, 'comparison_csvs/')


class TestImport(TestCase):
  def setUp(self):
    self.patcher = patch('ggrc.converters.base.log_event')
    self.mock_log = self.patcher.start()
    super(TestImport, self).setUp()

  def tearDown(self):
    self.patcher.stop()
    super(TestImport, self).tearDown()

  def test_simple(self):
    csv_filename = join(CSV_DIR, "minimal_export.csv")
    expected_titles = set([
      "Minimal Control 1",
      "Minimal Control 2",
    ])
    expected_slugs = set([
      "CTRL-1",
      "CTRL-2",
    ])
    pol1 = Policy(
      kind="Company Policy",
      title="Example Policy",
      slug="POL-123",
    )
    db.session.add(pol1)
    db.session.commit()
    options = {'directive_id': pol1.id, 'dry_run': False}
    handle_csv_import(
        ControlsConverter,
        csv_filename,
        **options
    )
    actual_titles = set()
    actual_slugs = set()
    for control in pol1.controls:
      actual_titles.add(control.title)
      actual_slugs.add(control.slug)
    self.assertEqual(
        expected_titles,
        actual_titles,
        "Control titles not imported correctly"
    )
    self.assertEqual(
        expected_slugs,
        actual_slugs,
        "Control slugs not imported correctly"
    )
    self.mock_log.assert_called_once_with(db.session)

  def test_mappings(self):
    sys1 = System(slug="ACLS", title="System1")
    sys2 = System(slug="SLCA", title="System2")
    db.session.add(sys1)
    db.session.add(sys2)
    expected_titles = set([
      "Complex Control 2",
    ])
    expected_slugs = set([
      "CTRL-2345",
    ])
    csv_filename = join(CSV_DIR, "mappings_import.csv")
    pol1 = Policy(
      kind="Company Policy",
      title="Example Policy",
      slug="POL-123",
    )
    db.session.add(pol1)
    db.session.commit()
    options = {'directive_id': pol1.id, 'dry_run': False}
    handle_csv_import(
        ControlsConverter,
        csv_filename,
        **options
    )
    actual_titles = set()
    actual_slugs = set()
    for control in pol1.controls:
      actual_titles.add(control.title)
      actual_slugs.add(control.slug)
    self.assertEqual(
        expected_titles,
        actual_titles,
        "Control titles not imported correctly"
    )
    self.assertEqual(
        expected_slugs,
        actual_slugs,
        "Control slugs not imported correctly"
    )
    systems = System.query.all()
    for system in systems:
      self.assertEqual(
          system.controls,
          pol1.controls,
          "System {0} not connected to controls on import".format(
              system.slug
          ),
      )
    self.mock_log.assert_called_once_with(db.session)
