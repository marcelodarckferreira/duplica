from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, require_permission
from app.core.slug import generate_unit_code, generate_unit_id
from app.db.base import get_db
from app.db.models.request import CopyRequest
from app.db.models.unit import Unit
from app.db.models.user import User
from app.schemas.unit import UnitOut, UnitSave, UnitToggleActive

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
        result = await db.execute(select(Unit.code))
        existing_codes = [row[0] for row in result.all()]
        unit = Unit(id=unit_id, active=True, code=generate_unit_code(payload.origin, existing_codes))
        db.add(unit)

    unit.name = payload.name
    unit.origin = payload.origin
    unit.contact = payload.contact

    await db.commit()
    await db.refresh(unit)
    return unit


@router.patch("/{unit_id}/active", response_model=UnitOut)
async def toggle_unit_active(
    unit_id: str,
    payload: UnitToggleActive,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("manageUnits")),
) -> Unit:
    unit = await db.get(Unit, unit_id)
    if unit is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Local não encontrado.")

    unit.active = payload.active
    await db.commit()
    await db.refresh(unit)
    return unit


@router.delete("/{unit_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_unit(
    unit_id: str,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("manageUnits")),
) -> None:
    unit = await db.get(Unit, unit_id)
    if unit is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Local não encontrado.")

    result = await db.execute(select(CopyRequest.id).where(CopyRequest.unit_id == unit_id).limit(1))
    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este local possui solicitações vinculadas e não pode ser excluído. Desative-o em vez disso.",
        )

    await db.delete(unit)
    await db.commit()
