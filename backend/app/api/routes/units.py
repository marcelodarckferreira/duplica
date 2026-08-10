from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, require_permission
from app.core.slug import generate_unit_id
from app.db.base import get_db
from app.db.models.unit import Unit
from app.schemas.unit import UnitOut, UnitSave

router = APIRouter(prefix="/api/v1/units", tags=["units"])


@router.get("", response_model=list[UnitOut])
async def list_units(
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> list[Unit]:
    result = await db.execute(select(Unit).order_by(Unit.name))
    return list(result.scalars().all())


@router.post("", response_model=UnitOut)
async def save_unit(
    payload: UnitSave,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("manageUnits")),
) -> Unit:
    unit_id = payload.id or generate_unit_id(payload.name)
    unit = await db.get(Unit, unit_id)
    if unit is None:
        unit = Unit(id=unit_id, active=True)
        db.add(unit)

    unit.name = payload.name
    unit.code = payload.code
    unit.origin = payload.origin
    unit.contact = payload.contact

    await db.commit()
    await db.refresh(unit)
    return unit
