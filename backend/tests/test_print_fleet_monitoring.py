from datetime import datetime, timedelta, timezone

from app.db.models.print_fleet import Printer, SupplyReading
from app.print_fleet.monitoring import (
    apply_poll_failure,
    apply_poll_success,
    parse_supply_rows,
    should_record_reading,
)
from app.print_fleet.snmp import (
    PRT_SUPPLIES_DESCRIPTION,
    PRT_SUPPLIES_LEVEL,
    PRT_SUPPLIES_MAX_CAPACITY,
    PRT_SUPPLIES_TYPE,
    PRT_SUPPLIES_UNIT,
)
from app.print_fleet.types import OperationalStatus, SupplyAlert, SupplyColor, SupplyType


def test_joins_supply_columns_by_complete_oid_suffix() -> None:
    rows = {
        PRT_SUPPLIES_DESCRIPTION: [
            (f"{PRT_SUPPLIES_DESCRIPTION}.7.1", "Black Toner Cartridge"),
            (f"{PRT_SUPPLIES_DESCRIPTION}.7.2", "Cyan Toner Cartridge"),
        ],
        PRT_SUPPLIES_TYPE: [
            (f"{PRT_SUPPLIES_TYPE}.7.1", 21),
            (f"{PRT_SUPPLIES_TYPE}.7.2", 21),
        ],
        PRT_SUPPLIES_UNIT: [
            (f"{PRT_SUPPLIES_UNIT}.7.1", 19),
            (f"{PRT_SUPPLIES_UNIT}.7.2", 19),
        ],
        PRT_SUPPLIES_MAX_CAPACITY: [
            (f"{PRT_SUPPLIES_MAX_CAPACITY}.7.1", 10_000),
            (f"{PRT_SUPPLIES_MAX_CAPACITY}.7.2", 10_000),
        ],
        PRT_SUPPLIES_LEVEL: [
            (f"{PRT_SUPPLIES_LEVEL}.7.1", 2_000),
            (f"{PRT_SUPPLIES_LEVEL}.7.2", -2),
        ],
    }

    supplies = parse_supply_rows(rows)

    assert [supply.snmp_index for supply in supplies] == ["7.1", "7.2"]
    assert supplies[0].normalized_type is SupplyType.TONER
    assert supplies[0].color is SupplyColor.BLACK
    assert supplies[0].level_percent == 20
    assert supplies[0].alert_status is SupplyAlert.WARNING
    assert supplies[1].color is SupplyColor.CYAN
    assert supplies[1].level_raw == -2
    assert supplies[1].level_percent is None
    assert supplies[1].alert_status is SupplyAlert.UNKNOWN


def test_ignores_incomplete_rows_without_level_or_capacity() -> None:
    rows = {
        PRT_SUPPLIES_DESCRIPTION: [(f"{PRT_SUPPLIES_DESCRIPTION}.9.1", "Drum")],
        PRT_SUPPLIES_TYPE: [(f"{PRT_SUPPLIES_TYPE}.9.1", 9)],
        PRT_SUPPLIES_UNIT: [],
        PRT_SUPPLIES_MAX_CAPACITY: [],
        PRT_SUPPLIES_LEVEL: [],
    }

    assert parse_supply_rows(rows) == []


def test_marks_no_communication_only_after_three_failures_and_recovers() -> None:
    printer = Printer(
        id="printer-1",
        discovery_network_id="network-1",
        management_address="172.16.0.10",
        operational_status=OperationalStatus.IDLE.value,
        consecutive_poll_failures=0,
    )
    now = datetime(2026, 8, 27, 12, 0, tzinfo=timezone.utc)

    apply_poll_failure(printer, now)
    apply_poll_failure(printer, now + timedelta(minutes=15))
    assert printer.operational_status == OperationalStatus.IDLE.value
    apply_poll_failure(printer, now + timedelta(minutes=30))
    assert printer.operational_status == OperationalStatus.NO_COMMUNICATION.value

    apply_poll_success(printer, status_raw=3, errors=[], now=now + timedelta(minutes=45))
    assert printer.consecutive_poll_failures == 0
    assert printer.operational_status == OperationalStatus.IDLE.value
    assert printer.last_seen_at == now + timedelta(minutes=45)


def test_records_reading_on_change_or_after_daily_heartbeat() -> None:
    now = datetime(2026, 8, 27, 12, 0, tzinfo=timezone.utc)
    previous = SupplyReading(
        printer_supply_id="supply-1",
        capacity_raw=100,
        level_raw=50,
        level_percent=50,
        alert_status=SupplyAlert.NORMAL.value,
        recorded_at=now - timedelta(hours=1),
    )

    assert should_record_reading(previous, 50, SupplyAlert.NORMAL, now) is False
    assert should_record_reading(previous, 49, SupplyAlert.NORMAL, now) is True
    assert should_record_reading(previous, 50, SupplyAlert.WARNING, now) is True
    previous.recorded_at = now - timedelta(hours=24)
    assert should_record_reading(previous, 50, SupplyAlert.NORMAL, now) is True
