# Duplica

![License](https://img.shields.io/badge/license-MIT-green)
![React 19](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![TanStack Query](https://img.shields.io/badge/TanStack%20Query-5-FF4154?logo=reactquery&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3-06B6D4?logo=tailwindcss&logoColor=white)

Sistema web de controle de solicitações de cópia/impressão institucional: do pedido feito por uma escola ou unidade (sede administrativa, setor etc.) até a entrega confirmada — com histórico de status completo, assinatura digital de quem retirou as cópias, consolidação mensal de consumo de papel e notificação via WhatsApp.

Frontend em React 19 + TypeScript, backend próprio em Python/FastAPI + PostgreSQL. Interface 100% em português (pt-BR), sem i18n.

## Funcionalidades

**Solicitações**
- Ciclo de vida completo por status (Recebido → Em produção → Pronto → Entregue, ou Cancelado), com histórico auditável por fase e validação de ordem no backend.
- Cálculo automático de faces impressas e folhas consumidas — exibidas junto da estimativa de resmas (considera frente/frente-e-verso) — código único gerado no servidor, prioridade (Normal/Urgente/Institucional) e especificação completa de impressão (papel, grampo, layout, cor).
- Tela de consulta separada da de inclusão/edição (mesmo formulário, tela cheia), com tabela de colunas ordenáveis, filtro por período/texto e botão de limpar filtros.
- Confirmação de entrega em fluxo de tela cheia (não mais modal, para não perder os botões atrás do teclado virtual em telas pequenas), com resumo da solicitação, **assinatura digital** — captura num canvas, sem dependência externa — e nome de quem retirou.
- Compartilhamento de status via **WhatsApp**: um clique abre uma conversa com o solicitante já com a mensagem de status preenchida, assinada com o nome de quem está enviando (número institucional compartilhado por vários operadores).
- Relatórios prontos para impressão/PDF (impressão nativa do navegador, sem biblioteca de PDF).

**Dashboard e relatórios**
- Métricas separadas de faces impressas vs. folhas de papel consumidas vs. resmas estimadas.
- Ranking de locais por consumo de papel e por faces impressas, consolidação mensal, últimas solicitações.
- Botão "Sincronizar" para atualização manual dos dados e alternância de atualização automática (a cada 30s), disponível no menu de conta.

**Cadastros**
- Locais (escolas e setores), com código gerado no servidor, ativação/desativação e exclusão protegida quando já há solicitações vinculadas.
- Pessoas (solicitantes) por local, com matrícula e telefone, sob permissão própria (`managePeople`, dissociada da gestão de locais).
- Usuários com upload de foto de perfil (com fallback para iniciais caso a imagem falhe ao carregar).
- **Perfis de acesso configuráveis** — permissões por papel (Admin/Gerente/Operador/Consulta) editáveis em tela, não fixas em código; o perfil Admin é protegido e não pode ser alterado por ninguém, nem por outro Admin.

**Plataforma**
- Autenticação JWT (bcrypt) com login por usuário ou e-mail, rate limiting no login, sessão persistente ("permanecer conectado").
- Log de auditoria de toda mutação em solicitações, com filtros (ação, período, busca), colunas ordenáveis e expurgo automático após 60 dias.
- Painel "Sobre" autenticado, com versão da aplicação, revisão Git e revisão do banco (Alembic) aplicada em tempo de execução.
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
npm test         # Vitest (jsdom + Storybook/Chromium) — API mockada, não precisa do backend rodando
npm run build    # typecheck (tsc --noEmit) + build de produção
npm run test:e2e # Playwright, contra um Postgres/backend isolados (porta própria)
npm run storybook # catálogo de componentes de src/shared/ui/ (porta 6006)
```

```bash
cd backend && PYTHONPATH=. .venv/bin/pytest   # cobertura pytest ainda mínima (rota de versão do sistema)
```

O backend não tem suíte `pytest` abrangente ainda (só `backend/tests/test_system_version.py`); a validação das demais rotas segue manual, via `curl` (ver `docs/SPEC.md` §13).

## Credenciais de demonstração

> ⚠️ São dados de **seed** (`backend/app/db/seed.py`), pensados para ambiente local/demonstração. Troque as senhas antes de qualquer uso com dados reais.

Login aceita usuário ou e-mail, no mesmo campo.

| Perfil | Usuário | Senha |
|---|---|---|
| Administrador | `admin` | `admin123` |
| Administrador | `ti` | `ti12345` |
| Gerente | `gerente` | `gerente123` |
| Operador | `operador` | `operador123` |
| Consulta | `consulta` | `consulta123` |

## Duplica Pro

Este repositório é a edição **Community** do Duplica (MIT, uso livre inclusive comercial). Uma
edição **Pro**, com módulos adicionais (Parque de Impressão, bilhetagem por custo/local, entre
outros), é distribuída por contrato através dos Serviços da Darckware — inclui instalação,
suporte e atualizações contínuas. Não é um fork público; o código do Pro não fica neste
repositório.

## Licença

[MIT](LICENSE) — código aberto: pode ser usado, modificado e redistribuído, inclusive
comercialmente, mantendo o aviso de copyright.
