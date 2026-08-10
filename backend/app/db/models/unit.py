from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Unit(Base):
    __tablename__ = "units"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    origin: Mapped[str] = mapped_column(String(32), nullable=False)
    code: Mapped[str] = mapped_column(String(32), nullable=False)
    contact: Mapped[str | None] = mapped_column(String(255), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
