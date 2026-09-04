from collections.abc import Iterator
from dataclasses import dataclass
from ipaddress import IPv4Address, IPv4Network, ip_network


@dataclass(frozen=True)
class NormalizedNetwork:
    cidr: str
    exclusions: tuple[str, ...]
    is_private: bool
    target_count: int


@dataclass(frozen=True)
class HostBatch:
    first_address: str
    last_address: str
    addresses: tuple[str, ...]


def _as_ipv4_network(value: str) -> IPv4Network:
    try:
        network = ip_network(value.strip(), strict=False)
    except ValueError as exc:
        raise ValueError("Rede ou endereço CIDR inválido.") from exc
    if not isinstance(network, IPv4Network):
        raise ValueError("Somente redes IPv4 são aceitas.")
    return network


def _is_excluded(address: IPv4Address, exclusions: tuple[IPv4Network, ...]) -> bool:
    return any(address in exclusion for exclusion in exclusions)


def normalize_network(cidr: str, exclusions: list[str]) -> NormalizedNetwork:
    network = _as_ipv4_network(cidr)
    normalized_exclusions: list[IPv4Network] = []
    for raw_exclusion in exclusions:
        exclusion = _as_ipv4_network(raw_exclusion)
        if not exclusion.subnet_of(network):
            raise ValueError("A exclusão está fora da rede principal.")
        normalized_exclusions.append(exclusion)

    unique_exclusions = tuple(sorted(set(normalized_exclusions), key=lambda item: (int(item.network_address), item.prefixlen)))
    target_count = sum(1 for address in network.hosts() if not _is_excluded(address, unique_exclusions))
    return NormalizedNetwork(
        cidr=str(network),
        exclusions=tuple(str(exclusion) for exclusion in unique_exclusions),
        is_private=network.is_private,
        target_count=target_count,
    )


def iter_host_batches(network: NormalizedNetwork, batch_size: int = 256) -> Iterator[HostBatch]:
    if batch_size < 1:
        raise ValueError("O tamanho do lote deve ser maior que zero.")

    main_network = _as_ipv4_network(network.cidr)
    exclusions = tuple(_as_ipv4_network(value) for value in network.exclusions)
    pending: list[str] = []
    for address in main_network.hosts():
        if _is_excluded(address, exclusions):
            continue
        pending.append(str(address))
        if len(pending) == batch_size:
            addresses = tuple(pending)
            yield HostBatch(first_address=addresses[0], last_address=addresses[-1], addresses=addresses)
            pending.clear()

    if pending:
        addresses = tuple(pending)
        yield HostBatch(first_address=addresses[0], last_address=addresses[-1], addresses=addresses)

