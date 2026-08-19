"""add people table and staple to copy requests

Revision ID: f58e15f2fb2b
Revises: e6bef415cea2
Create Date: 2026-08-19 16:21:50.727342

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f58e15f2fb2b'
down_revision: Union[str, Sequence[str], None] = 'e6bef415cea2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "people",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("registration_number", sa.String(length=64), nullable=False, server_default=""),
        sa.Column("phone", sa.String(length=32), nullable=False, server_default=""),
        sa.Column("unit_id", sa.String(length=64), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.ForeignKeyConstraint(["unit_id"], ["units.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_people_unit_id"), "people", ["unit_id"])

    op.add_column("copy_requests", sa.Column("staple", sa.String(length=32), nullable=False, server_default=""))
    op.alter_column("copy_requests", "staple", server_default=None)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("copy_requests", "staple")
    op.drop_index(op.f("ix_people_unit_id"), table_name="people")
    op.drop_table("people")
