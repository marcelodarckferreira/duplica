"""rename origin values to ESCOLA and SEDE

Revision ID: 98d763f27206
Revises: c6ab4b463b02
Create Date: 2026-08-20 10:20:36.909685

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '98d763f27206'
down_revision: Union[str, Sequence[str], None] = 'c6ab4b463b02'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("UPDATE units SET origin = 'ESCOLA' WHERE origin = 'Escola'")
    op.execute("UPDATE units SET origin = 'SEDE' WHERE origin = 'Setor SEMED'")
    op.execute("UPDATE copy_requests SET origin = 'ESCOLA' WHERE origin = 'Escola'")
    op.execute("UPDATE copy_requests SET origin = 'SEDE' WHERE origin = 'Setor SEMED'")


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("UPDATE units SET origin = 'Escola' WHERE origin = 'ESCOLA'")
    op.execute("UPDATE units SET origin = 'Setor SEMED' WHERE origin = 'SEDE'")
    op.execute("UPDATE copy_requests SET origin = 'Escola' WHERE origin = 'ESCOLA'")
    op.execute("UPDATE copy_requests SET origin = 'Setor SEMED' WHERE origin = 'SEDE'")
