import asyncio

import pytest

from app.db.models.print_fleet import Printer
from app.print_fleet.discovery import (
    DiscoveredPrinter,
    IdentityConflict,
    discover_addresses,
    select_matching_printer,
)
from app.print_fleet.snmp import (
    HR_DEVICE_TYPE,
    PRT_GENERAL_PRINTER_NAME,
    PRT_GENERAL_SERIAL_NUMBER,
    SYS_DESCRIPTION,
    SYS_NAME,
    SYS_OBJECT_ID,
    SnmpRequestError,
)


class FakeSnmpTransport:
    def __init__(self) -> None:
        self.system = {
            "172.16.0.10": {
                SYS_DESCRIPTION: "HP LaserJet Enterprise MFP M528",
                SYS_OBJECT_ID: "1.3.6.1.4.1.11.2.3.9",
                SYS_NAME: "IMP-TI-01",
            },
            "172.16.0.11": {
                SYS_DESCRIPTION: "Managed network switch",
                SYS_OBJECT_ID: "1.3.6.1.4.1.9.1.1",
                SYS_NAME: "SW-01",
            },
        }

    async def get(self, address, community, oids, timeout_ms, retries):
        if address == "172.16.0.12":
            raise SnmpRequestError("TIMEOUT", "Equipamento não respondeu.")
        return {oid: self.system[address].get(oid) for oid in oids}

    async def walk(self, address, community, base_oid, timeout_ms, retries):
        if base_oid == HR_DEVICE_TYPE:
            value = "1.3.6.1.2.1.25.3.1.5" if address == "172.16.0.10" else "1.3.6.1.2.1.25.3.1.3"
            return [(f"{base_oid}.42", value)]
        if base_oid == PRT_GENERAL_PRINTER_NAME:
            return [(f"{base_oid}.1", "Recepção TI")]
        if base_oid == PRT_GENERAL_SERIAL_NUMBER:
            return [(f"{base_oid}.1", "BRBSM12345")]
        return []


def test_discovers_only_validated_printers_and_keeps_partial_errors() -> None:
    result = asyncio.run(
        discover_addresses(
            ["172.16.0.10", "172.16.0.11", "172.16.0.12"],
            community="segredo-efemero",
            timeout_ms=1000,
            retries=0,
            concurrency_limit=2,
            transport=FakeSnmpTransport(),
        )
    )

    assert result.scanned_count == 3
    assert result.responsive_count == 2
    assert result.printer_count == 1
    assert result.error_count == 0
    assert result.printers[0].address == "172.16.0.10"
    assert result.printers[0].display_name == "Recepção TI"
    assert result.printers[0].manufacturer == "HP"
    assert result.printers[0].model == "LaserJet Enterprise MFP M528"
    assert result.printers[0].serial_number == "BRBSM12345"
    assert result.errors == ()
    assert "segredo-efemero" not in repr(result)


def test_deduplicates_by_serial_before_mutable_address() -> None:
    snapshot = DiscoveredPrinter(
        address="172.16.0.20",
        display_name="Impressora TI",
        manufacturer="HP",
        model="LaserJet",
        serial_number="SERIAL-1",
        sys_object_id=None,
        sys_name=None,
        sys_description=None,
    )
    same_device = Printer(
        id="printer-1",
        discovery_network_id="network-1",
        management_address="172.16.0.10",
        serial_number="SERIAL-1",
    )

    assert select_matching_printer(snapshot, [same_device], "network-1") is same_device


def test_refuses_automatic_merge_when_identifiers_point_to_two_records() -> None:
    snapshot = DiscoveredPrinter(
        address="172.16.0.20",
        display_name="Impressora TI",
        manufacturer="HP",
        model="LaserJet",
        serial_number="SERIAL-1",
        sys_object_id=None,
        sys_name=None,
        sys_description=None,
    )
    serial_match = Printer(
        id="printer-1",
        discovery_network_id="network-1",
        management_address="172.16.0.10",
        serial_number="SERIAL-1",
    )
    address_match = Printer(
        id="printer-2",
        discovery_network_id="network-1",
        management_address="172.16.0.20",
        serial_number="SERIAL-2",
    )

    with pytest.raises(IdentityConflict):
        select_matching_printer(snapshot, [serial_match, address_match], "network-1")
