# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: silas@reciprocitylabs.com
# Maintained By: silas@reciprocitylabs.com

from datetime import datetime
from os.path import abspath, dirname, join

from mock import patch

from ggrc import db
from ggrc.converters.import_helper import handle_converter_csv_export
from ggrc.converters.controls import ControlsConverter
from ggrc.models import Category, Control, Policy, ObjectControl, Option, System
from tests.ggrc import TestCase


THIS_ABS_PATH = abspath(dirname(__file__))
CSV_DIR = join(THIS_ABS_PATH, 'comparison_csvs/')


class TestExport(TestCase):
  def setUp(self):
    self.csv_filename = "dummy_filename.csv"
    self.expected_status_code = 200
    self.expected_headers = [
        ('Content-Type', 'text/csv'),
        (
            'Content-Disposition',
            'attachment; filename="{}"'.format(self.csv_filename)
        )
    ]
    super(TestExport, self).setUp()

  def tearDown(self):
    super(TestExport, self).tearDown()

  @patch("ggrc.converters.import_helper.current_app.make_response")
  def test_simple(self, mock_response):
    with open(join(CSV_DIR, "minimal_export.csv"), "r") as f:
      expected_csv = f.read()
    sample_day = datetime(2013, 9, 25)
    pol1 = Policy(
      kind="Company Policy",
      title="Example Policy",
      slug="POL-123",
    )
    cont1 = Control(
      directive=pol1,
      title="Minimal Control 1",
      slug="CTRL-1",
      created_at=sample_day,
      updated_at=sample_day,
    )
    cont2 = Control(
      directive=pol1,
      title="Minimal Control 2",
      slug="CTRL-2",
      created_at=sample_day,
      updated_at=sample_day,
    )
    options = {'directive': pol1, 'export': True}
    handle_converter_csv_export(
        self.csv_filename,
        pol1.controls,
        ControlsConverter,
        **options
    )
    # calls with one tuple of three args, so double parens
    mock_response.assert_called_once_with((
        expected_csv,
        self.expected_status_code,
        self.expected_headers,
    ))

  @patch("ggrc.converters.import_helper.current_app.make_response")
  def test_mappings(self, mock_response):
    with open(join(CSV_DIR, "mappings_export.csv"), "r") as f:
      expected_csv = f.read()
    sample_day = datetime(2013, 9, 25)
    #pol1 = PolicyFactory(
    pol1 = Policy(
      kind="Company Policy",
      title="Example Policy 3",
      description="Example Description",
      slug="POL-123",
      url="http://example.com/policy/3",
    )
    cont1 = Control(
      directive=pol1,
      title="Complex Control 2",
      slug="CTRL-2345",
      description="Example Complex Control",
      company_control=True,
      fraud_related="1",
      key_control="1",
      notes="These are the notes on the example control.",
      url="http://example.com/control/3",
      created_at=sample_day,
      updated_at=sample_day,
    )
    cat1 = Category(name="Governance")
    cat2 = Category(name="Authorization")
    sys1 = System(slug="ACLS", title="System1")
    ob_cont1 = ObjectControl(
        controllable=sys1,
        control=cont1,
    )
    cont1.object_controls.append(ob_cont1)
    db.session.add(cont1)
    db.session.commit()
    cont1.categories.append(cat1)
    cont1.categories.append(cat2)
    options = {'directive': pol1, 'export': True}
    handle_converter_csv_export(
        self.csv_filename,
        pol1.controls,
        ControlsConverter,
        **options
    )
    args, kwargs = mock_response.call_args
    #with open(join(CSV_DIR, "test_out.csv"), "w") as f:
    #    f.write(args[0][0])
    mock_response.assert_called_once_with((
        expected_csv,
        self.expected_status_code,
        self.expected_headers,
    ))
