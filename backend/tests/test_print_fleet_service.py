from datetime import datetime, timezone

import pytest
from fastapi import HTTPException

from app.db.models.print_fleet import DiscoveryNetwork
from app.db.models.unit import Unit
from app.print_fleet.service import ensure_address_allowed, ensure_headquarters_unit, network_to_out


def _network(**overrides) -> DiscoveryNetwork:
    values = {
        "id": "network-1",
        "name": "Rede administrativa",
        "cidr": "172.16.0.0/24",
        "excluded_cidrs": ["172.16.0.10/32"],
        "snmp_version": "V2C",
        "community_ciphertext": "ciphertext-que-nao-pode-sair",
        "timeout_ms": 1000,
        "retries": 0,
        "concurrency_limit": 64,
        "active": True,
        "created_by_user_id": "admin",
        "updated_by_user_id": "admin",
        "created_at": datetime(2026, 8, 27, tzinfo=timezone.utc),
        "updated_at": datetime(2026, 8, 27, tzinfo=timezone.utc),
    }
    values.update(overrides)
    return DiscoveryNetwork(**values)


def test_network_output_exposes_configuration_without_secret() -> None:
    serialized = network_to_out(_network()).model_dump()

    assert serialized["credential_configured"] is True
    assert serialized["target_count"] == 253
    assert "community" not in serialized
    assert "ciphertext" not in serialized
    assert "ciphertext-que-nao-pode-sair" not in repr(serialized)


def test_manual_address_must_belong_to_network_and_not_exclusion() -> None:
    network = _network()

    ensure_address_allowed(network, "172.16.0.20")
    with pytest.raises(HTTPException, match="não pertence") as outside:
        ensure_address_allowed(network, "172.16.1.20")
    with pytest.raises(HTTPException, match="excluído") as excluded:
        ensure_address_allowed(network, "172.16.0.10")

    assert outside.value.status_code == 400
    assert excluded.value.status_code == 400


def test_printer_confirmation_requires_active_headquarters_sector() -> None:
    ensure_headquarters_unit(Unit(id="ti", name="TI", origin="SEDE", code="SED-TI", active=True))

    with pytest.raises(HTTPException, match="setor ativo da sede"):
        ensure_headquarters_unit(Unit(id="school", name="Escola", origin="ESCOLA", code="ESC-1", active=True))
    with pytest.raises(HTTPException, match="setor ativo da sede"):
        ensure_headquarters_unit(Unit(id="inactive", name="RH", origin="SEDE", code="SED-RH", active=False))

