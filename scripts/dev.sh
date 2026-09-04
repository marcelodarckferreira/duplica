#!/usr/bin/env bash
# Modo dev: Postgres em Docker + backend (venv, uvicorn --reload) + frontend
# (Vite dev server, HMR) rodando nativos no host — sem build de imagem, pra
# iteração rápida. Idempotente: se algo já está rodando, não derruba, só avisa.
#
# Uso:
#   ./scripts/dev.sh           # Inicia ou garante que modo dev está rodando
#   ./scripts/dev.sh stop      # Para frontend e backend dev
#   ./scripts/dev.sh stop --all # Para frontend, backend e o container Postgres
#   ./scripts/dev.sh status    # Exibe o estado atual dos serviços dev
set -euo pipefail
cd "$(dirname "$0")/.."

DEV_DIR=".dev"
mkdir -p "$DEV_DIR"

is_running() {
  [ -f "$1" ] && kill -0 "$(cat "$1")" 2>/dev/null
}

stop_dev() {
  local stop_db=false
  for arg in "$@"; do
    if [ "$arg" = "--all" ] || [ "$arg" = "--with-db" ] || [ "$arg" = "--db" ]; then
      stop_db=true
    fi
  done

  echo "== Duplica — parando modo dev =="

  if is_running "$DEV_DIR/frontend.pid"; then
    local pid
    pid="$(cat "$DEV_DIR/frontend.pid")"
    echo "-> parando frontend (PID $pid)..."
    kill "$pid" 2>/dev/null || true
    rm -f "$DEV_DIR/frontend.pid"
  else
    echo "-> frontend não está rodando"
  fi

  if is_running "$DEV_DIR/backend.pid"; then
    local pid
    pid="$(cat "$DEV_DIR/backend.pid")"
    echo "-> parando backend (PID $pid)..."
    kill "$pid" 2>/dev/null || true
    rm -f "$DEV_DIR/backend.pid"
  else
    echo "-> backend não está rodando"
  fi

  if is_running "$DEV_DIR/print-fleet-worker.pid"; then
    local worker_pid
    worker_pid="$(cat "$DEV_DIR/print-fleet-worker.pid")"
    echo "-> parando worker do parque (PID $worker_pid)..."
    kill "$worker_pid" 2>/dev/null || true
    rm -f "$DEV_DIR/print-fleet-worker.pid"
  else
    echo "-> worker do parque não está rodando"
  fi

  if [ "$stop_db" = true ]; then
    echo "-> parando Postgres..."
    docker compose -p duplica stop postgres
  else
    echo "-> Postgres mantido rodando (use './scripts/dev.sh stop --all' para parar também o Postgres)"
  fi

  echo "== Modo dev finalizado =="
}

status_dev() {
  echo "== Status do Modo Dev =="
  if is_running "$DEV_DIR/frontend.pid"; then
    echo "Frontend:  rodando (PID $(cat "$DEV_DIR/frontend.pid")) - http://127.0.0.1:5173"
  else
    echo "Frontend:  parado"
  fi

  if is_running "$DEV_DIR/backend.pid"; then
    echo "Backend:   rodando (PID $(cat "$DEV_DIR/backend.pid")) - http://127.0.0.1:8010"
  else
    echo "Backend:   parado"
  fi

  if is_running "$DEV_DIR/print-fleet-worker.pid"; then
    echo "Worker:    rodando (PID $(cat "$DEV_DIR/print-fleet-worker.pid"))"
  else
    echo "Worker:    parado"
  fi

  if docker ps --filter "name=duplica_postgres" --filter "status=running" --format '{{.Names}}' | grep -q duplica_postgres; then
    echo "Postgres:  rodando (container duplica_postgres)"
  else
    echo "Postgres:  parado"
  fi
}

cmd="${1:-start}"

case "$cmd" in
  stop|--stop|down|--down)
    shift || true
    stop_dev "$@"
    exit 0
    ;;
  status|--status)
    status_dev
    exit 0
    ;;
  start|--start)
    # prossegue para inicialização abaixo
    ;;
  -h|--help)
    echo "Uso: $0 [start|stop|status] [--all]"
    echo "  start       Inicia o ambiente dev (padrão)"
    echo "  stop        Para o frontend e backend dev"
    echo "  stop --all  Para frontend, backend e o container Postgres"
    echo "  status      Exibe o estado atual dos serviços"
    exit 0
    ;;
esac

echo "== Duplica — modo dev =="

if ! docker ps --filter "name=duplica_postgres" --filter "status=running" --format '{{.Names}}' | grep -q duplica_postgres; then
  echo "-> subindo Postgres..."
  docker compose -p duplica up -d postgres
else
  echo "-> Postgres já rodando"
fi

echo "-> aguardando Postgres ficar saudável..."
until docker exec duplica_postgres pg_isready -U app -d duplica >/dev/null 2>&1; do sleep 1; done

echo "-> aplicando migrations..."
(cd backend && .venv/bin/alembic upgrade head)

if is_running "$DEV_DIR/backend.pid"; then
  echo "-> backend já rodando (PID $(cat "$DEV_DIR/backend.pid"))"
else
  echo "-> subindo backend (porta 8010, --reload)..."
  ( cd backend && exec .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8010 --reload --reload-exclude 'uploads' ) \
    > "$DEV_DIR/backend.log" 2>&1 &
  echo $! > "$DEV_DIR/backend.pid"
  disown
fi

if is_running "$DEV_DIR/print-fleet-worker.pid"; then
  echo "-> worker do parque já rodando (PID $(cat "$DEV_DIR/print-fleet-worker.pid"))"
else
  echo "-> subindo worker do parque de impressão..."
  ( cd backend && exec .venv/bin/python -m app.print_fleet.worker ) \
    > "$DEV_DIR/print-fleet-worker.log" 2>&1 &
  echo $! > "$DEV_DIR/print-fleet-worker.pid"
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
echo "Logs: $DEV_DIR/backend.log , $DEV_DIR/frontend.log , $DEV_DIR/print-fleet-worker.log"
