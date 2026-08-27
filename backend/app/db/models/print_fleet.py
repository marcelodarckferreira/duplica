import uuid
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    LargeBinary,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import INET, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.print_fleet.types import (
    BatchStatus,
    DiscoveryRunStatus,
    OnboardingStatus,
    OperationalStatus,
    SupplyAlert,
    SupplyColor,
    SupplyType,
)


def _uuid() -> str:
    return str(uuid.uuid4())


class DiscoveryNetwork(Base):
    __tablename__ = "discovery_networks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    cidr: Mapped[str] = mapped_column(String(43), nullable=False, unique=True)
    excluded_cidrs: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    snmp_version: Mapped[str] = mapped_column(String(8), nullable=False, default="V2C")
    community_ciphertext: Mapped[str] = mapped_column(Text, nullable=False)
    timeout_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=1000)
    retries: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    concurrency_limit: Mapped[int] = mapped_column(Integer, nullable=False, default=64)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_by_user_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.id"), nullable=False)
    updated_by_user_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class DiscoveryRun(Base):
    __tablename__ = "discovery_runs"
    __table_args__ = (
        Index(
            "uq_discovery_runs_active_network",
            "network_id",
            unique=True,
            postgresql_where=text("status IN ('PENDING', 'RUNNING')"),
        ),
        Index("ix_discovery_runs_network_status", "network_id", "status"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    network_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("discovery_networks.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False, default=DiscoveryRunStatus.PENDING.value)
    total_targets: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    scanned_targets: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    responsive_devices: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    printers_found: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    new_printers: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    error_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    requested_by_user_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.id"), nullable=False)
    worker_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    parameters_snapshot: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    last_error_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    last_error_message: Mapped[str | None] = mapped_column(String(500), nullable=True)
    requested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    heartbeat_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class DiscoveryRunBatch(Base):
    __tablename__ = "discovery_run_batches"
    __table_args__ = (
        UniqueConstraint("run_id", "first_address", "last_address", name="uq_discovery_batch_range"),
        Index("ix_discovery_batches_run_status", "run_id", "status", "first_address"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    run_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("discovery_runs.id", ondelete="CASCADE"), nullable=False
    )
    first_address: Mapped[str] = mapped_column(INET, nullable=False)
    last_address: Mapped[str] = mapped_column(INET, nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default=BatchStatus.PENDING.value)
    target_count: Mapped[int] = mapped_column(Integer, nullable=False)
    scanned_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    responsive_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    printer_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    error_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class DiscoveryEvent(Base):
    __tablename__ = "discovery_events"
    __table_args__ = (Index("ix_discovery_events_run_created", "run_id", "created_at"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    run_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("discovery_runs.id", ondelete="CASCADE"), nullable=False
    )
    batch_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("discovery_run_batches.id", ondelete="CASCADE"), nullable=True
    )
    address: Mapped[str | None] = mapped_column(INET, nullable=True)
    code: Mapped[str] = mapped_column(String(64), nullable=False)
    detail: Mapped[str] = mapped_column(String(500), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class Printer(Base):
    __tablename__ = "printers"
    __table_args__ = (
        UniqueConstraint(
            "discovery_network_id", "management_address", name="uq_printer_network_address"
        ),
        Index("ix_printers_onboarding_unit", "onboarding_status", "unit_id"),
        Index("ix_printers_serial", "serial_number"),
        Index("ix_printers_mac", "mac_address"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    discovery_network_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("discovery_networks.id"), nullable=False
    )
    management_address: Mapped[str] = mapped_column(INET, nullable=False)
    mac_address: Mapped[str | None] = mapped_column(String(17), nullable=True)
    serial_number: Mapped[str | None] = mapped_column(String(120), nullable=True)
    sys_object_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    sys_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    sys_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    manufacturer: Mapped[str | None] = mapped_column(String(120), nullable=True)
    model: Mapped[str | None] = mapped_column(String(180), nullable=True)
    display_name: Mapped[str | None] = mapped_column(String(180), nullable=True)
    unit_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("units.id"), nullable=True)
    onboarding_status: Mapped[str] = mapped_column(
        String(16), nullable=False, default=OnboardingStatus.PENDING.value
    )
    monitoring_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    operational_status: Mapped[str] = mapped_column(
        String(32), nullable=False, default=OperationalStatus.UNKNOWN.value
    )
    detected_error_state_raw: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    normalized_errors: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    consecutive_poll_failures: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_polled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class PrinterSupply(Base):
    __tablename__ = "printer_supplies"
    __table_args__ = (
        UniqueConstraint("printer_id", "snmp_index", name="uq_printer_supply_index"),
        Index("ix_printer_supplies_printer_alert", "printer_id", "alert_status"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    printer_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("printers.id", ondelete="CASCADE"), nullable=False
    )
    snmp_index: Mapped[str] = mapped_column(String(120), nullable=False)
    description_raw: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    type_raw: Mapped[int | None] = mapped_column(Integer, nullable=True)
    normalized_type: Mapped[str] = mapped_column(String(32), nullable=False, default=SupplyType.UNKNOWN.value)
    color: Mapped[str] = mapped_column(String(16), nullable=False, default=SupplyColor.UNKNOWN.value)
    capacity_raw: Mapped[int] = mapped_column(Integer, nullable=False)
    level_raw: Mapped[int] = mapped_column(Integer, nullable=False)
    capacity_unit_raw: Mapped[int | None] = mapped_column(Integer, nullable=True)
    level_percent: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    alert_status: Mapped[str] = mapped_column(String(16), nullable=False, default=SupplyAlert.UNKNOWN.value)
    warning_threshold_percent: Mapped[int] = mapped_column(Integer, nullable=False, default=20)
    critical_threshold_percent: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    missing_poll_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class SupplyReading(Base):
    __tablename__ = "supply_readings"
    __table_args__ = (Index("ix_supply_readings_supply_recorded", "printer_supply_id", "recorded_at"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    printer_supply_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("printer_supplies.id", ondelete="CASCADE"), nullable=False
    )
    capacity_raw: Mapped[int] = mapped_column(Integer, nullable=False)
    level_raw: Mapped[int] = mapped_column(Integer, nullable=False)
    capacity_unit_raw: Mapped[int | None] = mapped_column(Integer, nullable=True)
    level_percent: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    alert_status: Mapped[str] = mapped_column(String(16), nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
