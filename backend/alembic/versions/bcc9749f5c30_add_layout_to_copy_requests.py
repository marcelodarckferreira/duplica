"""add layout to copy requests

Revision ID: bcc9749f5c30
Revises: f58e15f2fb2b
Create Date: 2026-08-19 17:23:14.615186

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bcc9749f5c30'
down_revision: Union[str, Sequence[str], None] = 'f58e15f2fb2b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("copy_requests", sa.Column("layout", sa.String(length=16), nullable=False, server_default="Retrato"))
    op.alter_column("copy_requests", "layout", server_default=None)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("copy_requests", "layout")
