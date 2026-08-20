# Controle de Atualizações do Banco de Dados — Duplica

Registro de como as atualizações do banco de produção são versionadas, aplicadas e auditadas.

## Produção

- **Servidor:** `172.15.2.5`
- **Diretório de instalação:** `/media/db/duplica`

## Como as atualizações são controladas

Toda mudança no banco (schema ou valores de dados já gravados) vira uma migration do Alembic. Os
scripts em si moram em `docs/version/v01/` — não em `backend/alembic/versions/`, o padrão do
Alembic — via `version_locations` configurado em `backend/alembic.ini`, pra ficarem junto da
documentação do projeto. O Alembic identifica cada migration pelos campos internos `revision`/
`down_revision` dentro do arquivo — não pelo nome do arquivo nem da pasta — então os arquivos têm
um prefixo numérico sequencial (`01_`, `02_`, ...) só para dar controle visual da ordem cronológica
real das atualizações ao listar a pasta.

Este arquivo (`docs/version/DATABASE_UPDATES.md`) é o índice de controle: fica na raiz de
`docs/version/`, um nível acima das pastas `v0N/`. Quando a versão do app mudar (arquivo `VERSION`
na raiz do projeto), as migrations novas passam a ir para uma pasta `v02/` nova — este índice
continua único, cobrindo todas as versões.

Aplicar as migrations pendentes: `scripts/db_update.sh` (roda `alembic upgrade head` e confere que
o banco chegou na revisão mais recente). Cada migration roda dentro de uma transação — se algo
falhar no meio, o Postgres desfaz tudo sozinho, sem perda de dados e sem apagar/recriar banco ou
tabelas em nenhum passo.

## Histórico de atualizações

| # | Revisão | Descrição |
|---|---------|-----------|
| 01 | `bf7fc02c8256` | Schema inicial |
| 02 | `07e3597bf61f` | Tabela `audit_log` |
| 03 | `757452e7ab19` | `avatar_path` em `users` |
| 04 | `e4687d66643b` | `username` em `users` |
| 05 | `13180a216b60` | Renomeia papel `Administrador` para `Admin` (valores) |
| 06 | `40e91ff86d59` | Flag `is_system` em `users` |
| 07 | `49103c221504` | Tabela `role_permissions` |
| 08 | `e6bef415cea2` | `registration_number` em `copy_requests` |
| 09 | `f58e15f2fb2b` | Tabela `people` + `staple` em `copy_requests` |
| 10 | `bcc9749f5c30` | `layout` em `copy_requests` |
| 11 | `4245329c67ae` | Amplia coluna `paper` em `copy_requests` |
| 12 | `c6ab4b463b02` | `signature` em `copy_requests` |
| 13 | `98d763f27206` | Renomeia valores de `origin` para `ESCOLA`/`SEDE` (valores) |

## Criar uma nova atualização

- **Mudança de schema** (nova coluna/tabela): `.venv/bin/alembic revision --autogenerate -m "descrição"`, revisar o arquivo gerado.
- **Só valores já gravados**, sem mudar schema (como as revisões 05 e 13): `.venv/bin/alembic revision -m "descrição"` (sem `--autogenerate`) e escrever `op.execute("UPDATE ...")` à mão em `upgrade()`/`downgrade()`.
- Renomear o arquivo gerado prefixando com o próximo número da sequência (depois de `13_...` vem `14_...`) e adicionar uma linha nesta tabela.
- Aplicar com `scripts/db_update.sh`.
