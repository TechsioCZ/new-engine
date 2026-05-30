#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

export MEDUSA_E2E_COMPOSE_OVERRIDE_FILE="${MEDUSA_E2E_COMPOSE_OVERRIDE_FILE:-${ROOT_DIR}/docker-compose.e2e.local.yaml}"

exec bash "${ROOT_DIR}/scripts/e2e/medusa-be-http.sh" "$@"
