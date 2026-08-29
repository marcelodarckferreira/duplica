from datetime import datetime, timezone
from ipaddress import ip_address, ip_network

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import record_resource_audit
from app.core.config import settings
from app.db.models.print_fleet import (
    DiscoveryNetwork,
    DiscoveryRun,
    Printer,
    PrinterSupply,
    SupplyReading,
)
from app.db.models.unit import Unit
from app.db.models.user import User
from app.print_fleet.credentials import SnmpCredentialCipher
from app.print_fleet.monitoring import poll_printer
from app.print_fleet.networking import normalize_network
from app.print_fleet.snmp import create_transport
from app.print_fleet.types import DiscoveryRunStatus, OnboardingStatus, OperationalStatus
from app.schemas.print_fleet import (
    DiscoveryNetworkCreate,
    DiscoveryNetworkOut,
    DiscoveryNetworkUpdate,
    DiscoveryRunOut,
    ManualPrinterCreate,
    PaginatedDiscoveryRunsOut,
    PaginatedPrintersOut,
    PrinterConfirm,
    PrinterUpdate,
)


def _not_found(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


def network_to_out(network: DiscoveryNetwork) -> DiscoveryNetworkOut:
    normalized = normalize_network(network.cidr, network.excluded_cidrs)
    return DiscoveryNetworkOut(
        id=network.id,
        name=network.name,
        cidr=normalized.cidr,
        excluded_cidrs=list(normalized.exclusions),
        snmp_version=network.snmp_version,
        timeout_ms=network.timeout_ms,
        retries=network.retries,
        concurrency_limit=network.concurrency_limit,
        active=network.active,
        credential_configured=bool(network.community_ciphertext),
        target_count=normalized.target_count,
        is_private=normalized.is_private,
        created_at=network.created_at,
        updated_at=network.updated_at,
    )


def ensure_address_allowed(network: DiscoveryNetwork, address: str) -> None:
    parsed_address = ip_address(address)
    main_network = ip_network(network.cidr, strict=False)
    if parsed_address not in main_network:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O endereço não pertence à rede selecionada.",
        )
    if any(parsed_address in ip_network(value, strict=False) for value in network.excluded_cidrs):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O endereço está excluído da descoberta nesta rede.",
        )


def ensure_headquarters_unit(unit: Unit | None) -> None:
    if unit is None or unit.origin != "SEDE" or not unit.active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Selecione um setor ativo da sede.",
        )


async def list_networks(db: AsyncSession) -> list[DiscoveryNetworkOut]:
    result = await db.execute(select(DiscoveryNetwork).order_by(DiscoveryNetwork.name))
    return [network_to_out(network) for network in result.scalars().all()]


async def create_network(
    db: AsyncSession,
    payload: DiscoveryNetworkCreate,
    actor: User,
) -> DiscoveryNetworkOut:
    cipher = SnmpCredentialCipher(settings.SNMP_CREDENTIAL_ENCRYPTION_KEY)
    network = DiscoveryNetwork(
        name=payload.name,
        cidr=payload.cidr,
        excluded_cidrs=payload.excluded_cidrs,
        snmp_version="V2C",
        community_ciphertext=cipher.encrypt(payload.community),
        timeout_ms=payload.timeout_ms,
        retries=payload.retries,
        concurrency_limit=payload.concurrency_limit,
        active=True,
        created_by_user_id=actor.id,
        updated_by_user_id=actor.id,
    )
    db.add(network)
    await db.flush()
    record_resource_audit(db, "create", "discovery_network", network.id, actor, f"Rede {network.name} cadastrada.")
    await db.commit()
    await db.refresh(network)
    return network_to_out(network)


async def update_network(
    db: AsyncSession,
    network_id: str,
    payload: DiscoveryNetworkUpdate,
    actor: User,
) -> DiscoveryNetworkOut:
    network = await db.get(DiscoveryNetwork, network_id)
    if network is None:
        raise _not_found("Rede de descoberta não encontrada.")

    values = payload.model_dump(exclude_unset=True)
    cidr = values.pop("cidr", network.cidr)
    exclusions = values.pop("excluded_cidrs", network.excluded_cidrs)
    normalized = normalize_network(cidr, exclusions)
    network.cidr = normalized.cidr
    network.excluded_cidrs = list(normalized.exclusions)
    community = values.pop("community", None)
    if community is not None:
        network.community_ciphertext = SnmpCredentialCipher(
            settings.SNMP_CREDENTIAL_ENCRYPTION_KEY
        ).encrypt(community)
    for field, value in values.items():
        setattr(network, field, value)
    network.updated_by_user_id = actor.id
    record_resource_audit(db, "update", "discovery_network", network.id, actor, f"Rede {network.name} atualizada.")
    await db.commit()
    await db.refresh(network)
    return network_to_out(network)


async def set_network_active(
    db: AsyncSession, network_id: str, active: bool, actor: User
) -> DiscoveryNetworkOut:
    network = await db.get(DiscoveryNetwork, network_id)
    if network is None:
        raise _not_found("Rede de descoberta não encontrada.")
    network.active = active
    network.updated_by_user_id = actor.id
    record_resource_audit(
        db,
        "update",
        "discovery_network",
        network.id,
        actor,
        f"Rede {'ativada' if active else 'desativada'}.",
    )
    await db.commit()
    await db.refresh(network)
    return network_to_out(network)


async def create_discovery_run(db: AsyncSession, network_id: str, actor: User) -> DiscoveryRun:
    network = await db.get(DiscoveryNetwork, network_id)
    if network is None:
        raise _not_found("Rede de descoberta não encontrada.")
    if not network.active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ative a rede antes da descoberta.")
    active_result = await db.execute(
        select(DiscoveryRun.id).where(
            DiscoveryRun.network_id == network_id,
            DiscoveryRun.status.in_([DiscoveryRunStatus.PENDING.value, DiscoveryRunStatus.RUNNING.value]),
        )
    )
    if active_result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe uma descoberta pendente ou em andamento para esta rede.",
        )
    normalized = normalize_network(network.cidr, network.excluded_cidrs)
    run = DiscoveryRun(
        network_id=network.id,
        status=DiscoveryRunStatus.PENDING.value,
        total_targets=normalized.target_count,
        requested_by_user_id=actor.id,
        parameters_snapshot={
            "cidr": normalized.cidr,
            "excluded_cidrs": list(normalized.exclusions),
            "timeout_ms": network.timeout_ms,
            "retries": network.retries,
            "concurrency_limit": network.concurrency_limit,
        },
    )
    db.add(run)
    await db.flush()
    record_resource_audit(db, "create", "discovery_run", run.id, actor, f"Descoberta solicitada para {network.name}.")
    await db.commit()
    await db.refresh(run)
    return run


async def list_discovery_runs(
    db: AsyncSession, page: int, page_size: int
) -> PaginatedDiscoveryRunsOut:
    total = (await db.execute(select(func.count()).select_from(DiscoveryRun))).scalar_one()
    result = await db.execute(
        select(DiscoveryRun)
        .order_by(DiscoveryRun.requested_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return PaginatedDiscoveryRunsOut(
        items=[DiscoveryRunOut.model_validate(item) for item in result.scalars().all()],
        total=total,
        page=page,
        page_size=page_size,
    )


async def get_discovery_run(db: AsyncSession, run_id: str) -> DiscoveryRun:
    run = await db.get(DiscoveryRun, run_id)
    if run is None:
        raise _not_found("Execução de descoberta não encontrada.")
    return run


async def _get_network(db: AsyncSession, network_id: str) -> DiscoveryNetwork:
    network = await db.get(DiscoveryNetwork, network_id)
    if network is None:
        raise _not_found("Rede de descoberta não encontrada.")
    return network


async def _get_printer(db: AsyncSession, printer_id: str) -> Printer:
    printer = await db.get(Printer, printer_id)
    if printer is None:
        raise _not_found("Impressora não encontrada.")
    return printer


async def create_manual_printer(db: AsyncSession, payload: ManualPrinterCreate, actor: User) -> Printer:
    network = await _get_network(db, payload.discovery_network_id)
    ensure_address_allowed(network, str(payload.management_address))
    unit = await db.get(Unit, payload.unit_id)
    ensure_headquarters_unit(unit)
    printer = Printer(
        discovery_network_id=network.id,
        management_address=str(payload.management_address),
        display_name=payload.display_name,
        unit_id=payload.unit_id,
        manufacturer=payload.manufacturer,
        model=payload.model,
        serial_number=payload.serial_number,
        mac_address=payload.mac_address,
        onboarding_status=OnboardingStatus.CONFIRMED.value,
        monitoring_enabled=True,
        operational_status=OperationalStatus.UNKNOWN.value,
    )
    db.add(printer)
    await db.flush()
    record_resource_audit(db, "create", "printer", printer.id, actor, f"Impressora {printer.display_name} cadastrada.")
    await db.commit()
    await db.refresh(printer)
    return printer


async def list_printers(
    db: AsyncSession,
    page: int,
    page_size: int,
    onboarding_status: str | None = None,
    unit_id: str | None = None,
    manufacturer: str | None = None,
) -> PaginatedPrintersOut:
    conditions = []
    if onboarding_status:
        conditions.append(Printer.onboarding_status == onboarding_status)
    if unit_id:
        conditions.append(Printer.unit_id == unit_id)
    if manufacturer:
        conditions.append(Printer.manufacturer.ilike(f"%{manufacturer}%"))
    total = (await db.execute(select(func.count()).select_from(Printer).where(*conditions))).scalar_one()
    result = await db.execute(
        select(Printer)
        .where(*conditions)
        .order_by(Printer.display_name.asc().nulls_last(), Printer.management_address)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return PaginatedPrintersOut(
        items=list(result.scalars().all()), total=total, page=page, page_size=page_size
    )


async def get_printer(db: AsyncSession, printer_id: str) -> Printer:
    return await _get_printer(db, printer_id)


async def update_printer(
    db: AsyncSession, printer_id: str, payload: PrinterUpdate, actor: User
) -> Printer:
    printer = await _get_printer(db, printer_id)
    values = payload.model_dump(exclude_unset=True)
    if "unit_id" in values:
        ensure_headquarters_unit(await db.get(Unit, values["unit_id"]))
    for field, value in values.items():
        setattr(printer, field, value)
    record_resource_audit(db, "update", "printer", printer.id, actor, "Cadastro da impressora atualizado.")
    await db.commit()
    await db.refresh(printer)
    return printer


async def confirm_printer(
    db: AsyncSession, printer_id: str, payload: PrinterConfirm, actor: User
) -> Printer:
    printer = await _get_printer(db, printer_id)
    ensure_headquarters_unit(await db.get(Unit, payload.unit_id))
    printer.display_name = payload.display_name.strip()
    printer.unit_id = payload.unit_id
    printer.manufacturer = payload.manufacturer
    printer.model = payload.model
    printer.onboarding_status = OnboardingStatus.CONFIRMED.value
    printer.monitoring_enabled = True
    record_resource_audit(db, "confirm", "printer", printer.id, actor, f"Impressora vinculada ao setor {payload.unit_id}.")
    await db.commit()
    await db.refresh(printer)
    return printer


async def set_printer_onboarding(
    db: AsyncSession, printer_id: str, onboarding_status: OnboardingStatus, actor: User
) -> Printer:
    printer = await _get_printer(db, printer_id)
    printer.onboarding_status = onboarding_status.value
    if onboarding_status is not OnboardingStatus.CONFIRMED:
        printer.monitoring_enabled = False
    record_resource_audit(db, "update", "printer", printer.id, actor, f"Cadastro alterado para {onboarding_status.value}.")
    await db.commit()
    await db.refresh(printer)
    return printer


async def set_monitoring(db: AsyncSession, printer_id: str, enabled: bool, actor: User) -> Printer:
    printer = await _get_printer(db, printer_id)
    if enabled and printer.onboarding_status != OnboardingStatus.CONFIRMED.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Confirme a impressora antes de monitorá-la.")
    printer.monitoring_enabled = enabled
    record_resource_audit(db, "update", "printer", printer.id, actor, f"Monitoramento {'ativado' if enabled else 'suspenso'}.")
    await db.commit()
    await db.refresh(printer)
    return printer


async def poll_printer_now(db: AsyncSession, printer_id: str, actor: User) -> Printer:
    printer = await _get_printer(db, printer_id)
    transport = create_transport(settings.PRINT_FLEET_SNMP_TRANSPORT)
    try:
        succeeded = await poll_printer(db, printer, transport, datetime.now(timezone.utc))
    finally:
        await transport.aclose()
    if not succeeded:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="A impressora não respondeu à leitura SNMP.")
    record_resource_audit(db, "update", "printer", printer.id, actor, "Leitura SNMP forçada manualmente.")
    await db.commit()
    await db.refresh(printer)
    return printer


async def list_supplies(db: AsyncSession, printer_id: str) -> list[PrinterSupply]:
    await _get_printer(db, printer_id)
    result = await db.execute(
        select(PrinterSupply)
        .where(PrinterSupply.printer_id == printer_id, PrinterSupply.missing_poll_count < 3)
        .order_by(PrinterSupply.description_raw)
    )
    return list(result.scalars().all())


async def list_supply_readings(
    db: AsyncSession, printer_id: str, supply_id: str, limit: int
) -> list[SupplyReading]:
    supply = await db.get(PrinterSupply, supply_id)
    if supply is None or supply.printer_id != printer_id:
        raise _not_found("Insumo não encontrado.")
    result = await db.execute(
        select(SupplyReading)
        .where(SupplyReading.printer_supply_id == supply_id)
        .order_by(SupplyReading.recorded_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())
