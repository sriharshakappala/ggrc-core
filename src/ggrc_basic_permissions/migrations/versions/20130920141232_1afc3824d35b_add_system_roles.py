"""Add system roles

Revision ID: 1afc3824d35b
Revises: 5325f2b93af8
Create Date: 2013-09-20 14:12:32.846302

"""

# revision identifiers, used by Alembic.
revision = '1afc3824d35b'
down_revision = '5325f2b93af8'

import json
import sqlalchemy as sa
from alembic import op
from datetime import datetime
from sqlalchemy.sql import table, column

roles_table = table('roles',
    column('id', sa.Integer),
    column('name', sa.String),
    column('permissions_json', sa.Text),
    column('description', sa.Text),
    column('modified_by_id', sa.Integer),
    column('created_at', sa.DateTime),
    column('updated_at', sa.DateTime),
    column('context_id', sa.Integer),
    )


def upgrade():
  basic_objects_editable = [
      'Categorization',
      'Category',
      'Control',
      'ControlControl',
      'ControlSection',
      'Cycle',
      'DataAsset',
      'Directive',
        'Contract',
        'Policy',
        'Regulation',
      'DirectiveControl',
      'Document',
      'Facility',
      'Help',
      'Market',
      'Objective',
      'ObjectiveControl',
      'ObjectControl'
      'ObjectDocument',
      'ObjectObjective',
      'ObjectPerson',
      'ObjectSection',
      'Option',
      'OrgGroup',
      'PopulationSample',
      'Product',
      'Project',
      'Relationship',
      'RelationshipType',
      'Section',
      'SectionObjective',
      'SystemOrProcess',
        'System',
        'Process',
      'SystemControl',
      'SystemSysetm',
      ]
  basic_objects_readable = list(basic_objects_editable)
  basic_objects_readable.extend([
      'Person',
      'Program',
      'ProgramControl',
      'ProgramDirective',
      'Role',
      #'UserRole', ?? why?
      'Person',
      ])

  current_datetime = datetime.now()
  op.bulk_insert(roles_table,
      [
        { 'name': 'Reader',
          'description': 'This role grants a user basic, read-only, access '\
              'permission to a gGRC instance.',
          'permissions_json': json.dumps({
            'read': basic_objects_readable,
            }),
          'created_at': current_datetime,
          'updated_at': current_datetime,
        },
        { 'name': 'ObjectEditor',
          'description': 'This role grants a user basic object creation and '\
              'editing permission.',
          'permissions_json': json.dumps({
            'create': basic_objects_editable,
            'read':   basic_objects_readable,
            'update': basic_objects_editable,
            'delete': basic_objects_editable,
            }),
          'created_at': current_datetime,
          'updated_at': current_datetime,
        },
        { 'name': 'ProgramCreator',
          'description': 'This role grants a user the permission to create '\
              'public and private programs.',
          'permissions_json': json.dumps({
            'create': ['Program',],
            }),
          'created_at': current_datetime,
          'updated_at': current_datetime,
        },
      ])

def downgrade():
  op.execute('SET FOREIGN_KEY_CHECKS = 0')
  op.execute(roles_table.delete().where(
    roles_table.c.name.in_(
      [ op.inline_literal('Reader'),
        op.inline_literal('ObjectEditor'),
        op.inline_literal('ProgramCreator'),
      ])))
