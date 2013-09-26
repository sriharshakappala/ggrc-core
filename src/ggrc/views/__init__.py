# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: dan@reciprocitylabs.com
# Maintained By: dan@reciprocitylabs.com

import json
from collections import namedtuple
from flask import request, flash, session
from ggrc.app import app
from ggrc.rbac import permissions
from ggrc.login import get_current_user
from ggrc.utils import as_json
from ggrc.builder.json import publish
from werkzeug.exceptions import Forbidden
from . import filters
from .common import BaseObjectView, RedirectedPolymorphView
from .tooltip import TooltipView

"""ggrc.views
Handle non-RESTful views, e.g. routes which return HTML rather than JSON
"""

def get_permissions_json():
  return json.dumps(session['permissions'])

def get_current_user_json():
  current_user = get_current_user()
  return as_json(current_user.to_json())

@app.context_processor
def base_context():
  from ggrc.models import get_model
  return dict(
      get_model=get_model,
      permissions_json=get_permissions_json,
      permissions=permissions,
      current_user=get_current_user_json
      )

from flask import render_template

# Actual HTML-producing routes
#

@app.route("/")
def index():
  """The initial entry point of the app
  """
  return render_template("welcome/index.haml")

from ggrc.login import login_required

@app.route("/dashboard")
@login_required
def dashboard():
  """The dashboard page
  """
  return render_template("dashboard/index.haml")

@app.route("/admin/reindex", methods=["POST"])
@login_required
def admin_reindex():
  """Simple re-index of all indexable objects
  """
  if not permissions.is_allowed_read("/admin", 1):
    raise Forbidden()

  from ggrc.fulltext import get_indexer
  from ggrc.fulltext.recordbuilder import fts_record_for

  indexer = get_indexer()
  indexer.delete_all_records(False)

  from ggrc.models import all_models
  from ggrc.app import db

  # Find all models then remove base classes
  models = set(all_models.all_models) -\
      set([all_models.Directive, all_models.SystemOrProcess])
  for model in models:
    mapper_class = model._sa_class_manager.mapper.base_mapper.class_
    query = model.query.options(
        db.undefer_group(mapper_class.__name__+'_complete'),
        )
    for instance in query.all():
      indexer.create_record(fts_record_for(instance), False)
  db.session.commit()

  return app.make_response((
    'success', 200, [('Content-Type', 'text/html')]))

@app.route("/admin")
@login_required
def admin():
  """The admin dashboard page
  """
  if not permissions.is_allowed_read("/admin", 1):
    raise Forbidden()
  return render_template("admin/index.haml")

@app.route("/design")
@login_required
def styleguide():
  """The style guide page
  """
  return render_template("styleguide/styleguide.haml")

def allowed_file(filename):
  return filename.rsplit('.',1)[1] == 'csv'


@app.route("/admin/import_people", methods = ['GET', 'POST'])
def import_people():

  from werkzeug import secure_filename
  from ggrc.converters.common import ImportException
  from ggrc.converters.people import PeopleConverter
  from ggrc.converters.import_helper import handle_csv_import
  from ggrc.models import Person
  import ggrc.views

  if not permissions.is_allowed_read("/admin", 1):
    raise Forbidden()

  if request.method == 'POST':
    if 'cancel' in request.form:
      return import_redirect("/admin")
    dry_run = not ('confirm' in request.form)
    csv_file = request.files['file']
    try:
      if csv_file and allowed_file(csv_file.filename):
        filename = secure_filename(csv_file.filename)
        options = {}
        options['dry_run'] = dry_run
        converter = handle_csv_import(PeopleConverter, csv_file, **options)
        if dry_run:
          options['converter'] = converter
          options['results'] = converter.objects
          options['heading_map'] = converter.object_map
          return render_template("people/import_result.haml", **options)
        else:
          count = len(converter.objects)
          flash(u'Successfully imported {} person{}'.format(count, 's' if count > 1 else ''), 'notice')
          return import_redirect("/admin")
      else:
        file_msg = "Could not import: invalid csv file."
        return render_template("directives/import_errors.haml",
              directive_id = "People", exception_message = file_msg)

    except ImportException as e:
      return render_template("directives/import_errors.haml",
            directive_id = "People", exception_message = str(e))

  return render_template("people/import.haml", import_kind = 'People')

@app.route("/regulations/<directive_id>/import_controls", methods=['GET', 'POST'])
@app.route("/policies/<directive_id>/import_controls", methods=['GET', 'POST'])
@app.route("/contracts/<directive_id>/import_controls", methods=['GET', 'POST'])
def import_controls(directive_id):
  from werkzeug import secure_filename
  from ggrc.converters.common import ImportException
  from ggrc.converters.controls import ControlsConverter
  from ggrc.converters.import_helper import handle_csv_import
  from ggrc.models import Directive
  import ggrc.views

  directive = Directive.query.get(directive_id)
  directive_url =\
    getattr(ggrc.views, directive.__class__.__name__).url_for(directive)

  if request.method == 'POST':
    if 'cancel' in request.form:
      return import_redirect(directive_url + "#control_widget")
    dry_run = not ('confirm' in request.form)
    csv_file = request.files['file']
    try:
      if csv_file and allowed_file(csv_file.filename):
        filename = secure_filename(csv_file.filename)
        options = {}
        options['directive_id'] = directive_id
        options['dry_run'] = dry_run
        converter = handle_csv_import(ControlsConverter, csv_file, **options)
        if dry_run:
          options['converter'] = converter
          options['results'] = converter.objects
          options['heading_map'] = converter.object_map
          return render_template("directives/import_controls_result.haml", **options)
        else:
          count = len(converter.objects)
          flash(u'Successfully imported {} control{}'.format(count, 's' if count > 1 else ''), 'notice')
          return import_redirect(directive_url + "#control_widget")
      else:
        file_msg = "Could not import: invalid csv file."
        return render_template("directives/import_errors.haml",
              directive_id = directive_id, exception_message = file_msg)

    except ImportException as e:
      return render_template("directives/import_errors.haml",
            directive_id = directive_id, exception_message = str(e))

  return render_template("directives/import.haml", directive_id = directive_id, import_kind = 'Controls')

@app.route("/regulations/<directive_id>/import_sections", methods=['GET', 'POST'])
@app.route("/policies/<directive_id>/import_sections", methods=['GET', 'POST'])
@app.route("/contracts/<directive_id>/import_sections", methods=['GET', 'POST'])
def import_sections(directive_id):
  from werkzeug import secure_filename
  from ggrc.converters.common import ImportException
  from ggrc.converters.sections import SectionsConverter
  from ggrc.converters.import_helper import handle_csv_import
  from ggrc.models import Directive
  import ggrc.views

  directive = Directive.query.get(directive_id)
  directive_url =\
    getattr(ggrc.views, directive.__class__.__name__).url_for(directive)

  if request.method == 'POST':

    if 'cancel' in request.form:
      return import_redirect(directive_url + "#section_widget")
    dry_run = not ('confirm' in request.form)
    csv_file = request.files['file']
    try:
      if csv_file and allowed_file(csv_file.filename):
        filename = secure_filename(csv_file.filename)
        converter = handle_csv_import(SectionsConverter, csv_file,
          directive_id = directive_id, dry_run = dry_run)

        if dry_run:
          return render_template("directives/import_result.haml",directive_id = directive_id,
          converter = converter, results=converter.objects, heading_map = converter.object_map)
        else:
          count = len(converter.objects)
          flash(u'Successfully imported {} section{}'.format(count, 's' if count > 1 else ''), 'notice')
          return import_redirect(directive_url + "#section_widget")
      else:
        file_msg = "Could not import: invalid csv file."
        return render_template("directives/import_errors.haml",
              directive_id = directive_id, exception_message = file_msg)

    except ImportException as e:
      return render_template("directives/import_errors.haml",
            directive_id = directive_id, exception_message = str(e))

  return render_template("directives/import.haml", directive_id = directive_id, import_kind = 'Sections')


@app.route("/systems/import", methods=['GET', 'POST'])
def import_systems():
  from werkzeug import secure_filename
  from ggrc.converters.common import ImportException
  from ggrc.converters.systems import SystemsConverter
  from ggrc.converters.import_helper import handle_csv_import

  if not permissions.is_allowed_read("/admin", 1):
    raise Forbidden()

  if request.method == 'POST':
    if 'cancel' in request.form:
      return import_redirect('/admin')
    dry_run = not ('confirm' in request.form)
    csv_file = request.files['file']
    try:
      if csv_file and allowed_file(csv_file.filename):
        filename = secure_filename(csv_file.filename)
        converter = handle_csv_import(SystemsConverter, csv_file, dry_run = dry_run)
        if dry_run:
          return render_template("systems/import_result.haml",
            converter = converter, results=converter.objects, heading_map=converter.object_map)
        else:
          count = len(converter.objects)
          flash(u'Successfully imported {} system{}'.format(count, 's' if count > 1 else ''), 'notice')
          return import_redirect("/admin")
      else:
        file_msg = "Could not import: invalid csv file."
        return render_template("directives/import_errors.haml", exception_message = file_msg)

    except ImportException as e:
      return render_template("directives/import_errors.haml", exception_message = str(e))

  return render_template("systems/import.haml", import_kind = 'Systems')

def import_redirect(location):
  # The textarea here is a custom response for 'remoteipart' to
  # proxy a JSON response through an iframe.
  return app.make_response((
    '<textarea data-type="application/json" response-code="200">{0}</textarea>'.format(
      json.dumps({ 'location': location })), 200, [('Content-Type', 'text/html')]))


@app.route("/processes/import", methods=['GET', 'POST'])
def import_processes():
  from werkzeug import secure_filename
  from ggrc.converters.common import ImportException
  from ggrc.converters.systems import SystemsConverter
  from ggrc.converters.import_helper import handle_csv_import

  if not permissions.is_allowed_read("/admin", 1):
    raise Forbidden()

  if request.method == 'POST':
    if 'cancel' in request.form:
      return import_redirect('/admin')
    dry_run = not ('confirm' in request.form)
    csv_file = request.files['file']
    try:
      if csv_file and allowed_file(csv_file.filename):
        filename = secure_filename(csv_file.filename)
        converter = handle_csv_import(SystemsConverter, csv_file, dry_run = dry_run, is_biz_process='1')
        if dry_run:
          return render_template("systems/import_result.haml",
            converter = converter, results=converter.objects, heading_map=converter.object_map)
        else:
          count = len(converter.objects)
          flash(u'Successfully imported {} process{}'.format(count, 'es' if count > 1 else ''), 'notice')
          return import_redirect("/admin")
      else:
        file_msg = "Could not import: invalid csv file."
        return render_template("directives/import_errors.haml", exception_message = file_msg)
    except ImportException as e:
      return render_template("directives/import_errors.haml", exception_message = str(e))

  return render_template("systems/import.haml", import_kind = 'Processes')

@app.route("/processes/export", methods=['GET'])
def export_processes():
  from ggrc.converters.systems import SystemsConverter
  from ggrc.converters.import_helper import handle_converter_csv_export
  from ggrc.models.all_models import Process

  if not permissions.is_allowed_read("/admin", 1):
    raise Forbidden()

  options = {}
  options['export'] = True
  options['is_biz_process'] = '1'
  procs = Process.query.all()
  filename = "PROCESSES.csv"
  return handle_converter_csv_export(filename, procs, SystemsConverter, **options)

@app.route("/admin/export_people", methods=['GET'])
def export_people():
  from ggrc.converters.people import PeopleConverter
  from ggrc.converters.import_helper import handle_converter_csv_export
  from ggrc.models.all_models import Person

  if not permissions.is_allowed_read("/admin", 1):
    raise Forbidden()

  options = {}
  options['export'] = True
  people = Person.query.all()
  filename = "PEOPLE.csv"
  return handle_converter_csv_export(filename, people, PeopleConverter, **options)

@app.route("/systems/export", methods=['GET'])
def export_systems():
  from ggrc.converters.systems import SystemsConverter
  from ggrc.converters.import_helper import handle_converter_csv_export
  from ggrc.models.all_models import System

  if not permissions.is_allowed_read("/admin", 1):
    raise Forbidden()

  options = {}
  options['export'] = True
  systems = System.query.filter_by(is_biz_process=False).all()
  filename = "SYSTEMS.csv"
  return handle_converter_csv_export(filename, systems, SystemsConverter, **options)

@app.route("/regulations/<directive_id>/export_sections", methods=['GET'])
@app.route("/policies/<directive_id>/export_sections", methods=['GET'])
@app.route("/contracts/<directive_id>/export_sections", methods=['GET'])
def export_sections(directive_id):
  from ggrc.converters.sections import SectionsConverter
  from ggrc.converters.import_helper import handle_converter_csv_export
  from ggrc.models.all_models import Directive

  options = {}
  directive = Directive.query.filter_by(id=int(directive_id)).first()
  options['directive'] = directive
  options['export'] = True
  filename = "{}.csv".format(directive.slug)
  return handle_converter_csv_export(filename, directive.sections, SectionsConverter, **options)

@app.route("/regulations/<directive_id>/export_controls", methods=['GET'])
@app.route("/policies/<directive_id>/export_controls", methods=['GET'])
@app.route("/contracts/<directive_id>/export_controls", methods=['GET'])
def export_controls(directive_id):
  from ggrc.converters.controls import ControlsConverter
  from ggrc.converters.import_helper import handle_converter_csv_export
  from ggrc.models.all_models import Directive

  options = {}
  directive = Directive.query.filter_by(id=int(directive_id)).first()
  options['directive'] = directive
  options['export'] = True
  filename = "{}-controls.csv".format(directive.slug)
  return handle_converter_csv_export(filename, directive.controls, ControlsConverter, **options)

ViewEntry = namedtuple('ViewEntry', 'url model_class service_class')

def object_view(model_class, base_service_class=BaseObjectView):
  return ViewEntry(
      model_class._inflector.table_plural,
      model_class,
      base_service_class)

def tooltip_view(model_class, base_service_class=TooltipView):
  return object_view(model_class, base_service_class=base_service_class)

def all_object_views():
  from ggrc import models
  return [
      object_view(models.Audit),
      object_view(models.Program),
      object_view(models.Directive, RedirectedPolymorphView),
      object_view(models.Contract),
      object_view(models.Policy),
      object_view(models.Regulation),
      object_view(models.Control),
      object_view(models.Objective),
      object_view(models.System),
      object_view(models.Process),
      object_view(models.Product),
      object_view(models.Request),
      object_view(models.OrgGroup),
      object_view(models.Facility),
      object_view(models.Market),
      object_view(models.Project),
      object_view(models.DataAsset),
      object_view(models.RiskyAttribute),
      object_view(models.Risk),
      object_view(models.Person),
      ]

def all_tooltip_views():
  from ggrc import models
  return [
      tooltip_view(models.Audit),
      tooltip_view(models.Program),
      tooltip_view(models.Contract),
      tooltip_view(models.Policy),
      tooltip_view(models.Regulation),
      tooltip_view(models.Control),
      tooltip_view(models.Objective),
      tooltip_view(models.System),
      tooltip_view(models.Process),
      tooltip_view(models.Product),
      tooltip_view(models.Request),
      tooltip_view(models.OrgGroup),
      tooltip_view(models.Facility),
      tooltip_view(models.Market),
      tooltip_view(models.Project),
      tooltip_view(models.DataAsset),
      tooltip_view(models.RiskyAttribute),
      tooltip_view(models.Risk),
      tooltip_view(models.Person),
      tooltip_view(models.Event),
      ]

def init_all_object_views(app):
  import sys
  from ggrc import settings

  for entry in all_object_views():
    entry.service_class.add_to(
      app,
      '/{0}'.format(entry.url),
      entry.model_class,
      decorators=(login_required,)
      )

  for entry in all_tooltip_views():
    entry.service_class.add_to(
      app,
      '/{0}'.format(entry.url),
      entry.model_class,
      decorators=(login_required,)
      )

  if hasattr(settings, 'EXTENSIONS'):
    for extension in settings.EXTENSIONS:
      __import__(extension)
      extension_module = sys.modules[extension]
      if hasattr(extension_module, 'initialize_all_object_views'):
        extension_module.initialize_all_object_views(app)

