from sqlalchemy import UniqueConstraint

from app.core.permissions import ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS
from app.db.models.audit import AuditLog
from app.db.models.print_fleet import (
    DiscoveryEvent,
    DiscoveryNetwork,
    DiscoveryRun,
    DiscoveryRunBatch,
    Printer,
    PrinterSupply,
    SupplyReading,
)


def test_print_fleet_tables_are_registered_with_expected_names() -> None:
    assert {
        DiscoveryNetwork.__tablename__,
        DiscoveryRun.__tablename__,
        DiscoveryRunBatch.__tablename__,
        DiscoveryEvent.__tablename__,
        Printer.__tablename__,
        PrinterSupply.__tablename__,
        SupplyReading.__tablename__,
    } == {
        "discovery_networks",
        "discovery_runs",
        "discovery_run_batches",
        "discovery_events",
        "printers",
        "printer_supplies",
        "supply_readings",
    }


def test_printer_location_references_existing_units() -> None:
    foreign_keys = {str(key.target_fullname) for key in Printer.__table__.c.unit_id.foreign_keys}

    assert foreign_keys == {"units.id"}


def test_supply_snmp_index_is_unique_per_printer() -> None:
    unique_columns = {
        tuple(column.name for column in constraint.columns)
        for constraint in PrinterSupply.__table__.constraints
        if isinstance(constraint, UniqueConstraint)
    }

    assert ("printer_id", "snmp_index") in unique_columns


def test_network_address_is_unique_within_discovery_network() -> None:
    unique_columns = {
        tuple(column.name for column in constraint.columns)
        for constraint in Printer.__table__.constraints
        if isinstance(constraint, UniqueConstraint)
    }

    assert ("discovery_network_id", "management_address") in unique_columns


def test_audit_supports_generic_resources_without_requiring_request() -> None:
    assert AuditLog.__table__.c.request_id.nullable is True
    assert AuditLog.__table__.c.request_code.nullable is True
    assert AuditLog.__table__.c.resource_type.nullable is False
    assert AuditLog.__table__.c.resource_id.nullable is False


def test_admin_defaults_include_both_print_fleet_permissions() -> None:
    assert {"viewPrintFleet", "managePrintFleet"} <= ALL_PERMISSIONS
    assert {"viewPrintFleet", "managePrintFleet"} <= DEFAULT_ROLE_PERMISSIONS["Admin"]
