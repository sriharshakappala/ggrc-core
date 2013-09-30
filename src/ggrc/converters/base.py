import csv
from .common import *
from ggrc import db
from ggrc.fulltext import get_indexer
from ggrc.fulltext.recordbuilder import fts_record_for
from ggrc.services.common import log_event
from flask import redirect, flash
from ggrc.services.common import get_cache

def get_modified_objects(session):
  session.flush()
  cache = get_cache()
  if cache:
    return cache.copy()

def update_index_for_objects(session, cache):
  indexer = get_indexer()
  for obj in cache.new:
    indexer.create_record(fts_record_for(obj), commit=False)
  for obj in cache.dirty:
    indexer.update_record(fts_record_for(obj), commit=False)
  for obj in cache.deleted:
    indexer.delete_record(obj.id, obj.__class__.__name__, commit=False)
  session.commit()

class BaseConverter(object):

  def __init__(self, rows_or_objects, **options):
    self.options = options.copy()
    if self.options.get('export'):
      self.objects = rows_or_objects
      self.rows = []
    else:
      self.objects = []
      self.rows = rows_or_objects[:]
    self.all_objects = {}
    self.errors = []
    self.warnings = []
    self.slugs = []
    self.final_results = []
    self.import_exception = None
    self.import_slug = None

    self.create_metadata_map()
    self.create_object_map()

  def create_metadata_map(self):
    self.metadata_map = self.metadata_map

  def create_object_map(self):
    self.object_map = self.object_map

  def results(self):
    return self.objects

  def add_slug_to_slugs(self, slug):
    self.slugs.append(slug)

  def get_slugs(self):
    return self.slugs

  def find_object(self, model_class, key):
    all_model_objs = self.all_objects.get(model_class.__class__.__name__)
    return all_model_objs.get(key) if all_model_objs else None

  def add_object(self, model_class, key, newObject):
    self.all_objects[model_class.__name__] = self.all_objects.setdefault(model_class.__name__, dict())
    self.all_objects[model_class.__name__][key] = newObject

  def created_objects(self):
    return [result for result in self.objects if result.id is None]

  def updated_objects(self):
    pass

  def changed_objects(self):
    pass

  def has_errors(self):
    return bool(self.errors) or self.has_object_errors()

  def has_object_errors(self):
    return any([obj.has_errors() for obj in self.objects])

  def has_warnings(self):
    return bool(self.warnings) or self.has_object_warnings()

  def has_object_warnings(self):
    return any([obj.has_warnings() for obj in self.objects])

  @classmethod
  def from_rows(cls, rows, **options):
    return cls(rows, **options)

  def import_metadata(self):
    if len(self.rows) < 6:
      self.errors.append("Could not import: verify the file is correctly formatted.")
      raise ImportException("Could not import: verify the file is correctly formatted.")

    optional_metadata = []
    if hasattr(self, 'optional_metadata'):
      optional_metadata = self.optional_metadata

    headers = self.read_headers(self.metadata_map, self.rows.pop(0),
                                optional_headers=optional_metadata)
    values = self.read_values(headers, self.rows.pop(0))
    self.import_slug = values.get('slug')
    self.rows.pop(0)
    self.rows.pop(0)
    self.validate_metadata(values)

  def read_values(self, headers, row):
    attrs = dict(zip(headers, row))
    attrs.pop(None, None) # None key could have been inserted in extreme edge case
    return attrs

  def get_header_for_column(self, header_map, column_name):
    for header in header_map:
      if header_map[header] == column_name:
        return header
    return ''

  def get_header_for_object_column(self, column_name):
    return self.get_header_for_column(self.object_map, column_name)

  def get_header_for_metadata_column(self, column_name):
    return self.get_header_for_column(self.metadata_map, column_name)

  def read_headers(
      self, import_map, row, required_headers=[], optional_headers=[]):
    ignored_colums = []
    self.trim_list(row)
    keys = []
    for heading in row:
      heading = heading.strip()
      if heading == "<skip>":
        continue
      elif not (heading in import_map):
        ignored_colums.append(heading)
        keys.append(None) # Placeholder None to prevent position problems when headers are zipped with values
        continue
      elif heading != "start_date" and heading != "end_date": #
        keys.append(import_map[heading])

    if any(ignored_colums):
      ignored_text = ", ".join(ignored_colums)
      self.warnings.append("Ignored column{plural}: {ignored_text}".format(
        plural='s' if len(ignored_colums) > 1 else '', ignored_text=ignored_text))

    missing_columns = import_map.values()
    [missing_columns.remove(element) for element in keys if element]

    optional_headers.extend(['created_at', 'updated_at'])
    missing_columns = [column for column in missing_columns if not (column in optional_headers)]

    for header in required_headers:
      if header in missing_columns:
        self.errors.append("Missing required column: {}".format(self.get_header_for_column(import_map, header)))
        missing_columns.remove(header)

    if any(missing_columns):
      missing_headers = [ self.get_header_for_column(import_map, temp) for temp in missing_columns if temp ]
      missing_text = ", ".join([missing_header for missing_header in missing_headers if missing_header ])
      self.warnings.append("Missing column{plural}: {missing}".format(
        plural='s' if len(missing_columns) > 1 else '', missing = missing_text))

    return keys

  def trim_list(self, a):
    while len(a) > 0 and self.isblank(a[-1]):
      a.pop()

  def isblank(self, string):
    return not len(string) or string.isspace()

  def do_import(self, dry_run = True):
    self.import_metadata()
    object_headers = self.read_headers(self.object_map, self.rows.pop(0), required_headers=['title'])
    row_attrs = self.read_objects(object_headers, self.rows)
    for index, row_attrs in enumerate(row_attrs):
      row = self.row_converter(self, row_attrs, index)
      row.setup()
      row.reify()
      self.objects.append(row)

    if not dry_run:
      self.save_import()
    return self

  def save_import(self):
    for row_converter in self.objects:
      row_converter.save(db.session, **self.options)
    db.session.flush()
    for row_converter in self.objects:
      row_converter.run_after_save_hooks(db.session, **self.options)
    modified_objects = get_modified_objects(db.session)
    log_event(db.session)
    db.session.commit()
    update_index_for_objects(db.session, modified_objects)

  def read_objects(self, headers, rows):
    attrs_collection = []
    for row in rows:
      if not len(row):
        continue
      attrs_collection.append(self.read_values(headers, row))
    return attrs_collection

  def validate_metadata(self, attrs):
    if self.options.get('directive'):
      self.validate_metadata_type(attrs, self.directive().kind)
      self.validate_code(attrs)
    elif self.__class__.__name__ == 'SystemsConverter':
      model_name = "Processes" if self.options.get('is_biz_process') else "Systems"
      self.validate_metadata_type(attrs, model_name)

  def validate_code(self, attrs):
    if not attrs.get('slug'):
      self.errors.append('Missing "{}" Code heading'.format(self.directive().kind))
    elif attrs['slug'] != self.directive().slug:
      self.errors.append('{} Code must be {}'.format(self.directive().kind, self.directive().slug))

  def validate_metadata_type(self, attrs, required_type):
    if not attrs.get('type'):
      self.errors.append('Missing "Type" heading')
    elif attrs['type'] != required_type:
      self.errors.append('Type must be "{}"'.format(required_type))

  def do_export(self, csv_writer):
    for i,obj in enumerate(self.objects):
      row = self.row_converter(self, obj, i, export = True)
      row.setup()
      row.reify()
      if row and any(row.attrs.values()):
        self.rows.append(row.attrs)
    row_header_map = self.object_map
    for row in self.rows:
      csv_row = []
      for key in row_header_map.keys():
        field = row_header_map[key]
        field_val = row.get(field, '')
        field_val = field_val if isinstance(field_val, basestring) else ''
        csv_row.append(field_val)
      csv_writer.writerow([ele.encode("utf-8") if ele else ''.encode("utf-8") for ele in csv_row])

  def metadata_map(self):
    return self.__class__.metadata_map

  @classmethod
  def metadata_map():
    return self.metadata_map

  def object_map():
    return self.__class__.object_map()

  @classmethod
  def object_map():
    return self.__class__.object_map

  def row_converter():
    return self.__class__.row_converter()

  @classmethod
  def row_converter():
    return self.__class__.row_converter


