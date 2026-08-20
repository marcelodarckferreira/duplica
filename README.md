# Duplica

![React 19](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![TanStack Query](https://img.shields.io/badge/TanStack%20Query-5-FF4154?logo=reactquery&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3-06B6D4?logo=tailwindcss&logoColor=white)

Sistema web de controle de solicitações de cópia/impressão para a **SEMED** (Secretaria Municipal de Educação): do pedido feito por uma escola ou setor até a entrega confirmada — com histórico de status completo, assinatura digital de quem retirou as cópias, consolidação mensal de consumo de papel e notificação via WhatsApp.

Frontend em React 19 + TypeScript, backend próprio em Python/FastAPI + PostgreSQL. Interface 100% em português (pt-BR), sem i18n.

## Funcionalidades

**Solicitações**
- Ciclo de vida completo por status (Recebido → Em produção → Pronto → Entregue, ou Cancelado), com histórico auditável por fase e validação de ordem no backend.
- Cálculo automático de faces impressas e folhas consumidas (considera frente/frente-e-verso), código único gerado no servidor, prioridade (Normal/Urgente/Institucional) e especificação completa de impressão (papel, grampo, layout, cor).
- Confirmação de entrega com **assinatura digital** — captura num canvas (sem dependência externa), armazenada junto do nome de quem retirou.
- Compartilhamento de status via **WhatsApp**: um clique abre uma conversa com o solicitante já com a mensagem de status preenchida, assinada com o nome de quem está enviando (número institucional compartilhado por vários operadores).
- Relatórios prontos para impressão/PDF (impressão nativa do navegador, sem biblioteca de PDF).

**Dashboard e relatórios**
- Métricas separadas de faces impressas vs. folhas de papel consumidas vs. resmas estimadas.
- Ranking de locais por consumo de papel e por faces impressas, consolidação mensal, últimas solicitações.

**Cadastros**
- Locais (escolas e setores), com código gerado no servidor, ativação/desativação e exclusão protegida quando já há solicitações vinculadas.
- Pessoas (solicitantes) por local, com matrícula e telefone.
- Usuários com upload de foto de perfil.
- **Perfis de acesso configuráveis** — permissões por papel (Admin/Gerente/Operador/Consulta) editáveis em tela, não fixas em código.

**Plataforma**
- Autenticação JWT (bcrypt), rate limiting no login, sessão persistente ("permanecer conectado").
- Log de auditoria de toda mutação em solicitações, com expurgo automático após 60 dias.
- Tema claro/escuro/sistema.

## Stack

| Camada | Tecnologias |
|---|---|
| Frontend | React 19 · Vite 6 · TypeScript (strict) · TanStack Query · React Hook Form + Zod · Radix UI · Tailwind CSS |
| Backend | FastAPI · SQLAlchemy 2.0 (async) · Alembic · PostgreSQL 16 · python-jose (JWT) · passlib/bcrypt · slowapi (rate limiting) |
| Testes | Vitest + Testing Library (frontend, API mockada) · Playwright (E2E) · Storybook |
| Deploy | Docker (imagem única, frontend empacotado no backend) · Docker Compose |

## Arquitetura

Organização **por domínio de negócio** nos dois lados, não por tipo de arquivo:

```
src/
├── app/                      # shell da aplicação: login, sidebar, tema, AppShell
├── features/
│   ├── requests/              # solicitações — types, rules, repository, queries, UI
│   ├── units/                 # locais
│   ├── people/                 # pessoas
│   ├── users/                 # usuários e perfis de acesso
│   ├── reports/                # dashboard e consolidações
│   └── audit/                  # log de auditoria
└── shared/                    # UI base (Radix), api client, utils

backend/app/
├── core/                      # config, segurança, permissões, regras de impressão, auditoria
├── db/models/                  # SQLAlchemy — um módulo por domínio
├── schemas/                    # Pydantic — contratos de entrada/saída
└── api/routes/                 # um router por domínio, cada um sob require_permission(...)
```

Cada domínio de frontend segue o mesmo formato: `types.ts` (tipos), `model/rules.ts` (regras puras, testadas isoladamente), `api/repository.ts` (chamadas HTTP, mapeamento snake_case ↔ camelCase), `model/queries.ts` (hooks TanStack Query) e `ui/<Domain>View.tsx` (componente de apresentação, sem lógica de rede própria).

Documentação técnica completa — decisões de arquitetura, contratos e histórico — em [`docs/SPEC.md`](docs/SPEC.md).

## Como rodar

### Modo dev (iteração rápida, nativo)

```bash
cp .env.example .env   # preencha POSTGRES_PASSWORD e JWT_SECRET
./scripts/dev.sh       # Postgres (Docker) + backend (venv, --reload) + frontend (Vite, HMR)
```

- Frontend: `http://127.0.0.1:5173`
- API: `http://127.0.0.1:8010`
- `./scripts/dev.sh stop` / `stop --all` / `status` para controlar os serviços.

Passo a passo manual (o que o script automatiza), caso prefira rodar cada peça à mão:

```bash
# 1. Banco
docker compose up -d postgres

# 2. Backend
cd backend
python3.11 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/alembic upgrade head
.venv/bin/python -m app.db.seed      # dados de demonstração (idempotente)
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8010

# 3. Frontend
npm install
npm run dev
```

### Modo produção (containerizado)

```bash
./scripts/pro.sh
```

Builda uma imagem Docker única (frontend estático servido pelo próprio backend), aplica as migrations e sobe tudo via Docker Compose em `http://127.0.0.1:8010`. `GET /api/v1/health` expõe `version` e `git_sha` da imagem em execução, para confirmar que o que está no ar corresponde ao commit esperado.

## Testes

```bash
npm test         # Vitest — API mockada, não precisa do backend rodando
npm run build    # typecheck (tsc --noEmit) + build de produção
npm run test:e2e # Playwright, contra um Postgres/backend isolados (porta própria)
```

O backend ainda não tem suíte automatizada própria (`pytest`); validação de rota hoje é manual.

## Credenciais de demonstração

> ⚠️ São dados de **seed** (`backend/app/db/seed.py`), pensados para ambiente local/demonstração. Troque as senhas antes de qualquer uso com dados reais.

Login aceita usuário ou e-mail, no mesmo campo.

| Perfil | Usuário | Senha |
|---|---|---|
| Administrador | `admin` | `admin123` |
| Gerente | `gerente` | `gerente123` |
| Operador | `operador` | `operador123` |
| Consulta | `consulta` | `consulta123` |

## Licença

Uso interno — SEMED.
