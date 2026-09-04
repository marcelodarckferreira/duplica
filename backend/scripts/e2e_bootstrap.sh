#!/usr/bin/env bash
# Prepara um banco Postgres isolado (duplica_test) e sobe o backend apontado
# pra ele, na porta 8011 — nunca toca no banco real (duplica) usado no dia a
# dia. Chamado pelo playwright.config.ts como webServer da suíte E2E.
#
# Recria o banco do zero a cada execução (drop + create) pra garantir estado
# determinístico entre rodadas de teste — seguro porque é sempre o mesmo
# banco descartável, nunca o de produção/dev.
set -euo pipefail
cd "$(dirname "$0")/.."

TEST_DB="duplica_test"

# Guarda de segurança: se alguém rodar este script com POSTGRES_DB apontando
# pra outra coisa (ex.: variável de ambiente vazando de outro terminal), abortar
# em vez de arriscar recriar o banco errado.
if [ -n "${POSTGRES_DB:-}" ] && [ "${POSTGRES_DB}" != "$TEST_DB" ]; then
  echo "ERRO: POSTGRES_DB='$POSTGRES_DB' definido no ambiente, mas este script só pode rodar contra '$TEST_DB'." >&2
  exit 1
fi

if ! docker ps --filter "name=duplica_postgres" --filter "status=running" --format '{{.Names}}' | grep -q duplica_postgres; then
  echo "ERRO: container duplica_postgres não está rodando. Suba com scripts/dev.sh antes de rodar os testes E2E." >&2
  exit 1
fi

echo "-> recriando banco de teste '$TEST_DB'..."
docker exec duplica_postgres psql -U app -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS $TEST_DB;"
docker exec duplica_postgres psql -U app -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE $TEST_DB OWNER app;"

export POSTGRES_DB="$TEST_DB"
export CORS_ORIGINS="http://127.0.0.1:5174"
export SNMP_CREDENTIAL_ENCRYPTION_KEY="duplica-e2e-isolated-key-not-for-production"
export PRINT_FLEET_SNMP_TRANSPORT="simulated"
export PRINT_FLEET_WORKER_IDLE_SECONDS="0.05"

echo "-> aplicando migrations em '$TEST_DB'..."
.venv/bin/alembic upgrade head

echo "-> semeando dados de demonstração em '$TEST_DB'..."
.venv/bin/python -m app.db.seed

echo "-> subindo backend de teste na porta 8011..."
echo "-> subindo worker SNMP simulado (somente E2E)..."
.venv/bin/python -m app.print_fleet.worker &
FLEET_WORKER_PID=$!
trap 'kill "$FLEET_WORKER_PID" 2>/dev/null || true' EXIT
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8011
