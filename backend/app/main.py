import os
from contextlib import asynccontextmanager
from pathlib import Path

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.routes import audit, auth, people, reports, requests, roles, units, users
from app.api.routes.audit import purge_expired
from app.api.routes.users import UPLOADS_DIR
from app.core.config import settings
from app.core.limiter import limiter
from app.db.base import AsyncSessionLocal

_PROJECT_ROOT = Path(__file__).resolve().parents[2]
_VERSION_FILE = _PROJECT_ROOT / "VERSION"

GIT_SHA = os.environ.get("GIT_SHA", "unknown")
VERSION = _VERSION_FILE.read_text().strip() if _VERSION_FILE.exists() else "0.0.0"
DIST_DIR = _PROJECT_ROOT / "dist"

scheduler = AsyncIOScheduler()


async def _purge_audit_log_job() -> None:
    async with AsyncSessionLocal() as db:
        await purge_expired(db)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    scheduler.add_job(_purge_audit_log_job, "interval", days=1, id="purge_audit_log", replace_existing=True)
    scheduler.start()
    try:
        yield
    finally:
        scheduler.shutdown(wait=False)


app = FastAPI(
    title="Duplica API",
    lifespan=lifespan,
    docs_url="/docs" if settings.ENABLE_DOCS else None,
    redoc_url="/redoc" if settings.ENABLE_DOCS else None,
    openapi_url="/openapi.json" if settings.ENABLE_DOCS else None,
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

app.include_router(auth.router)
app.include_router(units.router)
app.include_router(people.router)
app.include_router(users.router)
app.include_router(requests.router)
app.include_router(reports.router)
app.include_router(audit.router)
app.include_router(roles.router)


@app.get("/api/v1/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "version": VERSION, "git_sha": GIT_SHA}


# Frontend buildado (dist/), servido pela mesma imagem — ver §3.17 do SPEC e
# scripts/build.sh. Sem client-side routing no app (view ativa é estado local,
# não rota), então não precisa de fallback de SPA — só servir dist/ com
# index.html como documento padrão. Montado por último para nunca sombrear
# nenhuma rota de API ou /uploads acima.
if DIST_DIR.is_dir():
    app.mount("/", StaticFiles(directory=DIST_DIR, html=True), name="frontend")
