from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_permission
from app.db.base import get_db
from app.db.models.audit import AuditLog
from app.schemas.audit import AuditLogOut

router = APIRouter(prefix="/api/v1/audit-log", tags=["audit"])

RETENTION_DAYS = 60


async def purge_expired(db: AsyncSession) -> None:
    cutoff = datetime.now(timezone.utc) - timedelta(days=RETENTION_DAYS)
    await db.execute(delete(AuditLog).where(AuditLog.created_at < cutoff))
    await db.commit()


@router.get("", response_model=list[AuditLogOut])
async def list_audit_log(
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("manageAudit")),
) -> list[AuditLog]:
    await purge_expired(db)
    result = await db.execute(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(500))
    return list(result.scalars().all())


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def clear_audit_log(
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("manageAudit")),
) -> None:
    await db.execute(delete(AuditLog))
    await db.commit()
