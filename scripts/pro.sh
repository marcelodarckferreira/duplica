#!/usr/bin/env bash
# Modo produção (local): builda a imagem versionada (scripts/build.sh — frontend
# empacotado dentro da mesma imagem do backend, ver Dockerfile), aplica
# migrations e sobe Postgres + app via Docker Compose. Ao contrário de dev.sh,
# sempre para uma instância anterior do serviço "app" antes de subir a nova —
# um deploy deve sempre refletir o build mais recente.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== Duplica — modo produção (deploy containerizado) =="

echo "-> buildando imagem..."
./scripts/build.sh

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

echo "-> subindo app (imagem duplica:latest)..."
docker compose -p duplica up -d app

echo "-> aguardando app ficar saudável..."
for _ in $(seq 1 30); do
  status="$(docker inspect --format '{{.State.Health.Status}}' duplica_app 2>/dev/null || echo starting)"
  [ "$status" = "healthy" ] && break
  sleep 2
done

echo
echo "== Duplica em modo produção =="
curl -s http://127.0.0.1:8010/api/v1/health && echo
echo "App: http://127.0.0.1:8010"
echo "Logs: docker logs -f duplica_app"
