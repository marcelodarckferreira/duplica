# Duplica

Sistema web para controle de cópias da SEMED: dashboard, gestão de solicitações, cadastro de escolas/setores, histórico de status, ranking de unidades e consolidação mensal. Frontend em React/TypeScript, backend real em Python/FastAPI + Postgres (ver `docs/SPEC.md` §3.2 para a decisão de stack).

## Como executar

### 1. Banco de dados (Postgres via Docker)

```bash
cp .env.example .env   # preencha POSTGRES_PASSWORD e JWT_SECRET (valores aleatórios, nunca commitados)
docker compose up -d postgres
```

### 2. Backend (API)

```bash
cd backend
python3.11 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/alembic upgrade head       # cria as tabelas
.venv/bin/python -m app.db.seed      # popula os dados demo (idempotente)
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8010
```

### 3. Frontend

```bash
npm install
npm run dev
```

Depois acesse a URL local exibida no terminal. O frontend espera a API em `http://127.0.0.1:8010` por padrão (configurável via `VITE_API_URL` no `.env` da raiz).

## Validação

```bash
npm test
npm run build
```

Os testes do frontend mockam a API (`src/test/mockApi.ts`) — não precisam do backend rodando. O backend ainda não tem suíte automatizada (`pytest`); validação hoje é manual via `curl` contra cada rota (ver `docs/SPEC.md` §13).

## Deploy (build de produção local)

```bash
npm run build
npm run preview   # serve dist/ em http://127.0.0.1:4174/
```

Porta fixa `4174` (a porta padrão do Vite, 4173, já é usada por outro projeto neste host). Diferente de `npm run dev`, aqui é o bundle de produção real (`dist/`), não o servidor de desenvolvimento — evita o problema de aba do navegador presa numa versão antiga por reconexão de HMR. Requer o backend (porta `8010`) e o Postgres (porta `5435`) no ar.

## Credenciais de demonstração

| Perfil | E-mail | Senha |
|---|---|---|
| Administrador | `admin@grafica.local` | `admin123` |
| Operador | `operador@grafica.local` | `operador123` |
| Consulta | `consulta@grafica.local` | `consulta123` |
| Administrador (TI SEMED) | `ti.semed@novaiguacu.rj.gov.br` | `semed123` |

## Escopo

- Login com perfis Administrador, Operador e Consulta, autenticação JWT contra o Postgres (senha com hash bcrypt).
- Dashboard com totais de cópias, solicitações, pendentes, prontas, entregues e consumo estimado de papel.
- Cadastro e gestão de solicitações com origem Escola ou Sede SEMED.
- Cálculo automático de faces impressas e folhas consumidas (no backend).
- Código único no padrão `CP-2026-0001` (gerado no backend).
- Filtros, busca, histórico de status, ranking de unidades e consolidação mensal.
- Cadastro de unidades escolares e setores.

## Arquitetura

- **Frontend:** `src/domains/<domain>/` (types/rules/repository/View por domínio) + `src/shell/` (login, sidebar/topbar, tema) — ver `docs/SPEC.md` §3.6.
- **Backend:** `backend/app/` (FastAPI + SQLAlchemy async + Alembic), um módulo por domínio (`db/models/`, `schemas/`, `api/routes/`), mesma intenção de isolamento do frontend.
- `src/domains/<domain>/repository.ts` fala com a API via `src/lib/apiClient.ts` (fetch + JWT Bearer) — regras de negócio (`rules.ts`) e componentes de apresentação (`<Domain>View.tsx`) não sabem que existe uma API por trás.
