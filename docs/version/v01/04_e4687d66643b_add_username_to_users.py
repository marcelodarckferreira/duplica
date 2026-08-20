"""add username to users

Revision ID: e4687d66643b
Revises: 757452e7ab19
Create Date: 2026-08-10 20:52:18.966293

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e4687d66643b'
down_revision: Union[str, Sequence[str], None] = '757452e7ab19'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('username', sa.String(length=64), nullable=True))
    # Backfill de linhas existentes a partir do prefixo do e-mail, para poder
    # aplicar NOT NULL/UNIQUE em seguida sem quebrar dados já cadastrados.
    op.execute("UPDATE users SET username = split_part(email, '@', 1) WHERE username IS NULL")
    op.alter_column('users', 'username', nullable=False)
    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_users_username'), table_name='users')
    op.drop_column('users', 'username')
