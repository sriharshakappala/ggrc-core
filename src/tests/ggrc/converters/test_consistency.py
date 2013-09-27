# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: silas@reciprocitylabs.com
# Maintained By: silas@reciprocitylabs.com

from datetime import datetime
from os.path import abspath, dirname, join

from mock import patch

from ggrc import db
from ggrc.converters.import_helper import handle_converter_csv_export, handle_csv_import
from ggrc.converters.controls import ControlsConverter
from ggrc.models import Policy, System
from tests.ggrc import TestCase
from tests.ggrc.converters.helpers import AbstractCSV, compare_csvs


THIS_ABS_PATH = abspath(dirname(__file__))
CSV_DIR = join(THIS_ABS_PATH, 'comparison_csvs/')
TEST_FILE = "mappings_importEX.csv"


class TestConsistency(TestCase):
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
    super(TestConsistency, self).setUp()

  def tearDown(self):
    super(TestConsistency, self).tearDown()

  @patch("ggrc.converters.import_helper.current_app.make_response")
  def test_mappings(self, mock_response):
    sys1 = System(slug="ACLS", title="System1")
    sys2 = System(slug="SLCA", title="System2")
    db.session.add(sys1)
    db.session.add(sys2)
    # read in the file that should match the output
    csv_filename = join(CSV_DIR, TEST_FILE)
    with open(csv_filename, "r") as f:
      expected_csv = AbstractCSV(f.read())
    sample_day = datetime(2013, 9, 25)
    pol1 = Policy(
      kind="Company Policy",
      title="Example Policy",
      slug="POL-123",
    )
    db.session.add(pol1)
    db.session.commit()
    # import from spreadsheet to add to it
    import_options = {'directive_id': pol1.id, 'dry_run': False}
    handle_csv_import(
        ControlsConverter,
        csv_filename,
        **import_options
    )
    export_options = {'directive': pol1, 'export': True}
    # then export right back
    handle_converter_csv_export(
        "dummy_filename.csv",
        pol1.controls,
        ControlsConverter,
        **export_options
    )
    name, args, kwargs = mock_response.mock_calls[0]
    # called with one argument, which is a tuple w/ csv as first arg
    # so access first/only argument, then first arg of tuple
    actual_csv = AbstractCSV(args[0][0])
    #with open(join(CSV_DIR, "test_output.csv"), "w") as f:
    #  f.write(args[0][0])
    compare = compare_csvs(actual_csv, expected_csv)
    self.assertTrue(compare, compare)
