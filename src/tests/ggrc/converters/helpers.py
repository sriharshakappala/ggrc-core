import csv
from StringIO import StringIO

CREATED_HEADER_STRING = 'Created'
UPDATED_HEADER_STRING = 'Updated'
HEADER_ROW_INDEX = 4


class AbstractCSV(object):

    def __init__(self, s):
      # (nested) list representation of csv object
      csv_obj = csv.reader(StringIO(s))
      self.list_rep = [line for line in csv_obj]
      created_col = self.list_rep[HEADER_ROW_INDEX].index(
          CREATED_HEADER_STRING)
      updated_col = self.list_rep[HEADER_ROW_INDEX].index(
          UPDATED_HEADER_STRING)
      # columns to ignore
      self.excludes = (created_col, updated_col)


def compare_csvs(abs_csv1, abs_csv2):
    for x, row in enumerate(abs_csv1.list_rep):
      for y, cell in enumerate(row):
        if y not in abs_csv1.excludes:
          cell1 = abs_csv1.list_rep[x][y]
          cell2 = abs_csv2.list_rep[x][y]
          if cell1 != cell2:
            return (cell1, cell2)
    return True
