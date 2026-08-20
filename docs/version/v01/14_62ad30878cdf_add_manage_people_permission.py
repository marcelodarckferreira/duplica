"""add managePeople permission

Revision ID: 62ad30878cdf
Revises: 98d763f27206
Create Date: 2026-08-20 17:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '62ad30878cdf'
down_revision: Union[str, Sequence[str], None] = '98d763f27206'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Pessoas usava a permissão manageUnits emprestada (não tinha linha própria
    # em Perfis de Acesso). Concede managePeople a todo perfil que já tinha
    # manageUnits, preservando o acesso atual sem exigir reconfiguração manual.
    op.execute(
        """
        INSERT INTO role_permissions (role, permission)
        SELECT role, 'managePeople' FROM role_permissions WHERE permission = 'manageUnits'
        ON CONFLICT DO NOTHING
        """
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DELETE FROM role_permissions WHERE permission = 'managePeople'")
