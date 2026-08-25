from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.core.version import APPLICATION_VERSION, GIT_SHA
from app.db.base import get_db

router = APIRouter(prefix="/api/v1/system", tags=["system"])


@router.get("/version")
async def system_version(
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> dict[str, str]:
    result = await db.execute(text("SELECT version_num FROM alembic_version ORDER BY version_num"))
    revisions = result.scalars().all()
    database_revision = ", ".join(revisions) if revisions else "não disponível"
    return {
        "application_version": APPLICATION_VERSION,
        "git_sha": GIT_SHA,
        "database_revision": database_revision,
    }
