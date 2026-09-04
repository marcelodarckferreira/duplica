from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_any_permission, require_permission
from app.db.base import get_db
from app.db.models.user import User
from app.print_fleet import service
from app.print_fleet.types import OnboardingStatus
from app.schemas.print_fleet import (
    DiscoveryNetworkActiveUpdate,
    DiscoveryNetworkCreate,
    DiscoveryNetworkOut,
    DiscoveryNetworkUpdate,
    DiscoveryRunOut,
    ManualPrinterCreate,
    MonitoringUpdate,
    PaginatedDiscoveryRunsOut,
    PaginatedPrintersOut,
    PrinterConfirm,
    PrinterOut,
    PrinterSupplyOut,
    PrinterUpdate,
    SupplyReadingOut,
)

router = APIRouter(prefix="/api/v1/print-fleet", tags=["print-fleet"])
read_access = require_any_permission("viewPrintFleet", "managePrintFleet")


@router.get("/networks", response_model=list[DiscoveryNetworkOut], status_code=status.HTTP_200_OK)
async def networks(db: AsyncSession = Depends(get_db), _user: User = Depends(read_access)):
    return await service.list_networks(db)


@router.post("/networks", response_model=DiscoveryNetworkOut, status_code=status.HTTP_201_CREATED)
async def create_network(
    payload: DiscoveryNetworkCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("managePrintFleet")),
):
    return await service.create_network(db, payload, user)


@router.patch("/networks/{network_id}", response_model=DiscoveryNetworkOut)
async def update_network(
    network_id: str,
    payload: DiscoveryNetworkUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("managePrintFleet")),
):
    return await service.update_network(db, network_id, payload, user)


@router.patch("/networks/{network_id}/active", response_model=DiscoveryNetworkOut)
async def set_network_active(
    network_id: str,
    payload: DiscoveryNetworkActiveUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("managePrintFleet")),
):
    return await service.set_network_active(db, network_id, payload.active, user)


@router.post(
    "/networks/{network_id}/discoveries",
    response_model=DiscoveryRunOut,
    status_code=status.HTTP_202_ACCEPTED,
)
async def start_discovery(
    network_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("managePrintFleet")),
):
    return await service.create_discovery_run(db, network_id, user)


@router.get("/discoveries", response_model=PaginatedDiscoveryRunsOut, status_code=status.HTTP_200_OK)
async def discoveries(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(read_access),
):
    return await service.list_discovery_runs(db, page, page_size)


@router.get("/discoveries/{run_id}", response_model=DiscoveryRunOut)
async def discovery(run_id: str, db: AsyncSession = Depends(get_db), _user: User = Depends(read_access)):
    return await service.get_discovery_run(db, run_id)


@router.get("/printers", response_model=PaginatedPrintersOut, status_code=status.HTTP_200_OK)
async def printers(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    onboarding_status: str | None = None,
    unit_id: str | None = None,
    manufacturer: str | None = None,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(read_access),
):
    return await service.list_printers(db, page, page_size, onboarding_status, unit_id, manufacturer)


@router.post("/printers", response_model=PrinterOut, status_code=status.HTTP_201_CREATED)
async def create_printer(
    payload: ManualPrinterCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("managePrintFleet")),
):
    return await service.create_manual_printer(db, payload, user)


@router.get("/printers/{printer_id}", response_model=PrinterOut)
async def printer(printer_id: str, db: AsyncSession = Depends(get_db), _user: User = Depends(read_access)):
    return await service.get_printer(db, printer_id)


@router.patch("/printers/{printer_id}", response_model=PrinterOut)
async def update_printer(
    printer_id: str,
    payload: PrinterUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("managePrintFleet")),
):
    return await service.update_printer(db, printer_id, payload, user)


@router.post("/printers/{printer_id}/confirm", response_model=PrinterOut, status_code=status.HTTP_200_OK)
async def confirm_printer(
    printer_id: str,
    payload: PrinterConfirm,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("managePrintFleet")),
):
    return await service.confirm_printer(db, printer_id, payload, user)


@router.post("/printers/{printer_id}/ignore", response_model=PrinterOut)
async def ignore_printer(
    printer_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("managePrintFleet")),
):
    return await service.set_printer_onboarding(db, printer_id, OnboardingStatus.IGNORED, user)


@router.post("/printers/{printer_id}/reopen", response_model=PrinterOut)
async def reopen_printer(
    printer_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("managePrintFleet")),
):
    return await service.set_printer_onboarding(db, printer_id, OnboardingStatus.PENDING, user)


@router.patch("/printers/{printer_id}/monitoring", response_model=PrinterOut)
async def set_monitoring(
    printer_id: str,
    payload: MonitoringUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("managePrintFleet")),
):
    return await service.set_monitoring(db, printer_id, payload.enabled, user)


@router.post("/printers/{printer_id}/poll", response_model=PrinterOut)
async def poll_printer(
    printer_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("managePrintFleet")),
):
    return await service.poll_printer_now(db, printer_id, user)


@router.get(
    "/printers/{printer_id}/supplies",
    response_model=list[PrinterSupplyOut],
    status_code=status.HTTP_200_OK,
)
async def supplies(
    printer_id: str,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(read_access),
):
    return await service.list_supplies(db, printer_id)


@router.get(
    "/printers/{printer_id}/supplies/{supply_id}/readings",
    response_model=list[SupplyReadingOut],
)
async def supply_readings(
    printer_id: str,
    supply_id: str,
    limit: int = Query(default=100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(read_access),
):
    return await service.list_supply_readings(db, printer_id, supply_id, limit)
