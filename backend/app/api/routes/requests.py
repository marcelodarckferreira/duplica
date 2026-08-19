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
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Local não encontrado.")

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
        registration_number=payload.registration_number,
        contact=payload.contact,
        document_description=payload.document_description,
        pages=payload.pages,
        copies=payload.copies,
        duplex=payload.duplex,
        staple=payload.staple,
        layout=payload.layout,
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
        signature="",
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


STATUS_ORDER = ["Recebido", "Em produção", "Pronto", "Entregue"]
# Ordem natural completa (inclui Cancelado), usada só pra recalcular a fase
# atual depois de excluir uma entrada do histórico — não pra validar a
# progressão de fases, onde Cancelado continua sendo tratado à parte (ver
# STATUS_ORDER acima e a validação em update_status).
NATURAL_STATUS_ORDER = STATUS_ORDER + ["Cancelado"]


@router.patch("/{request_id}/status", response_model=CopyRequestOut)
async def update_status(
    request_id: str,
    payload: StatusUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("updateProduction")),
) -> CopyRequest:
    request = await _get_request_or_404(db, request_id)
    date_ = today_iso()

    existing_statuses = {entry.status for entry in request.history}

    # Cada fase só pode acontecer uma vez por solicitação, e uma vez cancelada
    # a solicitação não recebe mais nenhuma fase — reflete o fluxo real de
    # produção (não existe "voltar a imprimir" depois de cancelado).
    if payload.status in existing_statuses:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Esta fase já foi registrada para esta solicitação.")
    if "Cancelado" in existing_statuses:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Esta solicitação está cancelada e não pode receber novas fases.")

    if payload.status == "Cancelado":
        if "Entregue" in existing_statuses:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uma solicitação já entregue não pode ser cancelada.")
    else:
        new_index = STATUS_ORDER.index(payload.status)
        recorded_indexes = [STATUS_ORDER.index(item) for item in existing_statuses if item in STATUS_ORDER]
        if recorded_indexes and new_index <= max(recorded_indexes):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A fase precisa seguir a ordem de produção e não pode retroceder.",
            )

    request.status = payload.status
    if payload.status in ("Pronto", "Entregue") and not request.produced_at:
        request.produced_at = date_
    if payload.status == "Entregue":
        request.delivered_at = date_
        request.picked_up_by = payload.picked_up_by or request.picked_up_by or user.name
        request.signature = payload.signature or request.signature

    request.history.append(StatusHistoryEntry(status=payload.status, date=date_, by=user.name))

    record_audit(
        db, "status_change", request, user,
        detail=f"Status alterado para \"{payload.status}\" por {user.name}.",
    )
    await db.commit()
    await db.refresh(request, attribute_names=["history"])
    return request


@router.delete("/{request_id}/history/{entry_id}", response_model=CopyRequestOut)
async def delete_history_entry(
    request_id: str,
    entry_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("updateProduction")),
) -> CopyRequest:
    request = await _get_request_or_404(db, request_id)

    entry = next((item for item in request.history if item.id == entry_id), None)
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entrada do histórico não encontrada.")
    if len(request.history) <= 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A solicitação precisa manter ao menos uma entrada no histórico.",
        )

    request.history.remove(entry)
    await db.delete(entry)

    # A fase atual e os marcos derivados dela (produzido/entregue) precisam
    # refletir a entrada de histórico mais recente que sobrou, não a que foi
    # excluída — senão a linha fica presa numa fase que não existe mais no
    # histórico (ver bug reportado: status mostrava "Pronto" sem entrada
    # correspondente, depois de excluir justamente a entrada de "Pronto").
    remaining_statuses = {item.status for item in request.history}
    ordered_present = [item for item in NATURAL_STATUS_ORDER if item in remaining_statuses]
    if ordered_present:
        request.status = ordered_present[-1]

    if "Pronto" not in remaining_statuses and "Entregue" not in remaining_statuses:
        request.produced_at = ""
    if "Entregue" not in remaining_statuses:
        request.delivered_at = ""
        request.picked_up_by = ""
        request.signature = ""

    record_audit(
        db, "history_delete", request, user,
        detail=f"Entrada de histórico \"{entry.status}\" removida por {user.name}.",
    )
    await db.commit()
    await db.refresh(request, attribute_names=["history"])
    return request
