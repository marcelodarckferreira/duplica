from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class RolePermission(Base):
    __tablename__ = "role_permissions"

    role: Mapped[str] = mapped_column(String(32), primary_key=True)
    permission: Mapped[str] = mapped_column(String(64), primary_key=True)
