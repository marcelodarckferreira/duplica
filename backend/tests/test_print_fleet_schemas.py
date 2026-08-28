import pytest
from datetime import datetime, timezone
from ipaddress import IPv4Address
from types import SimpleNamespace
from pydantic import ValidationError

from app.schemas.print_fleet import (
    DiscoveryNetworkCreate,
    DiscoveryNetworkOut,
    ManualPrinterCreate,
    PrinterOut,
    SupplyThresholdUpdate,
)


def test_network_create_normalizes_cidr_and_exclusions() -> None:
    payload = DiscoveryNetworkCreate(
        name="Rede administrativa",
        cidr="172.16.4.99/24",
        excluded_cidrs=["172.16.4.12", "172.16.4.64/28"],
        community="somente-leitura",
    )

    assert payload.cidr == "172.16.4.0/24"
    assert payload.excluded_cidrs == ["172.16.4.12/32", "172.16.4.64/28"]
    assert payload.timeout_ms == 1000
    assert payload.retries == 0
    assert payload.concurrency_limit == 64
    assert payload.target_count == 237
    assert payload.is_private is True


@pytest.mark.parametrize(
    ("field", "value"),
    [("timeout_ms", 249), ("timeout_ms", 10_001), ("retries", 4), ("concurrency_limit", 0), ("concurrency_limit", 129)],
)
def test_network_create_rejects_operational_values_outside_bounds(field: str, value: int) -> None:
    data = {"name": "Rede", "cidr": "172.16.0.0/24", "community": "public", field: value}

    with pytest.raises(ValidationError):
        DiscoveryNetworkCreate(**data)


def test_network_output_never_serializes_credential_material() -> None:
    output = DiscoveryNetworkOut(
        id="network-1",
        name="Rede administrativa",
        cidr="172.16.0.0/24",
        excluded_cidrs=[],
        snmp_version="V2C",
        timeout_ms=1000,
        retries=0,
        concurrency_limit=64,
        active=True,
        credential_configured=True,
        target_count=254,
        is_private=True,
        created_at="2026-08-27T12:00:00Z",
        updated_at="2026-08-27T12:00:00Z",
    )

    serialized = output.model_dump()

    assert serialized["credential_configured"] is True
    assert "community" not in serialized
    assert "ciphertext" not in serialized


def test_manual_printer_requires_network_address_name_and_sector() -> None:
    with pytest.raises(ValidationError):
        ManualPrinterCreate(
            discovery_network_id="network-1",
            management_address="not-an-ip",
            display_name="",
            unit_id="",
        )


def test_printer_output_accepts_postgresql_inet_value() -> None:
    now = datetime.now(timezone.utc)
    printer = SimpleNamespace(
        id="printer-1", discovery_network_id="network-1",
        management_address=IPv4Address("172.15.10.2"), mac_address=None,
        serial_number=None, sys_object_id=None, sys_name=None, sys_description=None,
        manufacturer="HP", model="LaserJet", display_name="HP Sede", unit_id=None,
        onboarding_status="PENDING", monitoring_enabled=False,
        operational_status="UNKNOWN", normalized_errors=[], consecutive_poll_failures=0,
        first_seen_at=now, last_seen_at=None, last_polled_at=None, updated_at=now,
    )

    output = PrinterOut.model_validate(printer)

    assert output.management_address == "172.15.10.2"


@pytest.mark.parametrize(("warning", "critical"), [(20, 20), (10, 20), (101, 10), (20, -1)])
def test_supply_thresholds_require_critical_below_warning(warning: int, critical: int) -> None:
    with pytest.raises(ValidationError):
        SupplyThresholdUpdate(warning_threshold_percent=warning, critical_threshold_percent=critical)
