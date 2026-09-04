import asyncio
from dataclasses import dataclass
from datetime import datetime, timezone
from ipaddress import ip_address
from typing import Any

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.base import AsyncSessionLocal
from app.db.models.print_fleet import (
    DiscoveryEvent,
    DiscoveryNetwork,
    DiscoveryRun,
    DiscoveryRunBatch,
    Printer,
)
from app.print_fleet.credentials import CredentialDecryptionError, SnmpCredentialCipher
from app.print_fleet.snmp import (
    HR_DEVICE_TYPE,
    PRT_GENERAL_PRINTER_NAME,
    PRT_GENERAL_SERIAL_NUMBER,
    SYS_DESCRIPTION,
    SYS_NAME,
    SYS_OBJECT_ID,
    SnmpRequestError,
    SnmpTransport,
    is_printer_device,
)
from app.print_fleet.vendors import normalize_vendor
from app.print_fleet.tasks import (
    claim_next_batch,
    claim_next_run,
    finalize_run_if_finished,
    prepare_run_batches,
)
from app.print_fleet.types import BatchStatus, OnboardingStatus, OperationalStatus


@dataclass(frozen=True)
class DiscoveredPrinter:
    address: str
    display_name: str
    manufacturer: str
    model: str
    serial_number: str | None
    sys_object_id: str | None
    sys_name: str | None
    sys_description: str | None
    mac_address: str | None = None


@dataclass(frozen=True)
class DiscoveryError:
    address: str
    code: str
    detail: str


@dataclass(frozen=True)
class AddressDiscoveryResult:
    address: str
    responsive: bool
    printer: DiscoveredPrinter | None = None
    error: DiscoveryError | None = None


@dataclass(frozen=True)
class BatchDiscoveryResult:
    scanned_count: int
    responsive_count: int
    printer_count: int
    error_count: int
    printers: tuple[DiscoveredPrinter, ...]
    errors: tuple[DiscoveryError, ...]


class IdentityConflict(RuntimeError):
    pass


def _first_value(rows: list[tuple[str, Any]]) -> str | None:
    if not rows or rows[0][1] is None:
        return None
    value = str(rows[0][1]).strip()
    return value or None


async def _discover_address(
    address: str,
    community: str,
    timeout_ms: int,
    retries: int,
    transport: SnmpTransport,
) -> AddressDiscoveryResult:
    try:
        system = await transport.get(
            address,
            community,
            [SYS_DESCRIPTION, SYS_OBJECT_ID, SYS_NAME],
            timeout_ms,
            retries,
        )
        device_types = await transport.walk(
            address, community, HR_DEVICE_TYPE, timeout_ms, retries
        )
        if not is_printer_device(device_types):
            return AddressDiscoveryResult(address=address, responsive=True)

        printer_name_rows, serial_rows = await asyncio.gather(
            transport.walk(
                address, community, PRT_GENERAL_PRINTER_NAME, timeout_ms, retries
            ),
            transport.walk(
                address, community, PRT_GENERAL_SERIAL_NUMBER, timeout_ms, retries
            ),
        )
        description = system.get(SYS_DESCRIPTION)
        object_id = system.get(SYS_OBJECT_ID)
        sys_name = system.get(SYS_NAME)
        identity = normalize_vendor(
            str(description) if description is not None else None,
            str(object_id) if object_id is not None else None,
        )
        display_name = _first_value(printer_name_rows) or (
            str(sys_name).strip() if sys_name else identity.model
        )
        return AddressDiscoveryResult(
            address=address,
            responsive=True,
            printer=DiscoveredPrinter(
                address=address,
                display_name=display_name,
                manufacturer=identity.manufacturer,
                model=identity.model,
                serial_number=_first_value(serial_rows),
                sys_object_id=str(object_id) if object_id is not None else None,
                sys_name=str(sys_name) if sys_name is not None else None,
                sys_description=str(description) if description is not None else None,
            ),
        )
    except SnmpRequestError as exc:
        if exc.code == "TIMEOUT":
            return AddressDiscoveryResult(address=address, responsive=False)
        return AddressDiscoveryResult(
            address=address,
            responsive=False,
            error=DiscoveryError(address=address, code=exc.code, detail=str(exc)),
        )
    except Exception:
        return AddressDiscoveryResult(
            address=address,
            responsive=False,
            error=DiscoveryError(
                address=address,
                code="INVALID_RESPONSE",
                detail="Resposta SNMP inválida ou incompleta.",
            ),
        )


async def discover_addresses(
    addresses: list[str],
    *,
    community: str,
    timeout_ms: int,
    retries: int,
    concurrency_limit: int,
    transport: SnmpTransport,
) -> BatchDiscoveryResult:
    semaphore = asyncio.Semaphore(concurrency_limit)

    async def bounded(address: str) -> AddressDiscoveryResult:
        async with semaphore:
            return await _discover_address(
                address, community, timeout_ms, retries, transport
            )

    results = await asyncio.gather(*(bounded(address) for address in addresses))
    printers = tuple(result.printer for result in results if result.printer is not None)
    errors = tuple(result.error for result in results if result.error is not None)
    return BatchDiscoveryResult(
        scanned_count=len(results),
        responsive_count=sum(result.responsive for result in results),
        printer_count=len(printers),
        error_count=len(errors),
        printers=printers,
        errors=errors,
    )


def select_matching_printer(
    snapshot: DiscoveredPrinter,
    candidates: list[Printer],
    network_id: str,
) -> Printer | None:
    matches: dict[str, Printer] = {}
    for candidate in candidates:
        if snapshot.serial_number and candidate.serial_number == snapshot.serial_number:
            matches[candidate.id] = candidate
        if snapshot.mac_address and candidate.mac_address == snapshot.mac_address:
            matches[candidate.id] = candidate
        if (
            candidate.discovery_network_id == network_id
            and str(candidate.management_address) == snapshot.address
        ):
            matches[candidate.id] = candidate
    if len(matches) > 1:
        raise IdentityConflict("Identificadores da impressora apontam para cadastros diferentes.")
    return next(iter(matches.values()), None)


def addresses_for_batch(batch: DiscoveryRunBatch) -> list[str]:
    first = int(ip_address(str(batch.first_address)))
    last = int(ip_address(str(batch.last_address)))
    return [str(ip_address(value)) for value in range(first, last + 1)]


async def _candidate_printers(
    db: AsyncSession,
    network_id: str,
    snapshot: DiscoveredPrinter,
) -> list[Printer]:
    conditions = [
        and_(
            Printer.discovery_network_id == network_id,
            Printer.management_address == snapshot.address,
        )
    ]
    if snapshot.serial_number:
        conditions.append(Printer.serial_number == snapshot.serial_number)
    if snapshot.mac_address:
        conditions.append(Printer.mac_address == snapshot.mac_address)
    result = await db.execute(select(Printer).where(or_(*conditions)))
    return list(result.scalars().all())


async def persist_batch_result(
    db: AsyncSession,
    run: DiscoveryRun,
    batch: DiscoveryRunBatch,
    result: BatchDiscoveryResult,
) -> None:
    new_printers = 0
    conflict_count = 0
    for snapshot in result.printers:
        candidates = await _candidate_printers(db, run.network_id, snapshot)
        try:
            printer = select_matching_printer(snapshot, candidates, run.network_id)
        except IdentityConflict:
            conflict_count += 1
            db.add(
                DiscoveryEvent(
                    run_id=run.id,
                    batch_id=batch.id,
                    address=snapshot.address,
                    code="IDENTITY_CONFLICT",
                    detail="Identificadores apontam para mais de um cadastro; revisão manual necessária.",
                )
            )
            continue
        if printer is None:
            printer = Printer(
                discovery_network_id=run.network_id,
                management_address=snapshot.address,
                onboarding_status=OnboardingStatus.PENDING.value,
                monitoring_enabled=False,
                operational_status=OperationalStatus.UNKNOWN.value,
            )
            db.add(printer)
            new_printers += 1
        printer.management_address = snapshot.address
        printer.display_name = printer.display_name or snapshot.display_name
        printer.manufacturer = snapshot.manufacturer
        printer.model = snapshot.model
        printer.serial_number = snapshot.serial_number or printer.serial_number
        printer.mac_address = snapshot.mac_address or printer.mac_address
        printer.sys_object_id = snapshot.sys_object_id
        printer.sys_name = snapshot.sys_name
        printer.sys_description = snapshot.sys_description
        printer.last_seen_at = datetime.now(timezone.utc)

    for error in result.errors:
        db.add(
            DiscoveryEvent(
                run_id=run.id,
                batch_id=batch.id,
                address=error.address,
                code=error.code,
                detail=error.detail[:500],
            )
        )

    batch.scanned_count = result.scanned_count
    batch.responsive_count = result.responsive_count
    batch.printer_count = result.printer_count
    batch.error_count = result.error_count + conflict_count
    batch.status = BatchStatus.COMPLETED.value
    batch.finished_at = datetime.now(timezone.utc)
    run.scanned_targets += result.scanned_count
    run.responsive_devices += result.responsive_count
    run.printers_found += result.printer_count
    run.new_printers += new_printers
    run.error_count += result.error_count + conflict_count
    run.heartbeat_at = batch.finished_at
    await db.commit()


async def fail_batch(
    db: AsyncSession,
    run: DiscoveryRun,
    batch: DiscoveryRunBatch,
    code: str,
    detail: str,
) -> None:
    now = datetime.now(timezone.utc)
    batch.status = BatchStatus.FAILED.value
    batch.error_count += 1
    batch.finished_at = now
    run.error_count += 1
    run.last_error_code = code
    run.last_error_message = detail[:500]
    run.heartbeat_at = now
    db.add(
        DiscoveryEvent(
            run_id=run.id,
            batch_id=batch.id,
            code=code,
            detail=detail[:500],
        )
    )
    await db.commit()


async def process_discovery_cycle(transport: SnmpTransport, worker_id: str) -> bool:
    async with AsyncSessionLocal() as db:
        run = await claim_next_run(db, worker_id)
        if run is None:
            return False
        await prepare_run_batches(db, run)
        batch = await claim_next_batch(db, run.id)
        if batch is None:
            await finalize_run_if_finished(db, run)
            return True
        network = await db.get(DiscoveryNetwork, run.network_id)
        if network is None:
            await fail_batch(db, run, batch, "NETWORK_NOT_FOUND", "Rede de descoberta não encontrada.")
            return True
        try:
            community = SnmpCredentialCipher(
                settings.SNMP_CREDENTIAL_ENCRYPTION_KEY
            ).decrypt(network.community_ciphertext)
        except (CredentialDecryptionError, RuntimeError):
            await fail_batch(
                db,
                run,
                batch,
                "CREDENTIAL_ERROR",
                "Não foi possível acessar a credencial SNMP protegida.",
            )
            return True
        timeout_ms = network.timeout_ms
        retries = network.retries
        concurrency_limit = network.concurrency_limit
        await db.commit()

        result = await discover_addresses(
            addresses_for_batch(batch),
            community=community,
            timeout_ms=timeout_ms,
            retries=retries,
            concurrency_limit=concurrency_limit,
            transport=transport,
        )
        await persist_batch_result(db, run, batch, result)
        return True
