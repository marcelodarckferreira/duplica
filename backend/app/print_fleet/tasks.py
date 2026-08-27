from datetime import datetime, timedelta, timezone

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.print_fleet import DiscoveryRun, DiscoveryRunBatch
from app.print_fleet.networking import iter_host_batches, normalize_network
from app.print_fleet.types import BatchStatus, DiscoveryRunStatus


STALE_AFTER = timedelta(minutes=5)


def build_claim_run_statement(stale_before: datetime, worker_id: str):
    return (
        select(DiscoveryRun)
        .where(
            or_(
                DiscoveryRun.status == DiscoveryRunStatus.PENDING.value,
                (
                    (DiscoveryRun.status == DiscoveryRunStatus.RUNNING.value)
                    & (DiscoveryRun.worker_id == worker_id)
                ),
                (
                    (DiscoveryRun.status == DiscoveryRunStatus.RUNNING.value)
                    & (DiscoveryRun.heartbeat_at < stale_before)
                ),
            )
        )
        .order_by(DiscoveryRun.requested_at)
        .limit(1)
        .with_for_update(skip_locked=True)
    )


async def claim_next_run(
    db: AsyncSession,
    worker_id: str,
    now: datetime | None = None,
) -> DiscoveryRun | None:
    claimed_at = now or datetime.now(timezone.utc)
    result = await db.execute(build_claim_run_statement(claimed_at - STALE_AFTER, worker_id))
    run = result.scalar_one_or_none()
    if run is None:
        return None
    run.status = DiscoveryRunStatus.RUNNING.value
    run.worker_id = worker_id
    run.started_at = run.started_at or claimed_at
    run.heartbeat_at = claimed_at
    await db.commit()
    return run


def build_run_batches(run: DiscoveryRun) -> list[DiscoveryRunBatch]:
    normalized = normalize_network(
        run.parameters_snapshot["cidr"],
        run.parameters_snapshot.get("excluded_cidrs", []),
    )
    return [
        DiscoveryRunBatch(
            run_id=run.id,
            first_address=batch.first_address,
            last_address=batch.last_address,
            status=BatchStatus.PENDING.value,
            target_count=len(batch.addresses),
            scanned_count=0,
            responsive_count=0,
            printer_count=0,
            error_count=0,
            attempts=0,
        )
        for batch in iter_host_batches(normalized, batch_size=256)
    ]


async def prepare_run_batches(db: AsyncSession, run: DiscoveryRun) -> None:
    existing = (
        await db.execute(
            select(func.count()).select_from(DiscoveryRunBatch).where(DiscoveryRunBatch.run_id == run.id)
        )
    ).scalar_one()
    if existing:
        return
    db.add_all(build_run_batches(run))
    await db.commit()


async def claim_next_batch(
    db: AsyncSession,
    run_id: str,
    now: datetime | None = None,
) -> DiscoveryRunBatch | None:
    claimed_at = now or datetime.now(timezone.utc)
    result = await db.execute(
        select(DiscoveryRunBatch)
        .where(
            DiscoveryRunBatch.run_id == run_id,
            DiscoveryRunBatch.status == BatchStatus.PENDING.value,
        )
        .order_by(DiscoveryRunBatch.first_address)
        .limit(1)
        .with_for_update(skip_locked=True)
    )
    batch = result.scalar_one_or_none()
    if batch is None:
        return None
    batch.status = BatchStatus.RUNNING.value
    batch.started_at = claimed_at
    batch.attempts += 1
    await db.commit()
    return batch


async def heartbeat_run(
    db: AsyncSession, run: DiscoveryRun, now: datetime | None = None
) -> None:
    run.heartbeat_at = now or datetime.now(timezone.utc)
    await db.commit()


def derive_terminal_status(
    *, completed_batches: int, failed_batches: int, error_count: int
) -> DiscoveryRunStatus:
    if completed_batches == 0 and failed_batches > 0:
        return DiscoveryRunStatus.FAILED
    if failed_batches > 0 or error_count > 0:
        return DiscoveryRunStatus.COMPLETED_WITH_ERRORS
    return DiscoveryRunStatus.COMPLETED


async def finalize_run_if_finished(
    db: AsyncSession,
    run: DiscoveryRun,
    now: datetime | None = None,
) -> bool:
    rows = (
        await db.execute(
            select(DiscoveryRunBatch.status, func.count())
            .where(DiscoveryRunBatch.run_id == run.id)
            .group_by(DiscoveryRunBatch.status)
        )
    ).all()
    counts = {status: count for status, count in rows}
    if counts.get(BatchStatus.PENDING.value, 0) or counts.get(BatchStatus.RUNNING.value, 0):
        return False
    run.status = derive_terminal_status(
        completed_batches=counts.get(BatchStatus.COMPLETED.value, 0),
        failed_batches=counts.get(BatchStatus.FAILED.value, 0),
        error_count=run.error_count,
    ).value
    run.finished_at = now or datetime.now(timezone.utc)
    run.heartbeat_at = run.finished_at
    await db.commit()
    return True
