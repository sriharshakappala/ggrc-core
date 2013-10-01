"""Role scopes for UI hinting.

Revision ID: 3148b80be376
Revises: 5b33357784a
Create Date: 2013-09-23 13:05:03.158064

"""

# revision identifiers, used by Alembic.
revision = '3148b80be376'
down_revision = '5b33357784a'

import sqlalchemy as sa
from alembic import op
from sqlalchemy.sql import table, column

roles_table = table('roles',
    column('id', sa.Integer),
    column('name', sa.String),
    column('scope', sa.String),
    )

def upgrade():
  op.add_column('roles', sa.Column('scope', sa.String(64)))
  op.execute(roles_table.update()\
      .where(roles_table.c.name.in_(
        ['ProgramOwner', 'ProgramEditor', 'ProgramReader',]))\
      .values(scope='Private Program'))
  op.execute(roles_table.update()\
      .where(roles_table.c.name.in_(
        ['Reader', 'ObjectEditor', 'ProgramCreator',]))\
      .values(scope='System'))

def downgrade():
  op.drop_column('roles', 'scope')
