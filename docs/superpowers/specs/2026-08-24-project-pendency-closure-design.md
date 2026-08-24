# Project Pendency Closure Design

## Goal

Close every verified open item in the Duplica repository without expanding the product's business scope. Completion means the current uncommitted "About" feature is consolidated, the complete automated verification suite passes, the documented technical backlog is either implemented or replaced by an evidence-backed resolution, and project documentation matches runtime behavior.

## Scope

The closure covers six workstreams:

1. Repair the five currently failing Playwright tests and the underlying accessibility defect.
2. Finish the authenticated system-version endpoint and the "About" dialog already present in the working tree.
3. Add a real backend test layer based on pytest, HTTPX, and an isolated PostgreSQL database.
4. Remove the production bundle-size warning through route/view-level code splitting.
5. Resolve the dropdown accessibility exception according to the ARIA menu interaction model.
6. Produce the missing DATA and SECURITY specifications and reconcile README, SPEC, historical plans, and test instructions.

Out of scope: implementing MFA, changing password policy, rotating live credentials, modifying production data, redesigning existing screens, or changing the request lifecycle. The SECURITY SPEC documents supported controls, risks, and future operational decisions; it does not silently introduce new authentication requirements.

## Existing Constraints

- Preserve all pre-existing working-tree changes.
- Treat `sources/` as read-only.
- Keep the interface in Brazilian Portuguese and follow the existing `DESIGN.md` visual system.
- Use the isolated `duplica_test` database for destructive automated testing; never touch the `duplica` development or production database.
- Retain authenticated access for `/api/v1/system/version`; `/api/v1/health` remains the intentionally public health endpoint.
- Preserve the current feature-first frontend structure and FastAPI router boundaries.

## Architecture and Components

### 1. E2E and accessibility stabilization

The request E2E tests will follow the current person-based request model: select an existing person or create a dedicated test person through the supported UI, then assert the resulting request lifecycle. Assertions will use stable accessible roles and object-specific accessible names instead of legacy labels.

The notes textarea will receive a programmatic label and normal form-error associations consistent with sibling fields. The dashboard and delete-dialog accessibility tests will wait for current semantic content and target current accessible control names.

### 2. Account menu behavior

The account dropdown will follow the WAI-ARIA menu model, not a dialog model. A menu does not retain focus with a dialog-style focus trap: it owns arrow-key navigation while open, closes on Escape or Tab, and restores or advances focus predictably. The implementation will remove the condition that causes Radix to apply `aria-hidden` to still-focusable page controls, then the E2E accessibility suite will run without disabling `aria-hidden-focus`.

This resolves the documented issue without maintaining a custom focus-trap implementation that would conflict with expected menu keyboard behavior.

### 3. System version feature

The existing `system` feature remains split into repository, query, model, and UI layers. The backend reads the semantic version from `VERSION`, the image revision from `GIT_SHA`, and the applied database revision from `alembic_version`. The endpoint requires a valid user session.

Loading, failure, retry, narrow-screen layout, Escape close, and focus restoration remain explicit behaviors. Backend and frontend contract tests will verify snake_case-to-camelCase mapping and authorization.

### 4. Backend test foundation

Backend tests will use pytest with async support and HTTPX's ASGI transport for application requests. Database-dependent cases will run against a dedicated PostgreSQL test database prepared by a guarded script or fixture. Dependency overrides may isolate narrow route-contract tests, but critical authorization and persistence paths must also execute through the real FastAPI dependency graph and test database.

Initial coverage will include:

- public health and authenticated system-version endpoints;
- authentication success and rejection;
- authorization enforcement for representative protected routes;
- request calculation/status-transition rules;
- one representative persistence round trip;
- database revision reporting.

The test command will be documented and runnable from the repository root.

### 5. Code splitting

Large feature views will be loaded with `React.lazy` and `Suspense` at the AppShell view boundary. Shared shell, login, theme, and request-critical primitives remain in the initial chunk. Each asynchronous view receives a stable, accessible loading state using existing visual tokens.

The build is successful only if Vite no longer emits the current `chunkSizeWarningLimit` warning; raising the threshold without reducing the chunk is not an acceptable fix.

### 6. Documentation

Two canonical documents will be added:

- `docs/DATA_SPEC.md`: entities, identifiers, relations, constraints, lifecycle fields, migrations, retention, and backup/migration assumptions, grounded in SQLAlchemy models and Alembic revisions.
- `docs/SECURITY_SPEC.md`: trust boundaries, authentication, authorization, secrets, CORS, rate limiting, uploads, auditing/retention, deployment exposure, known risks, and explicitly deferred controls.

`README.md` and `docs/SPEC.md` will be reconciled with the real backend test command, `duplica` naming, bundle structure, menu behavior, and completed artifacts. The 2026-08-10 implementation plan will be labeled historical/superseded rather than falsely left as an active unchecked backlog.

## Data Flow

For the About dialog:

1. An authenticated user opens the account menu and chooses "Sobre".
2. The dialog mounts and enables the TanStack Query request.
3. The API client sends the bearer token to `/api/v1/system/version`.
4. FastAPI validates the user, reads application constants, queries `alembic_version`, and returns the three identifiers.
5. The frontend maps the response and renders stable rows; errors preserve the dialog and offer retry.
6. Closing returns focus to the account-menu trigger.

For backend integration tests, a guarded test setup creates or resets only `duplica_test`, applies all migrations, seeds only when required by a test contract, and tears down transactional state without addressing the live database.

## Error Handling

- Version-query errors remain visible inline and retryable.
- Authentication failures return the existing API error contract without leaking database or environment details.
- Missing `VERSION` or `GIT_SHA` retains safe non-secret fallback values in development.
- Backend test bootstrap aborts unless the configured database name is exactly the dedicated test database.
- Lazy-load failures use an application-owned recoverable error boundary or a deterministic reload action rather than leaving a blank main area.
- Form validation errors remain associated with their controls and focus the first invalid field through the established React Hook Form behavior.

## Testing Strategy

Implementation follows a red-green-refactor sequence for each behavior change:

1. Reproduce each existing E2E failure independently.
2. Update or add the smallest test expressing current intended behavior.
3. Apply the minimum production change where a real defect exists.
4. Re-run the focused test before proceeding.

Final verification includes:

- backend pytest suite from the repository root;
- `npm test`;
- `npm run build` with no oversized-chunk warning;
- `npm run test:e2e` with no disabled serious/critical accessibility rule;
- `git diff --check`;
- strict frontend-design audit and its required UI verification checklist;
- direct inspection of generated chunk boundaries and documentation consistency.

## Completion Criteria

The project has zero known pendencies in the inspected scope when all of the following are true:

- the working tree contains one coherent implementation ready for review;
- all frontend, backend, E2E, and accessibility tests pass;
- the build emits no oversized-chunk warning;
- the account menu has no documented `aria-hidden-focus` exception;
- DATA and SECURITY specs exist and agree with code;
- README and SPEC describe the actual commands, database names, and test coverage;
- the formal backlog list no longer contains unresolved items covered by this design;
- no credentials, private conversations, or production data are introduced into the repository.
