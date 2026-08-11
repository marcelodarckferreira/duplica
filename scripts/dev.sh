#!/usr/bin/env bash
# Modo dev: Postgres em Docker + backend (venv, uvicorn --reload) + frontend
# (Vite dev server, HMR) rodando nativos no host — sem build de imagem, pra
# iteração rápida. Idempotente: se algo já está rodando, não derruba, só avisa.
# Use scripts/pro.sh para o deploy containerizado e versionado.
set -euo pipefail
cd "$(dirname "$0")/.."

DEV_DIR=".dev"
mkdir -p "$DEV_DIR"

is_running() {
  [ -f "$1" ] && kill -0 "$(cat "$1")" 2>/dev/null
}

echo "== Duplica — modo dev =="

if ! docker ps --filter "name=grafica_postgres" --filter "status=running" --format '{{.Names}}' | grep -q grafica_postgres; then
  echo "-> subindo Postgres..."
  docker compose -p grafica up -d postgres
else
  echo "-> Postgres já rodando"
fi

echo "-> aguardando Postgres ficar saudável..."
until docker exec grafica_postgres pg_isready -U app -d grafica >/dev/null 2>&1; do sleep 1; done

echo "-> aplicando migrations..."
(cd backend && .venv/bin/alembic upgrade head)

if is_running "$DEV_DIR/backend.pid"; then
  echo "-> backend já rodando (PID $(cat "$DEV_DIR/backend.pid"))"
else
  echo "-> subindo backend (porta 8010, --reload)..."
  ( cd backend && exec .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8010 --reload ) \
    > "$DEV_DIR/backend.log" 2>&1 &
  echo $! > "$DEV_DIR/backend.pid"
  disown
fi

if is_running "$DEV_DIR/frontend.pid"; then
  echo "-> frontend já rodando (PID $(cat "$DEV_DIR/frontend.pid"))"
else
  echo "-> subindo frontend dev (porta 5173)..."
  # exec direto no binário do vite (não via `npm run dev`) — `npm` roda o
  # comando num processo filho, então `$!` capturaria o PID do wrapper `npm`,
  # não do node real; matar esse PID depois deixava o vite órfão rodando.
  ( exec ./node_modules/.bin/vite --host 127.0.0.1 --port 5173 ) > "$DEV_DIR/frontend.log" 2>&1 &
  echo $! > "$DEV_DIR/frontend.pid"
  disown
fi

sleep 2
echo
echo "== Duplica em modo dev =="
echo "Frontend (HMR): http://127.0.0.1:5173"
echo "Backend:        http://127.0.0.1:8010"
echo "Logs: $DEV_DIR/backend.log , $DEV_DIR/frontend.log"
