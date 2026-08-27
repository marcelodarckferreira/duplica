import pytest

from app.print_fleet.snmp import (
    HR_DEVICE_PRINTER,
    SYS_DESCRIPTION,
    SYS_NAME,
    SYS_OBJECT_ID,
    SnmpRequestError,
    is_printer_device,
    parse_detected_error_state,
)
from app.print_fleet.vendors import normalize_vendor


def test_identifies_printer_from_host_resources_type_with_variable_index() -> None:
    rows = [
        ("1.3.6.1.2.1.25.3.2.1.2.7", "1.3.6.1.2.1.25.3.1.3"),
        ("1.3.6.1.2.1.25.3.2.1.2.42", HR_DEVICE_PRINTER),
    ]

    assert is_printer_device(rows) is True


def test_rejects_snmp_device_without_printer_type() -> None:
    assert is_printer_device([("1.3.6.1.2.1.25.3.2.1.2.7", "1.3.6.1.2.1.25.3.1.3")]) is False


@pytest.mark.parametrize(
    ("description", "expected_manufacturer", "expected_model"),
    [
        ("HP LaserJet Enterprise MFP M528", "HP", "LaserJet Enterprise MFP M528"),
        ("EPSON WorkForce Pro WF-C579R", "Epson", "WorkForce Pro WF-C579R"),
        ("Generic Office Printer", "Desconhecido", "Generic Office Printer"),
    ],
)
def test_normalizes_known_vendors_without_discarding_model(description, expected_manufacturer, expected_model) -> None:
    identity = normalize_vendor(description, None)

    assert identity.manufacturer == expected_manufacturer
    assert identity.model == expected_model


def test_decodes_detected_error_bit_string() -> None:
    assert parse_detected_error_state(bytes([0b10001000])) == ["LOW_PAPER", "DOOR_OPEN"]
    assert parse_detected_error_state(b"\x00") == []


def test_snmp_error_never_contains_community() -> None:
    error = SnmpRequestError("TIMEOUT", "Equipamento não respondeu.")

    assert error.code == "TIMEOUT"
    assert "public" not in str(error)
    assert {SYS_DESCRIPTION, SYS_OBJECT_ID, SYS_NAME}
