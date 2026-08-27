import itertools

import pytest

from app.print_fleet.networking import iter_host_batches, normalize_network


def _flatten_batches(network, batch_size: int) -> list[str]:
    return list(itertools.chain.from_iterable(batch.addresses for batch in iter_host_batches(network, batch_size)))


def test_normalizes_host_input_to_canonical_network() -> None:
    value = normalize_network("172.16.4.99/24", [])

    assert value.cidr == "172.16.4.0/24"
    assert value.is_private is True
    assert value.target_count == 254


def test_rejects_exclusion_outside_network() -> None:
    with pytest.raises(ValueError, match="fora da rede principal"):
        normalize_network("172.16.0.0/24", ["172.16.1.10"])


def test_batches_skip_network_broadcast_and_exclusions() -> None:
    value = normalize_network("172.16.0.0/29", ["172.16.0.2", "172.16.0.4/31"])

    assert value.exclusions == ("172.16.0.2/32", "172.16.0.4/31")
    assert value.target_count == 3
    assert _flatten_batches(value, batch_size=2) == ["172.16.0.1", "172.16.0.3", "172.16.0.6"]


def test_batches_are_deterministic_and_bounded() -> None:
    value = normalize_network("192.168.10.0/29", [])

    batches = list(iter_host_batches(value, batch_size=4))

    assert [batch.addresses for batch in batches] == [
        ("192.168.10.1", "192.168.10.2", "192.168.10.3", "192.168.10.4"),
        ("192.168.10.5", "192.168.10.6"),
    ]
    assert [(batch.first_address, batch.last_address) for batch in batches] == [
        ("192.168.10.1", "192.168.10.4"),
        ("192.168.10.5", "192.168.10.6"),
    ]


def test_rejects_invalid_batch_size() -> None:
    value = normalize_network("192.168.10.0/30", [])

    with pytest.raises(ValueError, match="maior que zero"):
        list(iter_host_batches(value, batch_size=0))


def test_flags_public_range_without_rejecting_legacy_network() -> None:
    value = normalize_network("172.15.0.0/16", ["172.15.0.1"])

    assert value.is_private is False
    assert value.target_count == 65_533

