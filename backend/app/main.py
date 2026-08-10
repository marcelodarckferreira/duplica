from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.routes import audit, auth, reports, requests, units, users
from app.api.routes.audit import purge_expired
from app.api.routes.users import UPLOADS_DIR
from app.core.config import settings
from app.core.limiter import limiter
from app.db.base import AsyncSessionLocal

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


app = FastAPI(title="Duplica API", lifespan=lifespan)
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
app.include_router(users.router)
app.include_router(requests.router)
app.include_router(reports.router)
app.include_router(audit.router)


@app.get("/api/v1/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
