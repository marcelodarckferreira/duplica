from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class CopyRequest(Base):
    __tablename__ = "copy_requests"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False, index=True)
    origin: Mapped[str] = mapped_column(String(32), nullable=False)
    unit_id: Mapped[str] = mapped_column(String(64), ForeignKey("units.id"), nullable=False)
    unit_name: Mapped[str] = mapped_column(String(255), nullable=False)
    requester: Mapped[str] = mapped_column(String(255), nullable=False)
    registration_number: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    contact: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    document_description: Mapped[str] = mapped_column(String(500), nullable=False)
    pages: Mapped[int] = mapped_column(Integer, nullable=False)
    copies: Mapped[int] = mapped_column(Integer, nullable=False)
    duplex: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    staple: Mapped[str] = mapped_column(String(32), nullable=False, default="Off")
    layout: Mapped[str] = mapped_column(String(16), nullable=False, default="Retrato")
    printed_faces: Mapped[int] = mapped_column(Integer, nullable=False)
    consumed_sheets: Mapped[int] = mapped_column(Integer, nullable=False)
    paper: Mapped[str] = mapped_column(String(64), nullable=False)
    color_mode: Mapped[str] = mapped_column(String(16), nullable=False)
    priority: Mapped[str] = mapped_column(String(32), nullable=False)
    desired_deadline: Mapped[str] = mapped_column(String(10), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    production_owner: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    requested_at: Mapped[str] = mapped_column(String(10), nullable=False)
    produced_at: Mapped[str] = mapped_column(String(10), nullable=False, default="")
    delivered_at: Mapped[str] = mapped_column(String(10), nullable=False, default="")
    picked_up_by: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    signature: Mapped[str] = mapped_column(Text, nullable=False, default="")
    notes: Mapped[str] = mapped_column(String(2000), nullable=False, default="")

    history: Mapped[list["StatusHistoryEntry"]] = relationship(
        back_populates="request",
        cascade="all, delete-orphan",
        order_by="StatusHistoryEntry.id",
    )


class StatusHistoryEntry(Base):
    __tablename__ = "status_history_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    request_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("copy_requests.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    date: Mapped[str] = mapped_column(String(10), nullable=False)
    by: Mapped[str] = mapped_column(String(255), nullable=False)

    request: Mapped["CopyRequest"] = relationship(back_populates="history")
