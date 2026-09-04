import asyncio
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import delete, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.base import AsyncSessionLocal
from app.db.models.print_fleet import (
    DiscoveryEvent,
    DiscoveryNetwork,
    Printer,
    PrinterSupply,
    SupplyReading,
)
from app.print_fleet.credentials import CredentialConfigurationError, CredentialDecryptionError, SnmpCredentialCipher
from app.print_fleet.discovery import process_discovery_cycle
from app.print_fleet.snmp import (
    HR_PRINTER_ERROR_STATE,
    HR_PRINTER_STATUS,
    PRT_SUPPLIES_DESCRIPTION,
    PRT_SUPPLIES_LEVEL,
    PRT_SUPPLIES_MAX_CAPACITY,
    PRT_SUPPLIES_TYPE,
    PRT_SUPPLIES_UNIT,
    SnmpRequestError,
    SnmpTransport,
    parse_detected_error_state,
)
from app.print_fleet.supplies import calculate_supply_percent, classify_supply_alert
from app.print_fleet.types import OnboardingStatus, OperationalStatus, SupplyAlert, SupplyColor, SupplyType


@dataclass(frozen=True)
class SupplySnapshot:
    snmp_index: str
    description_raw: str
    type_raw: int | None
    normalized_type: SupplyType
    color: SupplyColor
    capacity_raw: int
    level_raw: int
    capacity_unit_raw: int | None
    level_percent: int | None
    alert_status: SupplyAlert


@dataclass(frozen=True)
class PollSummary:
    attempted: int = 0
    succeeded: int = 0
    failed: int = 0


def _suffix(base_oid: str, oid: str) -> str | None:
    prefix = f"{base_oid}."
    return oid[len(prefix) :] if oid.startswith(prefix) else None


def _by_suffix(base_oid: str, rows: list[tuple[str, Any]]) -> dict[str, Any]:
    values: dict[str, Any] = {}
    for oid, value in rows:
        suffix = _suffix(base_oid, oid)
        if suffix:
            values[suffix] = value
    return values


def _as_int(value: Any) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _normalize_type(type_raw: int | None) -> SupplyType:
    if type_raw in {3, 21}:
        return SupplyType.TONER
    if type_raw in {5, 6, 7}:
        return SupplyType.INK
    if type_raw in {4, 8}:
        return SupplyType.WASTE
    if type_raw == 9:
        return SupplyType.DRUM
    if type_raw in {15, 18, 20, 22}:
        return SupplyType.MAINTENANCE_KIT
    if type_raw == 1:
        return SupplyType.OTHER
    return SupplyType.UNKNOWN


def _normalize_color(description: str) -> SupplyColor:
    value = description.casefold()
    if "black" in value or "preto" in value:
        return SupplyColor.BLACK
    if "cyan" in value or "ciano" in value:
        return SupplyColor.CYAN
    if "magenta" in value:
        return SupplyColor.MAGENTA
    if "yellow" in value or "amarelo" in value:
        return SupplyColor.YELLOW
    return SupplyColor.UNKNOWN


def parse_supply_rows(rows: dict[str, list[tuple[str, Any]]]) -> list[SupplySnapshot]:
    descriptions = _by_suffix(PRT_SUPPLIES_DESCRIPTION, rows.get(PRT_SUPPLIES_DESCRIPTION, []))
    types = _by_suffix(PRT_SUPPLIES_TYPE, rows.get(PRT_SUPPLIES_TYPE, []))
    units = _by_suffix(PRT_SUPPLIES_UNIT, rows.get(PRT_SUPPLIES_UNIT, []))
    capacities = _by_suffix(
        PRT_SUPPLIES_MAX_CAPACITY, rows.get(PRT_SUPPLIES_MAX_CAPACITY, [])
    )
    levels = _by_suffix(PRT_SUPPLIES_LEVEL, rows.get(PRT_SUPPLIES_LEVEL, []))
    supplies: list[SupplySnapshot] = []
    for snmp_index in sorted(capacities.keys() & levels.keys(), key=lambda value: tuple(map(int, value.split(".")))):
        capacity = _as_int(capacities[snmp_index])
        level = _as_int(levels[snmp_index])
        if capacity is None or level is None:
            continue
        description = str(descriptions.get(snmp_index, "")).strip()
        type_raw = _as_int(types.get(snmp_index))
        percent = calculate_supply_percent(level, capacity)
        supplies.append(
            SupplySnapshot(
                snmp_index=snmp_index,
                description_raw=description,
                type_raw=type_raw,
                normalized_type=_normalize_type(type_raw),
                color=_normalize_color(description),
                capacity_raw=capacity,
                level_raw=level,
                capacity_unit_raw=_as_int(units.get(snmp_index)),
                level_percent=percent,
                alert_status=classify_supply_alert(percent),
            )
        )
    return supplies


def apply_poll_failure(printer: Printer, now: datetime) -> None:
    printer.last_polled_at = now
    printer.consecutive_poll_failures = (printer.consecutive_poll_failures or 0) + 1
    if printer.consecutive_poll_failures >= 3:
        printer.operational_status = OperationalStatus.NO_COMMUNICATION.value


def apply_poll_success(
    printer: Printer,
    *,
    status_raw: int | None,
    errors: list[str],
    now: datetime,
) -> None:
    printer.last_polled_at = now
    printer.last_seen_at = now
    printer.consecutive_poll_failures = 0
    printer.normalized_errors = errors
    if errors:
        printer.operational_status = OperationalStatus.ERROR.value
    else:
        printer.operational_status = {
            3: OperationalStatus.IDLE.value,
            4: OperationalStatus.PRINTING.value,
            5: OperationalStatus.WARMUP.value,
        }.get(status_raw, OperationalStatus.UNKNOWN.value)


def should_record_reading(
    previous: SupplyReading | None,
    level_percent: int | None,
    alert_status: SupplyAlert,
    now: datetime,
) -> bool:
    if previous is None:
        return True
    if previous.level_percent != level_percent or previous.alert_status != alert_status.value:
        return True
    return previous.recorded_at <= now - timedelta(hours=24)


def _new_supply(printer_id: str, snapshot: SupplySnapshot, now: datetime) -> PrinterSupply:
    return PrinterSupply(
        printer_id=printer_id,
        snmp_index=snapshot.snmp_index,
        description_raw=snapshot.description_raw,
        type_raw=snapshot.type_raw,
        normalized_type=snapshot.normalized_type.value,
        color=snapshot.color.value,
        capacity_raw=snapshot.capacity_raw,
        level_raw=snapshot.level_raw,
        capacity_unit_raw=snapshot.capacity_unit_raw,
        level_percent=snapshot.level_percent,
        alert_status=snapshot.alert_status.value,
        first_seen_at=now,
        last_seen_at=now,
    )


def _first_int(rows: list[tuple[str, Any]]) -> int | None:
    return _as_int(rows[0][1]) if rows else None


def _first_error_bytes(rows: list[tuple[str, Any]]) -> bytes:
    if not rows:
        return b""
    value = rows[0][1]
    if isinstance(value, bytes):
        return value
    if isinstance(value, str):
        return value.encode("latin-1", errors="ignore")
    return b""


async def _persist_supplies(
    db: AsyncSession,
    printer: Printer,
    snapshots: list[SupplySnapshot],
    now: datetime,
) -> None:
    result = await db.execute(select(PrinterSupply).where(PrinterSupply.printer_id == printer.id))
    existing = {supply.snmp_index: supply for supply in result.scalars().all()}
    observed: set[str] = set()
    for snapshot in snapshots:
        observed.add(snapshot.snmp_index)
        supply = existing.get(snapshot.snmp_index)
        if supply is None:
            supply = _new_supply(printer.id, snapshot, now)
            db.add(supply)
            await db.flush()
        previous = (
            await db.execute(
                select(SupplyReading)
                .where(SupplyReading.printer_supply_id == supply.id)
                .order_by(SupplyReading.recorded_at.desc())
                .limit(1)
            )
        ).scalar_one_or_none()
        supply.description_raw = snapshot.description_raw
        supply.type_raw = snapshot.type_raw
        supply.normalized_type = snapshot.normalized_type.value
        supply.color = snapshot.color.value
        supply.capacity_raw = snapshot.capacity_raw
        supply.level_raw = snapshot.level_raw
        supply.capacity_unit_raw = snapshot.capacity_unit_raw
        supply.level_percent = snapshot.level_percent
        supply.alert_status = snapshot.alert_status.value
        supply.missing_poll_count = 0
        supply.last_seen_at = now
        if should_record_reading(previous, snapshot.level_percent, snapshot.alert_status, now):
            db.add(
                SupplyReading(
                    printer_supply_id=supply.id,
                    capacity_raw=snapshot.capacity_raw,
                    level_raw=snapshot.level_raw,
                    capacity_unit_raw=snapshot.capacity_unit_raw,
                    level_percent=snapshot.level_percent,
                    alert_status=snapshot.alert_status.value,
                    recorded_at=now,
                )
            )
    for snmp_index, supply in existing.items():
        if snmp_index not in observed:
            supply.missing_poll_count += 1


async def poll_printer(
    db: AsyncSession,
    printer: Printer,
    transport: SnmpTransport,
    now: datetime,
) -> bool:
    network = await db.get(DiscoveryNetwork, printer.discovery_network_id)
    if network is None or not network.active:
        apply_poll_failure(printer, now)
        await db.commit()
        return False
    try:
        community = SnmpCredentialCipher(settings.SNMP_CREDENTIAL_ENCRYPTION_KEY).decrypt(
            network.community_ciphertext
        )
        bases = [
            HR_PRINTER_STATUS,
            HR_PRINTER_ERROR_STATE,
            PRT_SUPPLIES_DESCRIPTION,
            PRT_SUPPLIES_TYPE,
            PRT_SUPPLIES_UNIT,
            PRT_SUPPLIES_MAX_CAPACITY,
            PRT_SUPPLIES_LEVEL,
        ]
        walked = await asyncio.gather(
            *(
                transport.walk(
                    str(printer.management_address),
                    community,
                    base,
                    network.timeout_ms,
                    max(1, network.retries),
                )
                for base in bases
            )
        )
        row_map = dict(zip(bases, walked, strict=True))
        error_bytes = _first_error_bytes(row_map[HR_PRINTER_ERROR_STATE])
        printer.detected_error_state_raw = error_bytes
        apply_poll_success(
            printer,
            status_raw=_first_int(row_map[HR_PRINTER_STATUS]),
            errors=parse_detected_error_state(error_bytes),
            now=now,
        )
        await _persist_supplies(db, printer, parse_supply_rows(row_map), now)
        await db.commit()
        return True
    except (
        SnmpRequestError,
        CredentialConfigurationError,
        CredentialDecryptionError,
        ValueError,
    ):
        apply_poll_failure(printer, now)
        await db.commit()
        return False


async def poll_due_printers(
    db: AsyncSession,
    transport: SnmpTransport,
    now: datetime | None = None,
    limit: int = 1,
) -> PollSummary:
    polled_at = now or datetime.now(timezone.utc)
    due_before = polled_at - timedelta(seconds=settings.PRINT_FLEET_POLL_INTERVAL_SECONDS)
    result = await db.execute(
        select(Printer)
        .where(
            Printer.onboarding_status == OnboardingStatus.CONFIRMED.value,
            Printer.monitoring_enabled.is_(True),
            or_(Printer.last_polled_at.is_(None), Printer.last_polled_at <= due_before),
        )
        .order_by(Printer.last_polled_at.asc().nulls_first())
        .limit(limit)
    )
    printers = list(result.scalars().all())
    succeeded = 0
    for printer in printers:
        succeeded += int(await poll_printer(db, printer, transport, polled_at))
    return PollSummary(
        attempted=len(printers),
        succeeded=succeeded,
        failed=len(printers) - succeeded,
    )


async def purge_expired_operational_data(db: AsyncSession, now: datetime) -> None:
    lock_acquired = await db.scalar(
        text("SELECT pg_try_advisory_xact_lock(:lock_key)"),
        {"lock_key": 0x4455504C494341},
    )
    if not lock_acquired:
        await db.rollback()
        return

    await db.execute(delete(DiscoveryEvent).where(DiscoveryEvent.created_at < now - timedelta(days=90)))
    await db.execute(delete(SupplyReading).where(SupplyReading.recorded_at < now - timedelta(days=365)))
    await db.commit()


class PrintFleetWorkerCycle:
    def __init__(self, transport: SnmpTransport, worker_id: str) -> None:
        self.transport = transport
        self.worker_id = worker_id
        self._prefer_monitoring = True
        self._last_retention_at: datetime | None = None

    async def __call__(self) -> bool:
        now = datetime.now(timezone.utc)
        if self._last_retention_at is None or self._last_retention_at <= now - timedelta(days=1):
            async with AsyncSessionLocal() as db:
                await purge_expired_operational_data(db, now)
            self._last_retention_at = now

        if self._prefer_monitoring:
            self._prefer_monitoring = False
            async with AsyncSessionLocal() as db:
                summary = await poll_due_printers(db, self.transport, now, limit=1)
            if summary.attempted:
                return True

        self._prefer_monitoring = True
        return await process_discovery_cycle(self.transport, self.worker_id)
