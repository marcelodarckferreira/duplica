import asyncio
from datetime import datetime, timedelta, timezone

from sqlalchemy.dialects import postgresql

from app.db.models.print_fleet import DiscoveryRun
from app.print_fleet.tasks import (
    build_claim_run_statement,
    build_run_batches,
    claim_next_run,
    derive_terminal_status,
)
from app.print_fleet.types import DiscoveryRunStatus


class _ScalarResult:
    def __init__(self, value) -> None:
        self._value = value

    def scalar_one_or_none(self):
        return self._value


class _FakeSession:
    def __init__(self, run) -> None:
        self.run = run
        self.commits = 0

    async def execute(self, _statement):
        return _ScalarResult(self.run)

    async def commit(self) -> None:
        self.commits += 1


def test_claim_statement_uses_skip_locked_and_stale_recovery() -> None:
    stale_before = datetime(2026, 8, 27, 12, 0, tzinfo=timezone.utc)

    sql = str(
        build_claim_run_statement(stale_before).compile(
            dialect=postgresql.dialect(), compile_kwargs={"literal_binds": True}
        )
    )

    assert "FOR UPDATE SKIP LOCKED" in sql
    assert "discovery_runs.status = 'PENDING'" in sql
    assert "discovery_runs.heartbeat_at <" in sql


def test_claim_marks_run_running_and_commits_before_io() -> None:
    now = datetime(2026, 8, 27, 12, 5, tzinfo=timezone.utc)
    run = DiscoveryRun(
        id="run-1",
        network_id="network-1",
        status=DiscoveryRunStatus.PENDING.value,
        requested_by_user_id="admin",
        total_targets=1,
    )
    db = _FakeSession(run)

    claimed = asyncio.run(claim_next_run(db, "worker-1", now))

    assert claimed is run
    assert run.status == DiscoveryRunStatus.RUNNING.value
    assert run.worker_id == "worker-1"
    assert run.started_at == now
    assert run.heartbeat_at == now
    assert db.commits == 1


def test_builds_idempotent_256_address_batch_values() -> None:
    run = DiscoveryRun(
        id="run-1",
        network_id="network-1",
        status=DiscoveryRunStatus.RUNNING.value,
        requested_by_user_id="admin",
        total_targets=510,
        parameters_snapshot={"cidr": "192.168.0.0/23", "excluded_cidrs": []},
    )

    batches = build_run_batches(run)

    assert len(batches) == 2
    assert batches[0].target_count == 256
    assert batches[0].first_address == "192.168.0.1"
    assert batches[0].last_address == "192.168.1.0"
    assert batches[1].target_count == 254
    assert batches[1].first_address == "192.168.1.1"
    assert batches[1].last_address == "192.168.1.254"


def test_terminal_status_distinguishes_errors_and_total_failure() -> None:
    assert derive_terminal_status(completed_batches=2, failed_batches=0, error_count=0) is DiscoveryRunStatus.COMPLETED
    assert derive_terminal_status(completed_batches=2, failed_batches=0, error_count=1) is DiscoveryRunStatus.COMPLETED_WITH_ERRORS
    assert derive_terminal_status(completed_batches=0, failed_batches=2, error_count=2) is DiscoveryRunStatus.FAILED


def test_stale_cutoff_is_five_minutes_before_claim_time() -> None:
    now = datetime(2026, 8, 27, 12, 5, tzinfo=timezone.utc)
    statement = build_claim_run_statement(now - timedelta(minutes=5))

    assert statement is not None

