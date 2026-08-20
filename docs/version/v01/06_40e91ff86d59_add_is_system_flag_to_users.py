"""add is_system flag to users

Revision ID: 40e91ff86d59
Revises: 13180a216b60
Create Date: 2026-08-10 21:37:51.991889

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '40e91ff86d59'
down_revision: Union[str, Sequence[str], None] = '13180a216b60'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('is_system', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.alter_column('users', 'is_system', server_default=None)
    # A conta seed "admin" é a única marcada como conta de sistema — garante que
    # sempre exista pelo menos uma conta de Administrador que não pode ser excluída.
    op.execute("UPDATE users SET is_system = true WHERE id = 'admin'")


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'is_system')
