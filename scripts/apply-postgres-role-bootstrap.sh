#!/usr/bin/env sh
set -eu

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required" >&2
  exit 1
fi

echo "Applying postgres role bootstrap to running medusa-db container..."
docker compose exec -T medusa-db /docker-entrypoint-initdb.d/01-zane-role-bootstrap.sh

echo "Done."
