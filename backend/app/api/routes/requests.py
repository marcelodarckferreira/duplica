from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.audit import record_audit
from app.core.deps import get_current_user, require_permission
from app.core.request_rules import calculate_print_totals, generate_request_code, today_iso
from app.db.base import get_db
from app.db.models.request import CopyRequest, StatusHistoryEntry
from app.db.models.unit import Unit
from app.db.models.user import User
from app.schemas.request import CopyRequestOut, RequestDraft, RequestUpdate, StatusUpdate

router = APIRouter(prefix="/api/v1/requests", tags=["requests"])


async def _get_request_or_404(db: AsyncSession, request_id: str) -> CopyRequest:
    result = await db.execute(
        select(CopyRequest).options(selectinload(CopyRequest.history)).where(CopyRequest.id == request_id)
    )
    request = result.scalar_one_or_none()
    if request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Solicitação não encontrada.")
    return request


@router.get("", response_model=list[CopyRequestOut])
async def list_requests(
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> list[CopyRequest]:
    result = await db.execute(
        select(CopyRequest).options(selectinload(CopyRequest.history)).order_by(CopyRequest.requested_at.desc())
    )
    return list(result.scalars().all())


@router.post("", response_model=CopyRequestOut)
async def create_request(
    payload: RequestDraft,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("createRequests")),
) -> CopyRequest:
    unit = await db.get(Unit, payload.unit_id)
    if unit is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unidade não encontrada.")

    result = await db.execute(select(CopyRequest.code))
    existing_codes = [row[0] for row in result.all()]
    code = generate_request_code(existing_codes, 2026)
    printed_faces, consumed_sheets = calculate_print_totals(payload.pages, payload.copies, payload.duplex)
    date_ = today_iso()

    request = CopyRequest(
        id=f"req-{uuid4()}",
        code=code,
        origin=payload.origin,
        unit_id=unit.id,
        unit_name=unit.name,
        requester=payload.requester,
        contact=payload.contact,
        document_description=payload.document_description,
        pages=payload.pages,
        copies=payload.copies,
        duplex=payload.duplex,
        printed_faces=printed_faces,
        consumed_sheets=consumed_sheets,
        paper=payload.paper,
        color_mode=payload.color_mode,
        priority=payload.priority,
        desired_deadline=payload.desired_deadline,
        status="Recebido",
        production_owner=payload.production_owner,
        requested_at=date_,
        produced_at="",
        delivered_at="",
        picked_up_by="",
        notes=payload.notes,
        history=[StatusHistoryEntry(status="Recebido", date=date_, by=payload.production_owner or "Sistema")],
    )
    db.add(request)
    record_audit(db, "create", request, user, detail=f"Solicitação criada por {user.name}.")
    await db.commit()
    await db.refresh(request, attribute_names=["history"])
    return request


@router.put("/{request_id}", response_model=CopyRequestOut)
async def update_request(
    request_id: str,
    payload: RequestUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("editRequests")),
) -> CopyRequest:
    request = await _get_request_or_404(db, request_id)

    unit = None
    if payload.unit_id:
        unit = await db.get(Unit, payload.unit_id)
    elif payload.unit_id is None:
        unit = await db.get(Unit, request.unit_id)

    patch = payload.model_dump(exclude_unset=True, exclude={"pages", "copies", "duplex"})
    for field, value in patch.items():
        setattr(request, field, value)

    if unit is not None:
        request.unit_id = unit.id
        request.unit_name = unit.name

    pages = payload.pages if payload.pages is not None else request.pages
    copies = payload.copies if payload.copies is not None else request.copies
    duplex = payload.duplex if payload.duplex is not None else request.duplex
    request.pages, request.copies, request.duplex = pages, copies, duplex
    request.printed_faces, request.consumed_sheets = calculate_print_totals(pages, copies, duplex)

    record_audit(db, "update", request, user, detail=f"Solicitação editada por {user.name}.")
    await db.commit()
    await db.refresh(request, attribute_names=["history"])
    return request


@router.delete("/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_request(
    request_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("editRequests")),
) -> None:
    request = await _get_request_or_404(db, request_id)
    record_audit(db, "delete", request, user, detail=f"Solicitação {request.code} excluída por {user.name}.")
    await db.delete(request)
    await db.commit()


@router.patch("/{request_id}/status", response_model=CopyRequestOut)
async def update_status(
    request_id: str,
    payload: StatusUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("updateProduction")),
) -> CopyRequest:
    request = await _get_request_or_404(db, request_id)
    date_ = today_iso()

    request.status = payload.status
    if payload.status in ("Pronto", "Entregue") and not request.produced_at:
        request.produced_at = date_
    if payload.status == "Entregue":
        request.delivered_at = date_
        request.picked_up_by = payload.picked_up_by or request.picked_up_by or user.name

    request.history.append(StatusHistoryEntry(status=payload.status, date=date_, by=user.name))

    record_audit(
        db, "status_change", request, user,
        detail=f"Status alterado para \"{payload.status}\" por {user.name}.",
    )
    await db.commit()
    await db.refresh(request, attribute_names=["history"])
    return request
