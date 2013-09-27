from os.path import abspath, dirname, join
import unittest

from tests.ggrc.converters.helpers import AbstractCSV, compare_csvs

THIS_ABS_PATH = abspath(dirname(__file__))
CSV_DIR = join(THIS_ABS_PATH, 'comparison_csvs/')
TEST_FILE1 = join(CSV_DIR, "helper_test1.csv")
TEST_FILE2 = join(CSV_DIR, "helper_test2.csv")
# file with an irrelevant difference from TEST_FILE1
IRREL_DIF_FILE = join(CSV_DIR, "irrel_diff.csv")

class TestCSVCompare(unittest.TestCase):
  def setUp(self):
    with open(TEST_FILE1, "r") as f:
      self.csv1a = AbstractCSV(f.read())
    with open(TEST_FILE1, "r") as f:
      self.csv1b = AbstractCSV(f.read())
    with open(TEST_FILE2, "r") as f:
      self.csv2 = AbstractCSV(f.read())
    with open(IRREL_DIF_FILE, "r") as f:
      self.csv3 = AbstractCSV(f.read())

  def tearDown(self):
    pass

  def test_same_file(self):
    comp = compare_csvs(self.csv1a, self.csv1b)
    self.assertTrue(comp, "file not equal to itself")

  def test_different_file(self):
    comp = compare_csvs(self.csv1a, self.csv2)
    self.assertEqual(
      comp,
      ("Complex Control 2", "Complex Control 3"),
      "Difference not detected"
    )

  def test_irrelevant_difference(self):
    comp = compare_csvs(self.csv1a, self.csv3)
    self.assertTrue(
      comp,
      "Difference detected that should have been ignored."
    )
