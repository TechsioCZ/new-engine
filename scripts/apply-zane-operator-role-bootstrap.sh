#!/usr/bin/env sh
set -eu

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required" >&2
  exit 1
fi

echo "Applying zane-operator role bootstrap to running docker-compose stack..."
docker compose run --rm --build zane-operator-bootstrap

if [ "${1:-}" = "--verify-idempotent" ]; then
  echo "Running zane-operator bootstrap second time to verify idempotency..."
  docker compose run --rm --build -e BOOTSTRAP_VERIFY_IDEMPOTENT=1 zane-operator-bootstrap
fi

echo "Done."
