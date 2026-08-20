# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Frontend:
```bash
npm install
npm run dev       # Vite dev server (expects the API at VITE_API_URL, default http://127.0.0.1:8010)
npm test          # vitest run (all tests, once) — mocks fetch (src/test/mockApi.ts), no backend needed
npm run build     # tsc --noEmit -p tsconfig.app.json && vite build
npm run preview   # serve dist/ (production build) on http://127.0.0.1:4174 — not the dev server
```
Run a single test file: `npx vitest run src/domains/units/rules.test.ts`

Backend + database:
```bash
docker compose up -d postgres                              # port 5435 (5432-5434 taken by other projects on this host)
cd backend && .venv/bin/alembic upgrade head                # apply migrations
.venv/bin/python -m app.db.seed                              # idempotent demo-data seed
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8010  # port 8000 taken by another project on this host
```
No backend test suite yet (validated manually via `curl`, see `docs/SPEC.md` §13).

Both `npm test` and `npm run build` must pass before any frontend change is considered done (see `docs/SPEC.md` §9 and §11).

## What this is

Duplica (product name since 2026-08-10; was "Gráfica" — the project dir and `package.json` `name` deliberately still say "grafica", but the Postgres DB name and Docker container/image names were renamed to "duplica" on 2026-08-11): a copy/print request control system (solicitações de impressão/cópia from Escolas or Sede — production, delivery, status history, unit ranking, monthly consolidation) — generic, not tied to one specific organization; SEMED (a municipal education department) is a user of it, not its owner/namesake (branding de-scoped from SEMED 2026-08-20, see `Origin` values `ESCOLA`/`SEDE` replacing the old free-text `"Escola"`/`"Setor SEMED"`). React 19 + Vite 6 + TypeScript frontend, **real backend** in `backend/` (Python/FastAPI + Postgres) — this used to be a `localStorage`-only MVP but that changed 2026-08-10 at explicit request. UI language is pt-BR only (`Intl.NumberFormat("pt-BR")`, `Intl.DateTimeFormat("pt-BR")`) — no i18n. No third-party UI component library on the content screens (dashboard, requests, units, users, reports); those style via a single global stylesheet (`src/styles.css`) with light/dark theme via a `data-theme` attribute on the root.

**The shell (`src/shell/`) is the Tailwind-formal zone:** `LoginView.tsx` and `Sidebar.tsx` (+ `src/shell/ui/`) use Tailwind CSS + hand-rolled shadcn-style components (`class-variance-authority`/`clsx`/`tailwind-merge`), matching ForgeHub's frontend pattern by explicit request (2026-08-10) — this is a formal standard now, not a one-off exception, but it's still scoped to the shell only, not the content screens. `Sidebar.tsx` replicates ForgeHub's `Sidebar.tsx`/`UserSettingsMenu.tsx`: collapsible (icon-only ↔ expanded, state in `localStorage` key `grafica.semed.sidebarCollapsed`), active nav item marked by a background pill (`bg-white/15`, no side border), account/profile menu moved to the sidebar footer (avatar + name + role, dropdown with profile info, theme toggle, logout) — the topbar no longer has an account menu. `tailwind.config.js` has `corePlugins.preflight: false` and a `content` glob listed file-by-file (shell files, plus `src/domains/requests/RequestsView.tsx` as a deliberate, scoped exception — see below), so it never leaks into the other content screens' plain-CSS styling — don't widen that `content` array to a content-screen file without knowing you're opting it into Tailwind. Tailwind's colors are mapped to the same `var(--accent)`/`var(--sidebar)`/etc. custom properties `src/styles.css` already defines, not a new palette. Logo: `src/shell/Logo.tsx` (`LogoMark`/`Logo`), also used as `public/favicon.svg`. Native `<button>` elements in Tailwind-scoped files need explicit `border-0 [appearance:none]` (or equivalent) since preflight is off — otherwise the browser's default button chrome shows through (bit us once on the login password-visibility toggle).

`src/shell/ui/modal.tsx` (`ConfirmModal`, Tailwind) is the shared confirmation-dialog pattern — used today only by the Solicitações delete flow (`RequestsView.tsx`), replacing a `window.confirm()` there. Other destructive actions in the app (e.g. clearing the audit log) still use plain `window.confirm()` — don't assume every delete/clear action has been migrated to the modal.

**Solicitações is a Tailwind exception, not a content screen anymore for its list/form chrome:** `RequestsView.tsx` splits into two mutually-exclusive full-screen states (`mode: "list" | "form"`, state owned by `AppShell.tsx`) — same form component for create and edit, only the heading text differs — plus per-row edit/delete icon buttons and the `ConfirmModal` above. The rest of the app's content screens (dashboard, units, users, reports, audit) remain plain-CSS only.

**`docs/SPEC.md` is the canonical, living spec** — read it before making architectural changes, especially §3.2 (backend), §3.6 (domain organization) and §10 (directory layout). It is kept in sync with the codebase as work happens, so it is more current than this file for anything about domain boundaries, stack decisions, or migration status.

## Frontend architecture: one module per domain

Organized per-domain under `src/domains/<domain>/`, mirroring ForgeHub's backend module pattern (see `docs/SPEC.md` §3.6). There is no `App.tsx` / `src/domain/` / `src/services/` — see SPEC §10.1 for the current tree.

Shape per domain:
- `types.ts` — domain types
- `rules.ts` (+ `rules.test.ts`) — pure business-rule functions, no UI/network coupling
- `repository.ts` (+ `repository.test.ts`) — data access; calls the real API via `src/lib/apiClient.ts` (fetch + JWT Bearer), maps the API's snake_case JSON to the frontend's camelCase types
- `<Domain>View.tsx` — presentational component; owns no repository or refresh logic itself, receives data and callbacks as props from `src/shell/AppShell.tsx`, which composes everything (and is now async throughout, since every repository call is a network request)

Domains: `requests`, `units`, `users` (includes `canPerform`/permission checks in `rules.ts` — but permissions are enforced server-side too, see below), `reports` (dashboard metrics + ranking + monthly consolidation — no `repository.ts`/`types.ts` of its own, computes client-side over `CopyRequest[]` already fetched by the `requests` domain), `audit` (audit-log listing for Solicitações — `types.ts` + `repository.ts` + `AuditView.tsx`, no `rules.ts`, no pure business logic to isolate). Non-domain "shell" pieces live in `src/shell/`: `AppShell.tsx`, `Sidebar.tsx`, `LoginView.tsx`, `theme.ts`, `Logo.tsx`, `BackgroundChart.tsx`.

`User` (`src/domains/users/types.ts`) has no `password` field — the API never returns it. Editing a user leaves the password field blank by default; submitting it blank keeps the current password (`backend/app/api/routes/users.py` treats `password: null` as "don't change"). `User.avatarUrl` is an absolute URL built from the backend's `avatar_url` (relative `/uploads/...` path) via `apiAssetUrl()` in `src/lib/apiClient.ts` — avatar upload (`UsersView.tsx`, plain CSS, not Tailwind) is only available when editing an existing user, since the upload endpoint needs an id.

## Backend architecture

`backend/app/`, FastAPI + SQLAlchemy 2.0 async + asyncpg + Alembic + passlib/bcrypt + python-jose (JWT) + slowapi (rate limiting), same auth pattern as ForgeHub (JWT Bearer + bcrypt) but with restricted CORS, login rate-limiting, and no insecure default secret (`Settings.JWT_SECRET` has no default — the app fails to start without it, unlike ForgeHub's `dev_only_insecure_jwt_secret_change_me` fallback).

- `app/core/`: `config.py` (pydantic-settings reading the repo-root `.env`), `security.py` (bcrypt hash/verify, JWT create/decode), `deps.py` (`get_current_user`, `require_permission(...)`), `permissions.py` (`canPerform` ported to Python, includes `manageAudit`), `request_rules.py` (print-totals calculation, request-code generation — ported from the old frontend `rules.ts`; the frontend no longer does this, the server is the source of truth now), `audit.py` (`record_audit()` — writes an `AuditLog` row in the same transaction as the mutating requests-route call; actor/timestamp always come from the JWT-authenticated user, never a client-supplied field).
- `app/db/models/`: `User` (has `avatar_path`), `Unit`, `CopyRequest`, `StatusHistoryEntry`, `AuditLog` (SQLAlchemy) — `AuditLog` deliberately has **no FK** to `copy_requests`, so the audit trail survives request deletion. `app/db/seed.py` has the same demo data the old `localStorage` repositories used to hardcode.
- `app/api/routes/`: one file per domain (`auth`, `units`, `users`, `requests`, `reports`, `audit`), each protected by `require_permission("<permission>")` matching the frontend's `Permission` union. `users.py` also has `POST /{id}/avatar` (multipart upload, PNG/JPEG/WEBP ≤ 2MB, saved to `backend/uploads/avatars/`, old file removed on replace). `audit.py` has `GET`/`DELETE` on `/api/v1/audit-log`, both gated on `manageAudit`; retention is 60 days via a daily APScheduler job in `app/main.py` (`purge_expired`, active background job — not lazy/on-read purge, though the GET route also purges opportunistically before listing).
- `backend/uploads/` (gitignored, created at startup by `app/main.py` and mounted at `/uploads` via `StaticFiles`) holds uploaded avatars — never commit files from here.
- Alembic migrations (2026-08-20: moved out of the Alembic-default `backend/alembic/versions/` into `docs/version/v01/`, via `version_locations` in `backend/alembic.ini`, numbered `01_`, `02_`, ... for at-a-glance chronological control alongside `docs/version/DATABASE_UPDATES.md` — a new `v02/` folder starts when the app's `VERSION` bumps) — run `alembic revision --autogenerate` after a schema change (plain `alembic revision` + hand-written `op.execute("UPDATE ...")` for data-only changes), review the generated file, rename it with the next sequence number, then `alembic upgrade head` (or `scripts/db_update.sh`).

## Postgres

`docker-compose.yml` — single `postgres` service, port `5435` (5432–5434 taken by other projects on this host). Data lives in the Docker-managed named volume `postgres_data`, never inside this project directory; `./data` only holds `docker-entrypoint-initdb.d` scripts (schema itself is Alembic's job, not this). Needs a `.env` with `POSTGRES_PASSWORD` and `JWT_SECRET` (see `.env.example`) — never hardcode either.

## Testing strategy

Frontend tests never hit a real backend — `src/test/mockApi.ts` stubs `global.fetch` with an in-memory fake API (used by `src/shell/AppShell.test.tsx` and each domain's `repository.test.ts`). If you add a new API call, extend that mock's route table rather than reaching for a real server or MSW.
