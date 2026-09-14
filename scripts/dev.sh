#!/usr/bin/env bash
# Runs the complete local dev stack: Postgres (Docker), the API, and the Ionic
# client, in one command. Ctrl+C stops the API/client; Postgres keeps running
# in the background (its data lives in a Docker volume) — `docker compose down`
# to stop it too.
set -euo pipefail
cd "$(dirname "$0")/.."

export PATH="$PATH:$HOME/.dotnet/tools"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required (Postgres runs in a container) — see https://docs.docker.com/get-docker/" >&2
  exit 1
fi
if ! command -v dotnet >/dev/null 2>&1; then
  echo ".NET 10 SDK is required — see https://dotnet.microsoft.com/download" >&2
  exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "Node.js/npm is required for the Angular client — see https://nodejs.org" >&2
  exit 1
fi

if ! command -v dotnet-ef >/dev/null 2>&1; then
  echo "==> Installing dotnet-ef (one-time)..."
  dotnet tool install --global dotnet-ef
fi

if [ ! -d client/node_modules ]; then
  echo "==> Installing client dependencies (one-time)..."
  npm --prefix client install
fi

echo "==> Starting Postgres..."
docker compose up -d --wait postgres

echo "==> Applying EF Core migrations..."
dotnet ef database update \
  --project src/Corkboard.Infrastructure \
  --startup-project src/Corkboard.Api

echo "==> Starting API (https://localhost:7127) and client (Ionic dev server)..."
npx --yes concurrently --kill-others --names API,CLIENT --prefix-colors "blue,green" \
  "dotnet run --project src/Corkboard.Api" \
  "npm --prefix client start"
