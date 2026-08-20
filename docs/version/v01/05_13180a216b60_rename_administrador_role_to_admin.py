"""rename Administrador role to Admin

Revision ID: 13180a216b60
Revises: e4687d66643b
Create Date: 2026-08-10 21:35:39.708264

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '13180a216b60'
down_revision: Union[str, Sequence[str], None] = 'e4687d66643b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("UPDATE users SET role = 'Admin' WHERE role = 'Administrador'")


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("UPDATE users SET role = 'Administrador' WHERE role = 'Admin'")
