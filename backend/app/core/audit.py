from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.audit import AuditLog
from app.db.models.request import CopyRequest
from app.db.models.user import User


def record_resource_audit(
    db: AsyncSession,
    action: str,
    resource_type: str,
    resource_id: str,
    actor: User,
    detail: str = "",
    *,
    request_id: str | None = None,
    request_code: str | None = None,
) -> None:
    db.add(
        AuditLog(
            action=action,
            request_id=request_id,
            request_code=request_code,
            resource_type=resource_type,
            resource_id=resource_id,
            actor_id=actor.id,
            actor_name=actor.name,
            detail=detail,
        )
    )


def record_audit(
    db: AsyncSession,
    action: str,
    request: CopyRequest,
    actor: User,
    detail: str = "",
) -> None:
    record_resource_audit(
        db,
        action,
        "copy_request",
        request.id,
        actor,
        detail,
        request_id=request.id,
        request_code=request.code,
    )
