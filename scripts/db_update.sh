#!/usr/bin/env bash
# Aplica as migrations do Alembic (mudanças de schema e de valores de dados —
# ex.: backend/alembic/versions/98d763f27206_*.py, que atualiza valores de
# 'origin' já gravados) no banco de produção. Cada migration roda em uma
# transação (Alembic com DDL transacional): se algo falhar no meio, o Postgres
# desfaz tudo sozinho e os dados existentes ficam intactos — não há
# drop/recreate de banco nem de tabelas em nenhum passo daqui.
#
# Uso:
#   ./scripts/db_update.sh
set -euo pipefail
cd "$(dirname "$0")/.."

if ! docker ps --filter "name=duplica_postgres" --filter "status=running" --format '{{.Names}}' | grep -q duplica_postgres; then
  echo "ERRO: container duplica_postgres não está rodando." >&2
  exit 1
fi

echo "== Duplica — atualização do banco de dados =="

echo "-> revisão atual:"
(cd backend && .venv/bin/alembic current)

echo "-> aplicando migrations..."
(cd backend && .venv/bin/alembic upgrade head)

CURRENT="$(cd backend && .venv/bin/alembic current 2>/dev/null | head -1 | cut -d' ' -f1)"
HEAD="$(cd backend && .venv/bin/alembic heads 2>/dev/null | head -1 | cut -d' ' -f1)"

if [ -z "$CURRENT" ] || [ "$CURRENT" != "$HEAD" ]; then
  echo "ERRO: schema não chegou na revisão mais recente após a migration." >&2
  echo "Revisão atual: ${CURRENT:-<vazia>} / esperada: $HEAD" >&2
  exit 1
fi

echo
echo "== Banco atualizado com sucesso (revisão $HEAD) =="
