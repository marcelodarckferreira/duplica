"""widen paper column on copy requests

Revision ID: 4245329c67ae
Revises: bcc9749f5c30
Create Date: 2026-08-19 17:30:15.028273

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4245329c67ae'
down_revision: Union[str, Sequence[str], None] = 'bcc9749f5c30'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column("copy_requests", "paper", type_=sa.String(length=64), existing_type=sa.String(length=16))


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column("copy_requests", "paper", type_=sa.String(length=16), existing_type=sa.String(length=64))
