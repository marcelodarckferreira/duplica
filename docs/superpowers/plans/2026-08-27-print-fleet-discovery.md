# Print Fleet Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a production-ready Duplica module that registers headquarters printers by sector, discovers printers on configured SNMP v2c networks, and monitors supply levels through a separate durable worker.

**Architecture:** Keep the existing React/FastAPI/PostgreSQL application as the control plane and add a focused `app.print_fleet` package plus a second process from the same image for network work. Store discovery jobs and progress in PostgreSQL, keep SNMP behind an injectable transport, and expose the feature through the existing JWT/RBAC/audit boundaries.

**Tech Stack:** React 19, TypeScript strict, TanStack Query 5, React Hook Form, Zod, Radix UI, Tailwind CSS, Vitest, Playwright, FastAPI, SQLAlchemy 2 asyncio, Alembic, PostgreSQL 16, Fernet encryption, PySNMP asyncio, pytest.

**Spec:** `docs/superpowers/specs/2026-08-27-print-fleet-discovery-design.md`

## Global Constraints

- Preserve all pre-existing working-tree changes and treat `sources/` as read-only.
- Limit physical locations to active `units` with `origin = "SEDE"`.
- Support SNMP v2c only; never perform SNMP `SET`.
- Never return, log, audit, or persist an SNMP community in plaintext.
- Use PostgreSQL as the durable queue; do not add Redis.
- Keep discovery out of HTTP request handlers.
- Use batch size 256, concurrency 64, timeout 1,000 ms, and zero discovery retries by default.
- Poll every 15 minutes and mark `NO_COMMUNICATION` after three consecutive failures.
- Warn at 20%, mark critical at 10%, and never turn unknown raw levels into zero.
- Keep UI copy in pt-BR and follow the existing feature-first frontend and `DESIGN.md`.
- Do not add printing, PDF, quotas, LDAP, routing, notifications, traps, or SNMP v3.
- Automated tests use a fake SNMP transport and never scan a real network.

---

### Task 1: Add pure domain rules with tests

**Files:**
- Create: `backend/app/print_fleet/__init__.py`
- Create: `backend/app/print_fleet/types.py`
- Create: `backend/app/print_fleet/networking.py`
- Create: `backend/app/print_fleet/supplies.py`
- Create: `backend/tests/test_print_fleet_networking.py`
- Create: `backend/tests/test_print_fleet_supplies.py`

**Interfaces:**
- Produces `normalize_network(cidr: str, exclusions: list[str]) -> NormalizedNetwork`.
- Produces `iter_host_batches(network: NormalizedNetwork, batch_size: int = 256) -> Iterator[HostBatch]`.
- Produces `calculate_supply_percent(level_raw: int, capacity_raw: int) -> int | None`.
- Produces `classify_supply_alert(percent: int | None, warning: int = 20, critical: int = 10) -> SupplyAlert`.

- [ ] **Step 1: Write failing network tests**

Cover canonical CIDR, exclusions inside/outside the range, network/broadcast removal, deterministic batching and lazy handling of a `/16`:

```python
def test_exclusion_must_be_inside_network():
    with pytest.raises(ValueError, match="fora da rede"):
        normalize_network("172.16.0.0/24", ["172.16.1.10"])

def test_batches_apply_exclusions():
    value = normalize_network("172.16.0.0/29", ["172.16.0.2", "172.16.0.4/31"])
    assert flatten(iter_host_batches(value, 2)) == ["172.16.0.1", "172.16.0.3", "172.16.0.6"]
```

- [ ] **Step 2: Run the tests and confirm import failure**

Run: `cd backend && PYTHONPATH=. .venv/bin/pytest tests/test_print_fleet_networking.py -q`.

- [ ] **Step 3: Implement immutable network values**

Use `ipaddress` and frozen dataclasses `NormalizedNetwork` and `HostBatch`. Yield host strings without materializing the full range.

- [ ] **Step 4: Write failing supply tests**

Cover negative Printer-MIB sentinels, invalid capacity, clamping above 100%, rounding, exact 20/10 boundaries and invalid threshold ordering.

- [ ] **Step 5: Implement enums and supply rules**

Define string enums for run, batch, onboarding, operational, supply type, color and alert states. Validate `0 <= critical < warning <= 100`.

- [ ] **Step 6: Run focused tests and commit**

```bash
cd backend && PYTHONPATH=. .venv/bin/pytest tests/test_print_fleet_networking.py tests/test_print_fleet_supplies.py -q
git add backend/app/print_fleet backend/tests/test_print_fleet_networking.py backend/tests/test_print_fleet_supplies.py
git commit -m "feat: add print fleet domain rules"
```

---

### Task 2: Persist the print-fleet domain and permissions

**Files:**
- Create: `backend/app/db/models/print_fleet.py`
- Modify: `backend/app/db/models/__init__.py`
- Modify: `backend/app/db/models/audit.py`
- Modify: `backend/app/core/audit.py`
- Modify: `backend/app/core/permissions.py`
- Modify: `backend/app/schemas/audit.py`
- Create: `docs/version/v01/15_f2a8c4e1d9b7_add_print_fleet.py`
- Modify: `docs/version/DATABASE_UPDATES.md`
- Create: `backend/tests/test_print_fleet_models.py`

**Interfaces:**
- Produces `DiscoveryNetwork`, `DiscoveryRun`, `DiscoveryRunBatch`, `DiscoveryEvent`, `Printer`, `PrinterSupply` and `SupplyReading` models.
- Produces `record_resource_audit(...)` while retaining request-specific `record_audit(...)`.
- Produces `viewPrintFleet` and `managePrintFleet` permissions.

- [ ] **Step 1: Write failing metadata tests**

Assert table names, foreign keys, enum values, unique `printer_id + snmp_index`, indexes, and generalized audit columns.

- [ ] **Step 2: Run the metadata test and verify import failure**

Run: `cd backend && PYTHONPATH=. .venv/bin/pytest tests/test_print_fleet_models.py -q`.

- [ ] **Step 3: Implement focused SQLAlchemy models**

Use PostgreSQL `INET` for addresses and `JSONB` for normalized error arrays and non-secret run parameters. Keep relationships narrow and use explicit service queries.

- [ ] **Step 4: Generalize audit safely**

Make legacy request fields nullable and add `resource_type` and `resource_id`. Preserve:

```python
def record_audit(db, action, request, actor, detail=""):
    record_resource_audit(
        db, action, "copy_request", request.id, actor, detail,
        request_id=request.id, request_code=request.code,
    )
```

- [ ] **Step 5: Write reversible migration 15**

Create all seven tables and indexes, backfill old audit rows, and grant both permissions only to Admin. Downgrade in reverse dependency order.

- [ ] **Step 6: Register models and permissions**

Add imports to `models/__init__.py` and both permissions to `ALL_PERMISSIONS` and Admin defaults.

- [ ] **Step 7: Verify tests and Alembic head**

```bash
cd backend && PYTHONPATH=. .venv/bin/pytest tests/test_print_fleet_models.py -q
cd backend && PYTHONPATH=. .venv/bin/alembic heads
```

Expected: one head, `f2a8c4e1d9b7`.

- [ ] **Step 8: Update migration documentation and commit**

```bash
git add backend/app/db backend/app/core/audit.py backend/app/core/permissions.py backend/app/schemas/audit.py backend/tests/test_print_fleet_models.py docs/version
git commit -m "feat: persist print fleet inventory"
```

---

### Task 3: Secure credentials and expose validated schemas

**Files:**
- Modify: `backend/app/core/config.py`
- Create: `backend/app/print_fleet/credentials.py`
- Create: `backend/app/schemas/print_fleet.py`
- Modify: `backend/requirements.txt`
- Create: `backend/tests/test_print_fleet_credentials.py`
- Create: `backend/tests/test_print_fleet_schemas.py`

**Interfaces:**
- Produces `SnmpCredentialCipher.encrypt(community: str) -> str` and `decrypt(ciphertext: str) -> str`.
- Produces request/response schemas with `credential_configured` and no secret output field.
- Consumes optional `SNMP_CREDENTIAL_ENCRYPTION_KEY` with no known default.

- [ ] **Step 1: Write failing credential and schema tests**

Verify randomized ciphertext, round-trip, wrong-key errors without secret content, empty community rejection, CIDR normalization, exclusion containment, bounds, thresholds and secret-free serialization.

- [ ] **Step 2: Run tests and confirm the red state**

Run: `cd backend && PYTHONPATH=. .venv/bin/pytest tests/test_print_fleet_credentials.py tests/test_print_fleet_schemas.py -q`.

- [ ] **Step 3: Add direct cryptography and PySNMP dependencies**

Pin compatible releases after checking the official PySNMP asyncio API used by the adapter.

- [ ] **Step 4: Implement Fernet protection**

Derive a Fernet key with SHA-256 and URL-safe base64. Raise stable `CredentialConfigurationError` and `CredentialDecryptionError` messages without including supplied values.

- [ ] **Step 5: Implement Pydantic contracts**

Validate concurrency 1–128, timeout 250–10,000 ms, retries 0–3, thresholds and manual printer containment at the service boundary.

- [ ] **Step 6: Run tests and commit**

```bash
cd backend && PYTHONPATH=. .venv/bin/pytest tests/test_print_fleet_credentials.py tests/test_print_fleet_schemas.py -q
git add backend/app/core/config.py backend/app/print_fleet/credentials.py backend/app/schemas/print_fleet.py backend/requirements.txt backend/tests/test_print_fleet_credentials.py backend/tests/test_print_fleet_schemas.py
git commit -m "feat: secure print fleet settings"
```

---

### Task 4: Add management APIs and audit integration

**Files:**
- Create: `backend/app/print_fleet/service.py`
- Create: `backend/app/api/routes/print_fleet.py`
- Modify: `backend/app/api/routes/__init__.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_print_fleet_service.py`
- Create: `backend/tests/test_print_fleet_api.py`

**Interfaces:**
- Produces all endpoints under `/api/v1/print-fleet` from design section 8.
- Produces pages as `{items, total, page, page_size}`.
- Produces HTTP 202 for a persisted discovery request.
- Requires active `SEDE` unit for confirmation and a selected network for manual registration.

- [ ] **Step 1: Write failing service tests**

Cover network secret redaction, duplicate active run, manual address containment, school/inactive sector rejection, confirmation, ignore/reopen, monitoring toggle, filters and audit detail.

- [ ] **Step 2: Implement transactional service methods**

Keep transactions short. Record the administrative mutation and its resource audit atomically. Translate integrity races to stable conflicts.

- [ ] **Step 3: Write failing route contract tests**

Override auth and DB dependencies. Assert 401, 403, read versus manage access, validation, pagination and secret-free JSON.

- [ ] **Step 4: Implement and register thin routes**

Use exact design endpoints. Read endpoints accept either fleet permission; mutations require `managePrintFleet`.

- [ ] **Step 5: Run tests and commit**

```bash
cd backend && PYTHONPATH=. .venv/bin/pytest tests/test_print_fleet_service.py tests/test_print_fleet_api.py -q
git add backend/app/print_fleet/service.py backend/app/api/routes/print_fleet.py backend/app/api/routes/__init__.py backend/app/main.py backend/tests/test_print_fleet_service.py backend/tests/test_print_fleet_api.py
git commit -m "feat: expose print fleet management API"
```

---

### Task 5: Build the durable worker state machine

**Files:**
- Create: `backend/app/print_fleet/tasks.py`
- Create: `backend/app/print_fleet/worker.py`
- Create: `backend/tests/test_print_fleet_tasks.py`
- Create: `backend/tests/test_print_fleet_worker.py`

**Interfaces:**
- Produces `claim_next_run(db, worker_id, now) -> DiscoveryRun | None` using `FOR UPDATE SKIP LOCKED`.
- Produces batch preparation, claim, heartbeat, completion and five-minute recovery operations.
- Produces CLI `python -m app.print_fleet.worker`.

- [ ] **Step 1: Write failing state-machine tests**

Test one claimant, stale recovery, 256-host batches, idempotent preparation, counters, terminal states and graceful stop.

- [ ] **Step 2: Run tests and confirm red**

Run: `cd backend && PYTHONPATH=. .venv/bin/pytest tests/test_print_fleet_tasks.py tests/test_print_fleet_worker.py -q`.

- [ ] **Step 3: Implement small-transaction claims**

Commit a claim before I/O. Mark a batch complete only after its printer/event persistence commits. Return stale in-progress batches to pending.

- [ ] **Step 4: Implement graceful lifecycle**

Handle SIGTERM/SIGINT, bounded idle waits and engine disposal. Do not busy-poll.

- [ ] **Step 5: Run tests and commit**

```bash
cd backend && PYTHONPATH=. .venv/bin/pytest tests/test_print_fleet_tasks.py tests/test_print_fleet_worker.py -q
git add backend/app/print_fleet/tasks.py backend/app/print_fleet/worker.py backend/tests/test_print_fleet_tasks.py backend/tests/test_print_fleet_worker.py
git commit -m "feat: add durable print fleet worker"
```

---

### Task 6: Discover printers through an injectable SNMP adapter

**Files:**
- Create: `backend/app/print_fleet/snmp.py`
- Create: `backend/app/print_fleet/discovery.py`
- Create: `backend/app/print_fleet/vendors.py`
- Create: `backend/tests/test_print_fleet_snmp.py`
- Create: `backend/tests/test_print_fleet_discovery.py`
- Modify: `backend/app/print_fleet/worker.py`

**Interfaces:**
- Produces async `SnmpTransport.get(...)` and `walk(...)` protocol.
- Produces `DeviceSnapshot`, `DiscoveredPrinter` and `BatchDiscoveryResult`.
- Plaintext community exists only in worker memory for the current operation.

- [ ] **Step 1: Write failing parser tests from deterministic varbind fixtures**

Cover HP, Epson, non-printers, missing optional identity, varying OID suffixes, error bit strings, timeout and malformed values.

- [ ] **Step 2: Run tests and confirm red**

Run: `cd backend && PYTHONPATH=. .venv/bin/pytest tests/test_print_fleet_snmp.py tests/test_print_fleet_discovery.py -q`.

- [ ] **Step 3: Implement the PySNMP asyncio adapter**

Use read-only GET/WALK, close transports, map exceptions to stable codes and never log community or complete binary replies.

- [ ] **Step 4: Implement bounded discovery**

Use `asyncio.Semaphore`, probe identity first, walk printer tables only for candidates, and avoid ping and port 9100.

- [ ] **Step 5: Implement idempotent persistence**

Match prior identity, reliable serial, MAC, then network/address. Create new devices as pending and record conflicting identities without merging.

- [ ] **Step 6: Connect batches to the worker**

Decrypt once per run, process one batch at a time, update counters/heartbeat, and sanitize errors.

- [ ] **Step 7: Run tests and commit**

```bash
cd backend && PYTHONPATH=. .venv/bin/pytest tests/test_print_fleet_snmp.py tests/test_print_fleet_discovery.py tests/test_print_fleet_worker.py -q
git add backend/app/print_fleet backend/tests/test_print_fleet_snmp.py backend/tests/test_print_fleet_discovery.py backend/tests/test_print_fleet_worker.py
git commit -m "feat: discover printers over SNMP"
```

---

### Task 7: Monitor status and supplies periodically

**Files:**
- Create: `backend/app/print_fleet/monitoring.py`
- Modify: `backend/app/print_fleet/snmp.py`
- Modify: `backend/app/print_fleet/worker.py`
- Create: `backend/tests/test_print_fleet_monitoring.py`

**Interfaces:**
- Produces `poll_due_printers(db, transport, now, limit) -> PollSummary`.
- Produces `parse_supply_rows(varbinds) -> list[SupplySnapshot]` joined by full OID suffix.

- [ ] **Step 1: Write failing monitoring tests**

Cover due selection, one retry, recovery, three failures, negative raw levels, supply upsert, disappeared-supply grace, reading on change, 24-hour heartbeat and 12-month retention.

- [ ] **Step 2: Run test and confirm red**

Run: `cd backend && PYTHONPATH=. .venv/bin/pytest tests/test_print_fleet_monitoring.py -q`.

- [ ] **Step 3: Implement Printer-MIB parsing and persistence**

Join all supply columns by complete index, preserve raw values, normalize separately, and commit one printer poll at a time.

- [ ] **Step 4: Schedule polling and retention**

Interleave due polls with discovery work. Run cleanup once daily under a PostgreSQL advisory lock.

- [ ] **Step 5: Run tests and commit**

```bash
cd backend && PYTHONPATH=. .venv/bin/pytest tests/test_print_fleet_monitoring.py tests/test_print_fleet_worker.py -q
git add backend/app/print_fleet backend/tests/test_print_fleet_monitoring.py backend/tests/test_print_fleet_worker.py
git commit -m "feat: monitor printer supplies"
```

---

### Task 8: Add frontend contracts and data access

**Files:**
- Create: `src/features/print-fleet/model/types.ts`
- Create: `src/features/print-fleet/model/rules.ts`
- Create: `src/features/print-fleet/model/rules.test.ts`
- Create: `src/features/print-fleet/schemas/schema.ts`
- Create: `src/features/print-fleet/api/repository.ts`
- Create: `src/features/print-fleet/api/repository.test.ts`
- Create: `src/features/print-fleet/model/queries.ts`
- Modify: `src/features/users/model/types.ts`
- Modify: `src/features/users/model/rules.ts`
- Modify: `src/features/users/ui/AccessProfilesView.tsx`
- Modify: `src/shared/testing/mockApi.ts`

**Interfaces:**
- Produces camelCase fleet types, repository, query keys and hooks.
- Adds `viewPrintFleet | managePrintFleet` to `Permission`.

- [ ] **Step 1: Write failing rule, schema and repository tests**

Cover labels, progress, alert ordering, form validation, snake/camel mapping, methods, filters, pagination and mutation bodies.

- [ ] **Step 2: Run tests and confirm red**

Run: `npm test -- src/features/print-fleet/model/rules.test.ts src/features/print-fleet/api/repository.test.ts`.

- [ ] **Step 3: Implement contracts and repository**

Keep formatting in pure rules and HTTP mapping in the repository. Views never call `fetch`.

- [ ] **Step 4: Implement targeted TanStack Query invalidation**

Use keys for networks, runs, printers, detail and supplies. Start discovery invalidates runs; confirmation invalidates pending and confirmed lists.

- [ ] **Step 5: Extend permission labels/defaults and mock API**

Admin receives both defaults; other profiles keep their existing defaults.

- [ ] **Step 6: Run tests and commit**

```bash
npm test -- src/features/print-fleet src/features/users/model/rules.test.ts
git add src/features/print-fleet src/features/users src/shared/testing/mockApi.ts
git commit -m "feat: add print fleet frontend contracts"
```

---

### Task 9: Build the management interface

**Files:**
- Create: `src/features/print-fleet/ui/PrintFleetView.tsx`
- Create: `src/features/print-fleet/ui/PrintersPanel.tsx`
- Create: `src/features/print-fleet/ui/DiscoveryPanel.tsx`
- Create: `src/features/print-fleet/ui/NetworksPanel.tsx`
- Create: `src/features/print-fleet/ui/PrinterDetails.tsx`
- Create: `src/features/print-fleet/ui/PrintFleetView.test.tsx`
- Modify: `src/app/Sidebar.tsx`
- Modify: `src/app/AppShell.tsx`
- Modify: `src/app/AppShell.test.tsx`

**Interfaces:**
- Produces sidebar view `printFleet` and tabs `Impressoras`, `Descoberta` and `Redes`.
- Consumes active headquarters units and live permissions.

- [ ] **Step 1: Write failing view tests**

Test loading/error/empty, filters, textual supply indicators, unknown values, run progress, large-network confirmation, blank saved secret, sector-required confirmation, read-only controls and keyboard tabs.

- [ ] **Step 2: Run view tests and confirm red**

Run: `npm test -- src/features/print-fleet/ui/PrintFleetView.test.tsx src/app/AppShell.test.tsx`.

- [ ] **Step 3: Implement panels with shared UI**

Reuse existing Card, Button, Badge, Dialog, Input, Select and tokens. Convey state with icon/text/color and retain stale reading timestamps while offline.

- [ ] **Step 4: Integrate AppShell and Sidebar**

Load fleet queries only for the active view, filter sectors to active `SEDE` units, and return to dashboard if a live permission change removes access.

- [ ] **Step 5: Run tests and commit**

```bash
npm test -- src/features/print-fleet/ui/PrintFleetView.test.tsx src/app/AppShell.test.tsx
git add src/features/print-fleet/ui src/app/Sidebar.tsx src/app/AppShell.tsx src/app/AppShell.test.tsx
git commit -m "feat: add print fleet management interface"
```

---

### Task 10: Deploy, document and verify

**Files:**
- Modify: `docker-compose.yml`
- Modify: `.env.example`
- Modify: `Dockerfile`
- Modify: `backend/scripts/e2e_bootstrap.sh`
- Create: `tests/e2e/print-fleet.spec.ts`
- Modify: `README.md`
- Modify: `backend/README.md`
- Modify: `docs/SPEC.md`
- Modify: `docs/version/DATABASE_UPDATES.md`

**Interfaces:**
- Produces Compose service `print_fleet_worker` with no port.
- Produces `PRINT_FLEET_SNMP_TRANSPORT=simulated` only for isolated E2E.
- Produces operator instructions for migration, key, firewall and controlled discovery.

- [ ] **Step 1: Write failing E2E flow**

Test admin network creation, simulated discovery, HP pending review, sector confirmation, supplies, and mutation denial without manage permission.

- [ ] **Step 2: Add worker service and simulated transport switch**

Production defaults to PySNMP. The simulated adapter only activates through the explicit E2E environment. Seed no production network.

- [ ] **Step 3: Update operational documentation**

Document encryption key generation, migration 15, worker lifecycle, UDP 161, warning for `172.15.0.0/16`, controlled first run, v2c risk and troubleshooting without secrets.

- [ ] **Step 4: Run focused E2E**

Run: `npx playwright test tests/e2e/print-fleet.spec.ts tests/e2e/accessibility.spec.ts --project=chromium`.

- [ ] **Step 5: Run complete verification**

```bash
cd backend && PYTHONPATH=. .venv/bin/pytest -q
npm test
npm run build
npm run test:e2e
docker compose config
git diff --check
git status --short
```

Expected: all automated checks pass. Real HP/Epson and full headquarters CIDR homologation remain explicitly pending until performed on the physical network.

- [ ] **Step 6: Verify migration rollback only in `duplica_test`**

Apply head, downgrade to `62ad30878cdf`, and reapply `f2a8c4e1d9b7`. Never downgrade the production `duplica` database.

- [ ] **Step 7: Commit deployment and documentation**

```bash
git add docker-compose.yml .env.example Dockerfile backend/scripts/e2e_bootstrap.sh tests/e2e/print-fleet.spec.ts README.md backend/README.md docs/SPEC.md docs/version/DATABASE_UPDATES.md
git commit -m "docs: deploy and operate print fleet worker"
```

- [ ] **Step 8: Reconcile every design acceptance criterion**

Map each item in design section 16 to a test result or the explicitly pending physical-device homologation. Do not claim real-device verification before it occurs.

