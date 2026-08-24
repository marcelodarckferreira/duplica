# Project Pendency Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a coherent Duplica working tree with the About feature consolidated, all automated checks green, no serious accessibility exception, no oversized production chunk warning, and all declared technical documentation complete.

**Architecture:** Preserve the existing feature-first React/FastAPI structure. Stabilize current behavior first, establish an isolated pytest/HTTPX backend test harness second, split feature views at the AppShell boundary, then reconcile canonical documentation against verified runtime evidence.

**Tech Stack:** React 19, TypeScript, Vite 6, TanStack Query, Radix UI, Tailwind CSS, Vitest, Playwright, axe-core, FastAPI, SQLAlchemy asyncio, PostgreSQL 16, pytest, pytest-asyncio, HTTPX.

**Spec:** `docs/superpowers/specs/2026-08-24-project-pendency-closure-design.md`

## Global Constraints

- Preserve all pre-existing working-tree changes.
- Treat `sources/` as read-only.
- Keep the interface in Brazilian Portuguese and follow the existing `DESIGN.md` visual system.
- Use only the isolated `duplica_test` database for destructive automated testing; never touch `duplica`.
- Keep `/api/v1/system/version` authenticated and `/api/v1/health` public.
- Do not implement MFA, change live credentials, redesign screens, or change the request lifecycle.
- Do not silence the Vite size warning by increasing `chunkSizeWarningLimit`.
- Do not disable `aria-hidden-focus` or another serious/critical axe rule.

---

### Task 1: Repair request E2E drift and the notes accessibility defect

**Files:**
- Modify: `src/features/requests/ui/RequestsView.tsx:647-653`
- Modify: `tests/e2e/accessibility.spec.ts:22-34,84-91`
- Modify: `tests/e2e/requests.spec.ts:13-49`

**Interfaces:**
- Consumes: `RequestsView` person-based form, `RequestDraft.personId`, object-specific row action names.
- Produces: labeled `textarea[name="notes"]`; E2E coverage aligned with the current request flow.

- [ ] **Step 1: Make the accessibility test target the current dashboard and retain the failing form audit**

Replace the dashboard readiness locator with:

```ts
await page.getByRole("region", { name: "Indicadores principais" }).waitFor();
await expect(page.getByText("Faces impressas")).toBeVisible();
```

Leave `expectNoSeriousViolations(page)` unchanged so the form test still fails on the unlabeled notes textarea.

- [ ] **Step 2: Run the focused accessibility tests and record the red state**

Run:

```bash
npx playwright test tests/e2e/accessibility.spec.ts --project=chromium --grep "dashboard|formulário de nova solicitação"
```

Expected: dashboard passes; form test fails with axe rule `label` targeting `textarea[name="notes"]`.

- [ ] **Step 3: Add an explicit programmatic label to the notes textarea**

Replace the notes block with:

```tsx
<label className="grid gap-2.5 text-sm font-bold text-label">
  <span className="text-[11px] font-bold uppercase tracking-wide text-muted">Observações</span>
  <textarea
    className="min-h-[82px] w-full resize-none rounded border border-border bg-surface px-3 py-2 text-sm font-normal text-text shadow-none [appearance:none] focus:border-accent focus:outline-none"
    {...register("notes")}
  />
</label>
```

- [ ] **Step 4: Update the request lifecycle test to select a real person**

Use the current form controls and seeded person:

```ts
await page.getByRole("combobox", { name: /Pessoa/ }).click();
await page.getByRole("option", { name: "Beatriz Lima" }).click();
await page.getByLabel("Descrição / documento").fill("Prova E2E automatizada");
await page.getByLabel("Páginas").fill("5");
await page.getByLabel("Jogos / cópias").fill("3");
```

After creation, locate the row containing `Prova E2E automatizada`, use its buttons `Editar CP-...` and `Excluir CP-...`, and edit the document description instead of the now-derived requester:

```ts
const createdRow = page.locator("table tbody tr", { hasText: "Prova E2E automatizada" }).first();
await createdRow.getByRole("button", { name: /^Editar CP-/ }).click();
await page.getByLabel("Descrição / documento").fill("Prova E2E editada");
await page.getByRole("button", { name: /salvar alterações/i }).click();
```

- [ ] **Step 5: Update validation and delete-dialog assertions**

Assert the current required-field messages:

```ts
await expect(page.getByText("Selecione a pessoa.")).toBeVisible();
await expect(page.getByText("Descreva o documento.")).toBeVisible();
```

For the accessibility dialog test, target the first data row and its object-specific action:

```ts
const requestRow = page.locator("table tbody tr").filter({ has: page.getByRole("button", { name: /^Excluir CP-/ }) }).first();
await requestRow.getByRole("button", { name: /^Excluir CP-/ }).click();
await page.getByRole("alertdialog", { name: "Excluir solicitação" }).waitFor();
```

- [ ] **Step 6: Run focused E2E tests to verify green**

Run:

```bash
npx playwright test tests/e2e/accessibility.spec.ts tests/e2e/requests.spec.ts --project=chromium
```

Expected: all selected tests pass with no serious or critical axe violations.

- [ ] **Step 7: Commit the stabilization**

```bash
git add src/features/requests/ui/RequestsView.tsx tests/e2e/accessibility.spec.ts tests/e2e/requests.spec.ts
git commit -m "Fix request E2E coverage and notes accessibility"
```

---

### Task 2: Resolve account-menu focus behavior without an axe exception

**Files:**
- Modify: `src/app/Sidebar.tsx:174-258`
- Modify: `src/shared/ui/dropdown-menu.stories.tsx`
- Modify: `tests/e2e/accessibility.spec.ts:36-50`

**Interfaces:**
- Consumes: Radix `DropdownMenuPrimitive.Root` property `modal` and existing account trigger label.
- Produces: non-modal ARIA menu behavior with Escape/Tab closure and no page-wide `aria-hidden` state.

- [ ] **Step 1: Strengthen the account-menu E2E test before changing production code**

Remove the disabled axe rule and assert keyboard behavior:

```ts
const trigger = page.getByRole("button", { name: /abrir menu do usuário/i });
await trigger.click();
await page.getByRole("menuitem", { name: "Minha conta" }).waitFor();
await expectNoSeriousViolations(page);
await page.keyboard.press("Escape");
await expect(page.getByRole("menu")).toBeHidden();
await expect(trigger).toBeFocused();
```

- [ ] **Step 2: Run the menu test and verify the current red state**

Run:

```bash
npx playwright test tests/e2e/accessibility.spec.ts --project=chromium --grep "menu de conta"
```

Expected: failure from `aria-hidden-focus` before the production change.

- [ ] **Step 3: Configure the account dropdown as a non-modal menu**

Change only the account-menu root:

```tsx
<DropdownMenu modal={false}>
```

Retain Radix's roving focus, Escape handling, selection behavior, and focus restoration. Do not add a custom `Tab` loop or a dialog-style focus trap.

- [ ] **Step 4: Add a Storybook interaction test for Escape restoration**

Replace the invalid `<h2>` menu child in the Default story with `<DropdownMenuLabel>Conta</DropdownMenuLabel>`, import `expect`, `screen`, `userEvent`, and `within` from `storybook/test`, then add this interaction to the Default story:

```ts
play: async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const trigger = canvas.getByRole("button", { name: "Abrir menu do usuário" });
  await userEvent.click(trigger);
  await expect(screen.getByRole("menu")).toBeVisible();
  await userEvent.keyboard("{Escape}");
  await expect(trigger).toHaveFocus();
}
```

- [ ] **Step 5: Re-run menu accessibility and Storybook tests**

Run:

```bash
npx playwright test tests/e2e/accessibility.spec.ts --project=chromium --grep "menu de conta"
npm test -- src/shared/ui/dropdown-menu.stories.tsx
```

Expected: both commands pass without disabling axe rules.

- [ ] **Step 6: Commit the menu resolution**

```bash
git add src/app/Sidebar.tsx src/shared/ui/dropdown-menu.stories.tsx tests/e2e/accessibility.spec.ts
git commit -m "Resolve account menu focus accessibility"
```

---

### Task 3: Complete and harden the system-version feature

**Files:**
- Modify: `backend/app/main.py`
- Create/modify: `backend/app/api/routes/system.py`
- Create/modify: `backend/app/core/version.py`
- Create/modify: `backend/tests/test_system_version.py`
- Create: `src/features/system/api/repository.test.ts`
- Create/modify: `src/features/system/api/repository.ts`
- Create/modify: `src/features/system/model/queries.ts`
- Create/modify: `src/features/system/model/types.ts`
- Create/modify: `src/features/system/ui/AboutModal.tsx`
- Modify: `src/app/AppShell.test.tsx`
- Modify: `src/app/Sidebar.tsx`
- Modify: `src/shared/testing/mockApi.ts`

**Interfaces:**
- Produces backend: `GET /api/v1/system/version -> { application_version: str, git_sha: str, database_revision: str }`.
- Produces frontend: `createSystemRepository().getVersion(): Promise<SystemVersionInfo>` and `useSystemVersionQuery(enabled: boolean)`.

- [ ] **Step 1: Add the missing frontend repository contract test**

Create `src/features/system/api/repository.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { setToken } from "../../../shared/api/apiClient";
import { installMockApi } from "../../../shared/testing/mockApi";
import { createSystemRepository } from "./repository";

describe("system repository", () => {
  beforeEach(() => {
    setToken("test-token");
    installMockApi();
  });

  it("maps application, git and database revisions", async () => {
    await expect(createSystemRepository().getVersion()).resolves.toEqual({
      applicationVersion: "0.1.0",
      gitSha: "535a164",
      databaseRevision: "62ad30878cdf",
    });
  });
});
```

- [ ] **Step 2: Run the repository and AppShell tests**

Run:

```bash
npm test -- src/features/system/api/repository.test.ts src/app/AppShell.test.tsx
```

Expected: repository mapping, About loading/error/retry, and focus-restoration tests all pass with the existing assertions unchanged.

- [ ] **Step 3: Keep the narrow backend route contract executable before the pytest foundation**

Keep `backend/tests/test_system_version.py` on `unittest.IsolatedAsyncioTestCase` in this task and assert all three non-empty identifiers plus the authentication dependency:

```python
class SystemVersionRouteTest(unittest.IsolatedAsyncioTestCase):
    async def test_returns_application_commit_and_database_versions(self) -> None:
        payload = await system.system_version(db=_FakeSession(), _user=object())
        self.assertTrue(payload["application_version"])
        self.assertTrue(payload["git_sha"])
        self.assertEqual("62ad30878cdf", payload["database_revision"])
```

Retain a dependency-inspection test proving `get_current_user` is declared by the route.

- [ ] **Step 4: Run the narrow backend test in its current environment**

Run:

```bash
cd backend && .venv/bin/python -m unittest tests/test_system_version.py -v
```

Expected: 2 tests pass with no application import error.

- [ ] **Step 5: Run the About E2E scenario**

Run:

```bash
npx playwright test tests/e2e/accessibility.spec.ts --project=chromium --grep "diálogo Sobre"
```

Expected: unauthorized API request returns 401; authenticated dialog shows all three identifiers, fits both narrow orientations, closes with Escape, and restores trigger focus.

- [ ] **Step 6: Commit the coherent About feature**

```bash
git add backend/app/main.py backend/app/api/routes/system.py backend/app/core/version.py backend/tests/test_system_version.py src/features/system src/app/AppShell.test.tsx src/app/Sidebar.tsx src/shared/testing/mockApi.ts tests/e2e/accessibility.spec.ts DESIGN.md docs/SPEC.md
git commit -m "Add authenticated system version dialog"
```

---

### Task 4: Establish isolated pytest, HTTPX, authorization, and persistence coverage

**Files:**
- Create: `backend/requirements-dev.txt`
- Create: `backend/tests/conftest.py`
- Create: `backend/tests/test_health.py`
- Create: `backend/tests/test_auth_api.py`
- Create: `backend/tests/test_request_rules.py`
- Create: `backend/tests/test_requests_api.py`
- Modify: `backend/tests/test_system_version.py`
- Create: `scripts/test_backend.sh`
- Modify: `.gitignore`

**Interfaces:**
- Produces command: `./scripts/test_backend.sh`.
- Produces fixtures: `client: httpx.AsyncClient`, `db_session: AsyncSession`, and `admin_token: str`.
- Consumes: Docker container `duplica_postgres`, Alembic migrations, FastAPI `app`, and database name guard `duplica_test`.

- [ ] **Step 1: Declare test-only Python dependencies**

Create `backend/requirements-dev.txt`:

```text
-r requirements.txt
pytest==9.1.1
pytest-asyncio==1.4.0
httpx==0.28.1
```

- [ ] **Step 2: Write pure backend rule tests first**

Create `backend/tests/test_request_rules.py`:

```python
from app.core.request_rules import calculate_print_totals, generate_request_code

def test_calculates_simplex_and_duplex_totals() -> None:
    assert calculate_print_totals(5, 3, False) == (15, 15)
    assert calculate_print_totals(5, 3, True) == (15, 9)

def test_generates_next_code_for_selected_year() -> None:
    assert generate_request_code(["CP-2026-0002", "CP-2025-0099"], 2026) == "CP-2026-0003"
```

- [ ] **Step 3: Create the guarded root-level backend runner**

Create executable `scripts/test_backend.sh` with this control flow:

```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
TEST_DB="duplica_test"
if [ -n "${POSTGRES_DB:-}" ] && [ "$POSTGRES_DB" != "$TEST_DB" ]; then
  echo "ERRO: os testes só podem recriar '$TEST_DB'." >&2
  exit 1
fi
docker ps --filter "name=duplica_postgres" --filter "status=running" --format '{{.Names}}' | grep -qx duplica_postgres
docker exec duplica_postgres psql -U app -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS $TEST_DB;"
docker exec duplica_postgres psql -U app -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE $TEST_DB OWNER app;"
export POSTGRES_DB="$TEST_DB"
cd backend
.venv/bin/alembic upgrade head
.venv/bin/python -m pytest tests -v
```

- [ ] **Step 4: Install the dev requirements and prove pure tests pass**

Run:

```bash
backend/.venv/bin/pip install -r backend/requirements-dev.txt
cd backend && .venv/bin/python -m pytest tests/test_request_rules.py -v
```

Expected: 2 tests pass.

- [ ] **Step 5: Add async database and HTTPX fixtures**

In `backend/tests/conftest.py`, assert the test database before importing the app, then expose the real ASGI application:

```python
import os
os.environ["POSTGRES_DB"] = "duplica_test"

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from app.db.base import AsyncSessionLocal
from app.main import app

@pytest_asyncio.fixture(autouse=True)
async def clean_mutable_tables():
    async with AsyncSessionLocal() as session:
        await session.execute(text("TRUNCATE status_history_entries, copy_requests, audit_log, people, role_permissions, users, units RESTART IDENTITY CASCADE"))
        await session.commit()
    yield

@pytest_asyncio.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as value:
        yield value
```

Seed explicit users/permissions inside fixtures rather than relying on shared development data.

- [ ] **Step 6: Convert the system-version test to pytest style**

Replace the unittest class with direct async pytest tests:

```python
import pytest

@pytest.mark.asyncio
async def test_system_version_returns_all_identifiers() -> None:
    payload = await system_version(db=_FakeSession(), _user=object())
    assert payload["application_version"]
    assert payload["git_sha"]
    assert payload["database_revision"] == "62ad30878cdf"
```

Retain a synchronous route-dependency assertion that includes `get_current_user`.

- [ ] **Step 7: Add health, login rejection, and protected-route tests**

Implement these exact contracts:

```python
@pytest.mark.asyncio
async def test_health_is_public(client):
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    assert set(response.json()) == {"status", "version", "git_sha"}

@pytest.mark.asyncio
async def test_version_requires_authentication(client):
    response = await client.get("/api/v1/system/version")
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_invalid_login_is_rejected(client):
    response = await client.post("/api/v1/auth/token", data={"username": "missing", "password": "wrong"})
    assert response.status_code == 401
```

Create an active Admin fixture with `hash_password("admin123")`, grant `createRequests`, authenticate it through `/api/v1/auth/token`, and assert a protected request with no token is 401 while a role without the permission is 403.

- [ ] **Step 8: Add a real request persistence round trip**

Insert one active unit, authenticated Admin, and `createRequests` permission. POST a complete request payload, then GET `/api/v1/requests` and assert code, printed faces, consumed sheets, and initial history:

```python
assert created["printed_faces"] == 15
assert created["consumed_sheets"] == 9
assert created["status"] == "Recebido"
assert [entry["status"] for entry in created["history"]] == ["Recebido"]
assert listed[0]["id"] == created["id"]
```

- [ ] **Step 9: Run the full guarded backend suite**

Run:

```bash
chmod +x scripts/test_backend.sh
./scripts/test_backend.sh
```

Expected: all pytest tests pass; output explicitly shows migrations applied to `duplica_test`.

- [ ] **Step 10: Commit the backend test foundation**

```bash
git add backend/requirements-dev.txt backend/tests scripts/test_backend.sh .gitignore
git commit -m "Add isolated backend API test suite"
```

---

### Task 5: Split feature views into production chunks

**Files:**
- Modify: `src/app/AppShell.tsx:1-60,550-690`
- Modify: `src/app/AppShell.test.tsx`
- Create: `src/app/ViewLoadingFallback.tsx`
- Create: `src/app/ViewErrorBoundary.tsx`
- Test: `src/app/AppShell.test.tsx`

**Interfaces:**
- Produces: lazy imports for `DashboardView`, `RequestsView`, `UnitsView`, `PeopleView`, `UsersView`, `AccessProfilesView`, and `AuditView`.
- Produces: `<ViewLoadingFallback />` with `role="status"` and `<ViewErrorBoundary>` with a recoverable reload action.

- [ ] **Step 1: Add failing unit tests for the loading and recovery surfaces**

In `AppShell.test.tsx`, import the not-yet-created components and assert their public contracts:

```ts
render(<ViewLoadingFallback />);
expect(screen.getByRole("status", { name: "Carregando tela" })).toBeTruthy();
```

Add a small child that throws and assert that `ViewErrorBoundary` renders the alert and `Recarregar aplicação` button. Existing AppShell navigation tests remain the integration proof for every lazy view.

- [ ] **Step 2: Run the focused test and verify the missing fallback**

Run:

```bash
npm test -- src/app/AppShell.test.tsx
```

Expected: TypeScript/Vitest fails because `ViewLoadingFallback` and `ViewErrorBoundary` do not exist.

- [ ] **Step 3: Create the stable loading fallback**

Create `src/app/ViewLoadingFallback.tsx`:

```tsx
import { RefreshCw } from "lucide-react";

export function ViewLoadingFallback() {
  return (
    <div className="grid min-h-48 place-items-center" role="status" aria-label="Carregando tela">
      <span className="inline-flex items-center gap-2 text-sm font-medium text-muted">
        <RefreshCw size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
        Carregando tela…
      </span>
    </div>
  );
}
```

- [ ] **Step 4: Create a recoverable view error boundary**

Create a class error boundary whose fallback contains:

```tsx
<div role="alert" className="rounded border border-border bg-status-cancelado-bg p-4 text-status-cancelado-fg">
  <p className="m-0 mb-3 font-bold">Não foi possível carregar esta tela.</p>
  <Button type="button" variant="soft" onClick={() => window.location.reload()}>
    Recarregar aplicação
  </Button>
</div>
```

Reset its error state when an `activeView` key changes.

- [ ] **Step 5: Replace eager view imports with named-export lazy imports**

Use exact mappings:

```ts
const DashboardView = lazy(() => import("../features/reports/ui/DashboardView").then((module) => ({ default: module.DashboardView })));
const RequestsView = lazy(() => import("../features/requests/ui/RequestsView").then((module) => ({ default: module.RequestsView })));
const UnitsView = lazy(() => import("../features/units/ui/UnitsView").then((module) => ({ default: module.UnitsView })));
const PeopleView = lazy(() => import("../features/people/ui/PeopleView").then((module) => ({ default: module.PeopleView })));
const UsersView = lazy(() => import("../features/users/ui/UsersView").then((module) => ({ default: module.UsersView })));
const AccessProfilesView = lazy(() => import("../features/users/ui/AccessProfilesView").then((module) => ({ default: module.AccessProfilesView })));
const AuditView = lazy(() => import("../features/audit/ui/AuditView").then((module) => ({ default: module.AuditView })));
```

Wrap the active-view block in:

```tsx
<ViewErrorBoundary resetKey={activeView}>
  <Suspense fallback={<ViewLoadingFallback />}>
    {/* existing mutually exclusive active-view render blocks */}
  </Suspense>
</ViewErrorBoundary>
```

- [ ] **Step 6: Run frontend tests and inspect build chunks**

Run:

```bash
npm test
npm run build
```

Expected: all tests pass; build emits feature chunks and no `Some chunks are larger than 500 kB` warning.

- [ ] **Step 7: Commit code splitting**

```bash
git add src/app/AppShell.tsx src/app/AppShell.test.tsx src/app/ViewLoadingFallback.tsx src/app/ViewErrorBoundary.tsx
git commit -m "Split feature views into lazy chunks"
```

---

### Task 6: Write canonical data and security specifications

**Files:**
- Create: `docs/DATA_SPEC.md`
- Create: `docs/SECURITY_SPEC.md`
- Read completely: `backend/app/db/models/*.py`, `backend/app/schemas/*.py`, `backend/app/core/security.py`, `backend/app/core/deps.py`, `backend/app/core/config.py`, `backend/app/core/limiter.py`, `backend/app/core/audit.py`, `backend/app/main.py`, `docs/version/DATABASE_UPDATES.md`, `docs/version/v01/*.py`, `Dockerfile`, `docker-compose.yml`.

**Interfaces:**
- Produces canonical documentation links consumed by `README.md` and `docs/SPEC.md`.

- [ ] **Step 1: Build a model-to-migration evidence matrix**

For every table, record: primary key, foreign keys, uniqueness, nullability, mutable lifecycle fields, delete behavior, and creating migration. Verify the final list contains exactly:

```text
users
units
people
copy_requests
status_history_entries
audit_log
role_permissions
alembic_version
```

- [ ] **Step 2: Write `docs/DATA_SPEC.md` from inspected evidence**

Include these sections with concrete repository facts:

```markdown
# Duplica Data Specification
## Scope and source of truth
## Entity relationship overview
## Table contracts
## Derived values and denormalized snapshots
## Identifier generation
## Request and status lifecycle
## Referential integrity and deletion
## Audit retention
## Migration workflow
## Test and backup isolation
## Known data risks
```

Document that request `unit_name`, requester, contact, registration number, and production actor values are historical snapshots; they must not be presented as live joins.

- [ ] **Step 3: Build a security-control evidence matrix**

Map each control to its implementation and residual risk:

```text
JWT bearer authentication -> core/security.py + core/deps.py
bcrypt password hashing -> core/security.py
role permission lookup -> core/permissions.py + role_permissions
login/self-update rate limit -> api/routes/auth.py
CORS allowlist -> core/config.py + main.py
API documentation disabled by default -> core/config.py + main.py
audit retention -> core/audit.py + main.py scheduler
localhost-only container exposure -> docker-compose.yml
avatar upload controls -> api/routes/users.py
```

- [ ] **Step 4: Write `docs/SECURITY_SPEC.md` without inventing controls**

Use these sections:

```markdown
# Duplica Security Specification
## Scope, assets, and trust boundaries
## Authentication and session model
## Authorization model
## Password and secret handling
## Network exposure and CORS
## Rate limiting and abuse controls
## Upload handling
## Audit logging and retention
## Deployment and diagnostics
## Verified limitations and deferred controls
## Operational verification checklist
```

Explicitly classify MFA, token rotation/revocation, password complexity, malware scanning for uploads, backup encryption, and centralized monitoring as deferred controls, not implemented features.

- [ ] **Step 5: Verify both documents against code**

Run:

```bash
rg -n 'TBD|TODO|FIXME|grafica_test|grafica`|ASP.NET|manual via curl' docs/DATA_SPEC.md docs/SECURITY_SPEC.md
git diff --check -- docs/DATA_SPEC.md docs/SECURITY_SPEC.md
```

Expected: no placeholders, stale database names, obsolete stack claims, or whitespace errors.

- [ ] **Step 6: Commit canonical specifications**

```bash
git add docs/DATA_SPEC.md docs/SECURITY_SPEC.md
git commit -m "Document data and security contracts"
```

---

### Task 7: Reconcile project documentation and retire the stale backlog

**Files:**
- Modify: `README.md:64-123`
- Modify: `backend/README.md`
- Modify: `docs/SPEC.md:69-425`
- Modify: `docs/superpowers/plans/2026-08-10-grafica-mvp.md:1-32`
- Modify: `docs/version/DATABASE_UPDATES.md`

**Interfaces:**
- Consumes: verified commands and outputs from Tasks 1-6.
- Produces: accurate run/test instructions and no active `Next Spec Artifacts` backlog.

- [ ] **Step 1: Mark the 2026-08-10 plan as historical**

Add directly below its title:

```markdown
> **Status: superseded and completed through later architecture work.** This file preserves the original frontend-only MVP plan. The delivered application now uses FastAPI, PostgreSQL, feature-first React architecture, and the verification contract in `docs/SPEC.md`; unchecked boxes below are historical, not active backlog.
```

- [ ] **Step 2: Update root and backend test instructions**

Document these commands exactly:

```bash
npm test
./scripts/test_backend.sh
npm run build
npm run test:e2e
```

Remove claims that backend validation is manual-only. State that the guarded backend runner recreates only `duplica_test` and requires the `duplica_postgres` container.

- [ ] **Step 3: Reconcile SPEC terminology and completed artifacts**

Replace every `grafica`/`grafica_test` runtime database reference with `duplica`/`duplica_test`. Update test counts only from fresh command output. Replace §13 with a completion record linking `DATA_SPEC.md`, `SECURITY_SPEC.md`, the backend suite, the standards-based dropdown resolution, and generated lazy chunks.

- [ ] **Step 4: Update database-version documentation**

Ensure `docs/version/DATABASE_UPDATES.md` names `duplica`, uses `scripts/db_update.sh`, and distinguishes migration history from the runtime revision shown by the About dialog.

- [ ] **Step 5: Run a repository-wide stale-text audit**

Run:

```bash
rg -n -i --hidden --glob '!.git/**' --glob '!node_modules/**' --glob '!test-results/**' 'backend ainda não tem|sem suíte.*pytest|manual via curl|grafica_test|banco real.*grafica|próximos artefatos ainda pendentes|aria-hidden-focus.*desabilitada|chunk principal passou de 500'
```

Expected: no stale statements remain outside clearly labeled historical context.

- [ ] **Step 6: Commit the documentation reconciliation**

```bash
git add README.md backend/README.md docs/SPEC.md docs/superpowers/plans/2026-08-10-grafica-mvp.md docs/version/DATABASE_UPDATES.md
git commit -m "Reconcile project documentation and completed backlog"
```

---

### Task 8: Run the complete release-quality verification gate

**Files:**
- Modify only files implicated by verification failures.
- Read: `DESIGN.md`, frontend-design verification references, and all final diffs.

**Interfaces:**
- Consumes every artifact from Tasks 1-7.
- Produces fresh evidence that the inspected project scope has no known open item.

- [ ] **Step 1: Run static repository checks**

```bash
git diff --check
rg -n -i --hidden --glob '!.git/**' --glob '!node_modules/**' --glob '!test-results/**' '(TODO|FIXME|HACK|XXX|pendências ainda|ainda pendentes)'
```

Expected: no whitespace errors and no active marker in production code or canonical documentation.

- [ ] **Step 2: Run the strict frontend-design audit**

```bash
python /root/.codex/plugins/cache/openai-curated-remote/frontend-design-premium/1.4.0/skills/frontend-design-premium/scripts/audit_project.py /root/project/duplica --mode strict
```

Expected: no blocking findings. Review every reported warning against `DESIGN.md`; fix genuine violations and document only evidence-backed exceptions.

- [ ] **Step 3: Run all backend tests against the guarded database**

```bash
./scripts/test_backend.sh
```

Expected: zero failures and explicit use of `duplica_test`.

- [ ] **Step 4: Run all frontend and Storybook interaction tests**

```bash
npm test
```

Expected: zero failed files and zero failed tests.

- [ ] **Step 5: Run the production build and inspect chunk sizes**

```bash
npm run build
```

Expected: exit 0, named feature chunks, and no chunk larger than Vite's 500 kB warning threshold.

- [ ] **Step 6: Run the complete browser, authorization, CRUD, and accessibility suite**

```bash
npm run test:e2e
```

Expected: all setup and Chromium tests pass; axe reports no serious or critical violation without disabled rules.

- [ ] **Step 7: Inspect final version-control scope**

```bash
git status --short
git show --stat --oneline HEAD
git log -8 --oneline --decorate
```

Expected: only intentional project files changed; no `test-results`, Playwright auth state, environment file, credential, database dump, or generated `dist` artifact is tracked.

- [ ] **Step 8: Commit any verification-only correction**

If verification required a code or documentation correction, stage only the implicated files and use:

```bash
git commit -m "Fix release verification findings"
```

If no correction was required, do not create an empty commit.
