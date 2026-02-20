#!/usr/bin/env sh
set -eu

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required" >&2
  exit 1
fi

echo "Applying postgres role bootstrap (medusa_app/medusa_dev) to running medusa-db container..."
docker compose exec -T medusa-db /docker-entrypoint-initdb.d/01-zane-role-bootstrap.sh

if [ "${1:-}" = "--verify-idempotent" ]; then
  echo "Running bootstrap second time to verify idempotency..."
  docker compose exec -T medusa-db /docker-entrypoint-initdb.d/01-zane-role-bootstrap.sh
fi

echo "Done."
