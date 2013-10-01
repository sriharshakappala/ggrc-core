from .base import *
from ggrc.models import Directive, Control, System, Process, DirectiveControl
from .base_row import *
from collections import OrderedDict
from ggrc.models.control import CATEGORY_CONTROL_TYPE_ID, CATEGORY_ASSERTION_TYPE_ID

class ControlRowConverter(BaseRowConverter):
  model_class = Control

  def find_by_slug(self, slug):
    from sqlalchemy import orm
    return self.model_class.query.filter_by(slug=slug).options(
        orm.joinedload('directive_controls')).first()

  def setup_object(self):
    self.obj = self.setup_object_by_slug(self.attrs)
    if self.obj.id is not None:
      self.add_warning('slug', "Control already exists and will be updated")

  def reify(self):
    self.handle('slug', SlugColumnHandler)
    self.handle_date('start_date')
    self.handle_date('end_date')
    self.handle_date('created_at', no_import = True)
    self.handle_date('updated_at', no_import = True)
    self.handle_text_or_html('description')

    self.handle_raw_attr('title')
    self.handle_raw_attr('url')

    self.handle_option('kind', role = 'control_kind')
    self.handle_option('means', role = 'control_means')
    self.handle_option('verify_frequency')

    self.handle_boolean('key_control', truthy_values = ['key', 'key_control', 'key control'], no_values = [])
    self.handle_boolean('fraud_related', truthy_values = ['fraud', 'fraud_related', 'fraud related'], \
      no_values = ['not fraud', 'not_fraud','not fraud_related', 'not fraud related'])
    self.handle_boolean('active', truthy_values = ['active'], no_values = [])

    self.handle('documents', LinkDocumentsHandler)
    self.handle('categories', LinkCategoriesHandler, scope_id = CATEGORY_CONTROL_TYPE_ID)
    self.handle('assertions', LinkCategoriesHandler, scope_id = CATEGORY_ASSERTION_TYPE_ID)
    self.handle('people_responsible', LinkPeopleHandler, role = 'responsible')
    self.handle('people_accountable', LinkPeopleHandler, role = 'accountable')
    self.handle('systems', LinkObjectControl, model_class = System)
    self.handle('processes', LinkObjectControl, model_class = Process)

  def save_object(self, db_session, **options):
    if options.get('directive_id'):
      db_session.add(self.obj)

  def after_save(self, db_session, **options):
    directive_id = options.get('directive_id')
    for directive_control in self.obj.directive_controls:
      if directive_control.directive_id == directive_id:
        return
    db_session.add(
        DirectiveControl(directive_id=directive_id, control=self.obj))

class ControlsConverter(BaseConverter):

  metadata_map = OrderedDict([
    ('Type', 'type'),
    ('Directive Code', 'slug')
  ])

  object_map = OrderedDict([
    ('Control Code', 'slug'),
    ('Title', 'title'),
    ('Description', 'description'),
    ('Kind', 'kind'),
    ('Means', 'means'),
    ('Version', 'version'),
    ('Start Date', 'start_date'),
    ('Stop Date', 'end_date'),
    ('URL', 'url'),
    ('Map:Systems', 'systems'),
    ('Map:Processes', 'processes'),
    ('Map:Categories', 'categories'),
    ('Map:Assertions', 'assertions'),
    ('Frequency', 'verify_frequency'),
    ('References', 'documents'),
    ('Map:People;Responsible','people_responsible'),
    ('Map:People;Accountable', 'people_accountable'),
    ('Key Control', 'key_control'),
    ('Active', 'active'),
    ('Fraud Related', 'fraud_related'),
    ('Created', 'created_at'),
    ('Updated' ,'updated_at')
  ])

  row_converter = ControlRowConverter

  # Creates the correct metadata_map for the specific directive kind.
  def create_metadata_map(self):
    if self.options.get('directive'):
      self.metadata_map = OrderedDict( [(k.replace("Directive", self.directive().kind), v) \
                          if 'Directive' in k else (k, v) for k, v in self.metadata_map.items()] )

  def validate_metadata(self, attrs):
    self.validate_metadata_type(attrs, "Controls")
    self.validate_code(attrs)

  def directive(self):
    return self.options['directive']

  def do_export_metadata(self):
    yield self.metadata_map.keys()
    yield ['Controls', self.directive().slug]
    yield[]
    yield[]
    yield self.object_map.keys()

