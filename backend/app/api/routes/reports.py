from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_permission
from app.db.base import get_db
from app.db.models.request import CopyRequest
from app.schemas.report import DashboardMetrics, MonthlyConsolidationItem, UnitRankingItem

router = APIRouter(prefix="/api/v1/reports", tags=["reports"])


@router.get("/dashboard", response_model=DashboardMetrics)
async def dashboard(
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("viewDashboard")),
) -> DashboardMetrics:
    result = await db.execute(select(CopyRequest))
    reqs = list(result.scalars().all())
    total_sheets = sum(r.consumed_sheets for r in reqs)

    return DashboardMetrics(
        total_requests=len(reqs),
        total_copies=sum(r.printed_faces for r in reqs),
        pending=sum(1 for r in reqs if r.status in ("Recebido", "Em produção")),
        ready=sum(1 for r in reqs if r.status == "Pronto"),
        delivered=sum(1 for r in reqs if r.status == "Entregue"),
        canceled=sum(1 for r in reqs if r.status == "Cancelado"),
        total_sheets=total_sheets,
        estimated_reams=round((total_sheets / 500) * 10) / 10,
    )


@router.get("/ranking", response_model=list[UnitRankingItem])
async def ranking(
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("viewDashboard")),
) -> list[UnitRankingItem]:
    result = await db.execute(select(CopyRequest))
    grouped: dict[str, UnitRankingItem] = {}
    for r in result.scalars().all():
        item = grouped.setdefault(
            r.unit_id, UnitRankingItem(unit_id=r.unit_id, unit_name=r.unit_name, requests=0, printed_faces=0)
        )
        item.requests += 1
        item.printed_faces += r.printed_faces
    return sorted(grouped.values(), key=lambda i: i.printed_faces, reverse=True)


@router.get("/monthly", response_model=list[MonthlyConsolidationItem])
async def monthly(
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("viewDashboard")),
) -> list[MonthlyConsolidationItem]:
    result = await db.execute(select(CopyRequest))
    grouped: dict[str, MonthlyConsolidationItem] = {}
    for r in result.scalars().all():
        month = r.requested_at[:7]
        item = grouped.setdefault(
            month, MonthlyConsolidationItem(month=month, requests=0, printed_faces=0, consumed_sheets=0)
        )
        item.requests += 1
        item.printed_faces += r.printed_faces
        item.consumed_sheets += r.consumed_sheets
    return sorted(grouped.values(), key=lambda i: i.month)
