# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: silas@reciprocitylabs.com
# Maintained By: silas@reciprocitylabs.com

from datetime import datetime
from os.path import abspath, dirname, join

from mock import patch

from ggrc.converters.import_helper import handle_converter_csv_export
from ggrc.converters.controls import ControlsConverter
from ggrc.models.control import Control
from ggrc.models.directive import Policy
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
    self.assertEquals(pol1, cont1.directive)
