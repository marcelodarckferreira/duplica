from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, require_permission
from app.core.slug import generate_unit_id
from app.db.base import get_db
from app.db.models.person import Person
from app.db.models.request import CopyRequest
from app.db.models.user import User
from app.schemas.person import PersonOut, PersonSave, PersonToggleActive

router = APIRouter(prefix="/api/v1/people", tags=["people"])


@router.get("", response_model=list[PersonOut])
async def list_people(
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> list[Person]:
    result = await db.execute(select(Person).order_by(Person.name))
    return list(result.scalars().all())


@router.post("", response_model=PersonOut)
async def save_person(
    payload: PersonSave,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("manageUnits")),
) -> Person:
    person_id = payload.id or generate_unit_id(f"{payload.name}-{payload.unit_id}")
    person = await db.get(Person, person_id)
    if person is None:
        person = Person(id=person_id, active=True)
        db.add(person)

    person.name = payload.name
    person.registration_number = payload.registration_number
    person.phone = payload.phone
    person.unit_id = payload.unit_id

    await db.commit()
    await db.refresh(person)
    return person


@router.patch("/{person_id}/active", response_model=PersonOut)
async def toggle_person_active(
    person_id: str,
    payload: PersonToggleActive,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("manageUnits")),
) -> Person:
    person = await db.get(Person, person_id)
    if person is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pessoa não encontrada.")

    person.active = payload.active
    await db.commit()
    await db.refresh(person)
    return person


@router.delete("/{person_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_person(
    person_id: str,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("manageUnits")),
) -> None:
    person = await db.get(Person, person_id)
    if person is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pessoa não encontrada.")

    result = await db.execute(select(CopyRequest.id).where(CopyRequest.requester == person.name).limit(1))
    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta pessoa possui solicitações vinculadas e não pode ser excluída. Desative-a em vez disso.",
        )

    await db.delete(person)
    await db.commit()
