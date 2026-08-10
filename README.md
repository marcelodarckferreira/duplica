# Duplica

![React 19](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)

Sistema web de controle de cópias/impressões para a SEMED: solicitações originadas por escolas ou pela Sede, produção, entrega, histórico de status, ranking de unidades, consolidação mensal e trilha de auditoria. Frontend em React/TypeScript, backend real em Python/FastAPI + Postgres (ver `docs/SPEC.md` §3.2 para a decisão de stack).

## Funcionalidades

- Login com perfis Administrador, Operador e Consulta — autenticação JWT contra o Postgres (senha com hash bcrypt), permissões aplicadas tanto no frontend quanto no backend.
- Dashboard com totais de cópias, solicitações, pendentes, prontas, entregues, consumo estimado de papel, ranking de unidades e consolidação mensal — tudo numa única tela.
- Solicitações: tela de consulta separada da tela de edição/inclusão, com cálculo automático de faces impressas/folhas consumidas e código único (`CP-2026-0001`) gerados no backend, filtros, busca, histórico de status e confirmação de exclusão via modal.
- Cadastro de unidades escolares e setores.
- Cadastro de usuários com upload de foto de perfil, também em tela de consulta separada da tela de edição/inclusão.
- Log de auditoria das solicitações (criação, edição, exclusão, mudança de status), com expurgo automático após 60 dias.
- Navegação em tela única por regra de negócio (consulta nunca ao lado do formulário de inclusão/edição) e sidebar agrupada por seção — mesmo padrão usado no ForgeHub.

## Stack

- **Frontend:** React 19 + Vite 6 + TypeScript (strict), organizado por domínio (`src/domains/<domain>/`), Tailwind CSS na "casca" da aplicação (login/sidebar) e na tela de Solicitações, CSS global nas demais telas de conteúdo.
- **Backend:** Python/FastAPI + SQLAlchemy 2.0 async + Alembic + PostgreSQL, JWT Bearer + bcrypt, rate limiting no login, expurgo automático do log de auditoria via APScheduler.

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

Diferente de `npm run dev`, aqui é o bundle de produção real (`dist/`), não o servidor de desenvolvimento. Requer o backend (porta `8010`) e o Postgres (porta `5435`) no ar.

## Credenciais de demonstração

| Perfil | E-mail | Senha |
|---|---|---|
| Administrador | `admin@grafica.local` | `admin123` |
| Operador | `operador@grafica.local` | `operador123` |
| Consulta | `consulta@grafica.local` | `consulta123` |

> Dados de seed (`backend/app/db/seed.py`) para ambiente local/demonstração — troque as senhas antes de qualquer uso real.

## Arquitetura

- **Frontend:** `src/domains/<domain>/` (types/rules/repository/View por domínio) + `src/shell/` (login, sidebar/topbar, tema) — ver `docs/SPEC.md` §3.6.
- **Backend:** `backend/app/` (FastAPI + SQLAlchemy async + Alembic), um módulo por domínio (`db/models/`, `schemas/`, `api/routes/`), mesma intenção de isolamento do frontend.
- `src/domains/<domain>/repository.ts` fala com a API via `src/lib/apiClient.ts` (fetch + JWT Bearer) — regras de negócio (`rules.ts`) e componentes de apresentação (`<Domain>View.tsx`) não sabem que existe uma API por trás.
- Documentação completa em [`docs/SPEC.md`](docs/SPEC.md).

## Resumo do que foi aplicado

- Migração da UI de MVP em `localStorage` para persistência real em Postgres, com backend próprio (Python/FastAPI) e autenticação JWT.
- Frontend reorganizado por domínio (`requests`, `units`, `users`, `reports`, `audit`), espelhando a separação de módulos do backend.
- Tela de login e sidebar/menu de conta em Tailwind CSS (padrão hand-rolled "estilo shadcn"); as demais telas de conteúdo permanecem em CSS puro, exceto a tela de Solicitações, que também usa Tailwind nos ícones de ação, no formulário em tela cheia e no modal de confirmação de exclusão.
- Tela de Solicitações dividida em consulta (lista) e edição/inclusão (formulário em tela cheia), com ações de editar/excluir por linha.
- Log de auditoria das solicitações (criação, edição, exclusão, mudança de status), com expurgo automático agendado após 60 dias de retenção.
- Upload de foto de perfil para usuários, armazenado em disco no backend.
- Permissões por perfil (Administrador/Operador/Consulta) aplicadas tanto no frontend quanto no backend.

Histórico de decisões, trade-offs e o estado atual de cada seção está em [`docs/SPEC.md`](docs/SPEC.md).
