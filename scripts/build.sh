#!/usr/bin/env bash
# Builda a imagem Docker do Duplica, gravando o commit atual (GIT_SHA, exposto
# em GET /api/v1/health) e re-tageando o resultado como grafica:<VERSION> (do
# arquivo VERSION na raiz) e grafica:latest. Sempre use este script em vez de
# um `docker build`/`docker compose build` puro — sem o re-tag manual, a tag
# `latest` fica presa numa imagem antiga silenciosamente (mesma lição já
# documentada no build.sh do ForgeRouter, aplicada aqui de propósito).
set -euo pipefail
cd "$(dirname "$0")/.."

GIT_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
VERSION="$(cat VERSION 2>/dev/null || echo 0.0.0)"

echo "== Buildando grafica:${VERSION} (git ${GIT_SHA}) =="
docker build --build-arg GIT_SHA="${GIT_SHA}" -t "grafica:${VERSION}" -t grafica:latest .

echo "== OK — grafica:${VERSION} e grafica:latest atualizadas =="
