# Duplica — Backend

API real do Duplica: FastAPI + SQLAlchemy 2.0 (async) + asyncpg + Alembic + Postgres. Ver `docs/SPEC.md` §3.2 para a decisão de arquitetura completa.

## Rodar localmente

```bash
python3.11 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/alembic upgrade head       # cria as tabelas
.venv/bin/python -m app.db.seed      # popula dados demo (idempotente)
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8010
```

Requer o Postgres do `docker-compose.yml` (raiz do projeto) no ar e um `.env` (raiz do projeto) com `POSTGRES_PASSWORD` e `JWT_SECRET`.

## Nova migration

Depois de alterar um model em `app/db/models/` (mudança de schema):

```bash
.venv/bin/alembic revision --autogenerate -m "descrição da mudança"
```

Para uma migration que só atualiza valores já gravados, sem mudar schema (ex.: `05_..._rename_administrador_role_to_admin.py`, `13_..._rename_origin_values_to_escola_and_sede.py`), use `alembic revision -m "..."` (sem `--autogenerate`) e escreva o(s) `op.execute("UPDATE ...")` à mão no `upgrade()`/`downgrade()`.

Os arquivos de migration **não** ficam no padrão do Alembic (`alembic/versions/`) — moram em `../docs/version/v01/` (fora de `backend/`, via `version_locations` em `alembic.ini`), com prefixo numérico sequencial (`01_`, `02_`, ...) só pra dar controle visual da ordem em que as atualizações do banco foram criadas. O Alembic identifica cada migration pelos campos internos `revision`/`down_revision`, não pelo nome/local do arquivo, então isso não afeta a execução. Ver `docs/version/DATABASE_UPDATES.md` para o índice completo e o histórico. Revise o arquivo gerado antes de aplicar (`alembic upgrade head`); ele já nasce em `docs/version/v01/`, então só falta renomeá-lo prefixando com o próximo número da sequência (ex.: depois de `13_...` vem `14_...`) e adicionar uma linha na tabela de histórico.

## Por que Python/FastAPI e não C#/ASP.NET Core

O SPEC.md original previa ASP.NET Core. A decisão foi trocada (2026-08-10) a pedido explícito do operador, com a política: **Python para aplicações pequenas, C#/.NET para desenvolvimentos grandes** — não é uma reavaliação de qual stack é "mais segura" (nenhuma das duas é objetivamente mais segura no vácuo; segurança depende de como cada uma é implementada, não da linguagem).

| | Python (FastAPI) | Node/TypeScript | C#/.NET |
|---|---|---|---|
| Performance | Boa; GIL limita paralelismo real em CPU-bound | Ótima para I/O-bound (event loop); mesma limitação em CPU-bound | Melhor performance bruta, compilado, multi-thread real |
| Tipagem | Dinâmica + type hints (Pydantic valida em runtime) | Dinâmica + TypeScript (só compile-time) | Estática, forte, compilada |
| Ecossistema web | FastAPI/Django, maduro para APIs e dados/IA | Enorme (npm), mesma linguagem do frontend | ASP.NET Core, muito usado em corporativo/governo |
| Deploy | Simples (uvicorn + venv/Docker) | Simples (node + Docker) | Runtime .NET, um pouco mais pesado |
| Neste projeto | Escolhido: consistência com o ForgeHub (mesmo padrão de auth) + facilidade de estender com IA depois | Mesma linguagem do frontend grafica | Era o plano original do SPEC.md |

Padrão de segurança replicado do ForgeHub (JWT Bearer + bcrypt), corrigindo os gaps que o ForgeHub tem hoje:

| Gap no ForgeHub | Neste backend |
|---|---|
| CORS `allow_origins=["*"]` | CORS restrito às origens em `Settings.CORS_ORIGINS` |
| Sem rate limit no login | `slowapi`, 5 tentativas/minuto por IP em `POST /api/v1/auth/token` |
| `JWT_SECRET` com default inseguro hardcoded | Sem default — `Settings` falha ao iniciar se ausente no `.env` |
| Usuário dev hardcoded (`admin`/`admin`) | Login só via tabela `users`, sem bootstrap embutido no código |
