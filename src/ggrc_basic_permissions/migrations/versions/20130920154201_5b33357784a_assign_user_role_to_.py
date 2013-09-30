"""Assign User role to all existing users.

Revision ID: 5b33357784a
Revises: 1afc3824d35b
Create Date: 2013-09-20 15:42:01.558543

"""

# revision identifiers, used by Alembic.
revision = '5b33357784a'
down_revision = '1afc3824d35b'

import sqlalchemy as sa
from alembic import op
from datetime import datetime
from sqlalchemy.sql import table, column, select

person_table = table('people',
    column('id', sa.Integer),
    )

role_table = table('roles',
    column('id', sa.Integer),
    column('name', sa.String),
    )

user_roles_table = table('user_roles',
    column('id', sa.Integer),
    column('role_id', sa.Integer),
    column('person_id', sa.Integer),
    column('context_id', sa.Integer),
    column('modified_by_id', sa.Integer),
    column('created_at', sa.DateTime),
    column('updated_at', sa.DateTime),
    )

def upgrade():
  users = select([person_table.c.id])
  object_editor = select([role_table.c.id])\
      .where(role_table.c.name == 'ObjectEditor')\
      .limit(1)
  program_creator = select([role_table.c.id])\
      .where(role_table.c.name == 'ProgramCreator')\
      .limit(1)
  #FIXME this could be done better in a more recent version of sqlalchemy
  #once 0.8.3 is released
  #op.execute(user_roles_table.insert()\
      #.from_select(['user_id'], users)\
      #.from_select(['role_id'], role)\
      #.values(context_id=None,))

  #FIXME workaround until we can do the proper static generation of the sql
  #statement
  connection = op.get_bind()
  users = connection.execute(users).fetchall()
  object_editor = connection.execute(object_editor).fetchone()
  program_creator = connection.execute(program_creator).fetchone()
  current_datetime = datetime.now()
  for user in users:
    op.execute(user_roles_table.insert().values(
      person_id=user['id'],
      role_id=object_editor['id'],
      context_id=None,
      created_at=current_datetime,
      updated_at=current_datetime,
      ))
    op.execute(user_roles_table.insert().values(
      person_id=user['id'],
      role_id=program_creator['id'],
      context_id=None,
      created_at=current_datetime,
      updated_at=current_datetime,
      ))

def downgrade():
  '''Intentionally does nothing as we can't distinguish between migration
  added assignments and not.
  '''
  pass
