from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.audit import AuditLog
from app.db.models.request import CopyRequest
from app.db.models.user import User


def record_audit(
    db: AsyncSession,
    action: str,
    request: CopyRequest,
    actor: User,
    detail: str = "",
) -> None:
    db.add(
        AuditLog(
            action=action,
            request_id=request.id,
            request_code=request.code,
            actor_id=actor.id,
            actor_name=actor.name,
            detail=detail,
        )
    )
