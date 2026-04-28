#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.e2e.yaml"
ENV_FILE="${MEDUSA_E2E_ENV_FILE:-${ROOT_DIR}/apps/medusa-be/.env.e2e}"
PROJECT_NAME="${MEDUSA_E2E_PROJECT_NAME:-new-engine-e2e}"
WAIT_TIMEOUT_SECONDS="${MEDUSA_E2E_WAIT_TIMEOUT_SECONDS:-300}"
KEEP_STACK="${MEDUSA_E2E_KEEP_STACK:-0}"
TEST_TARGET="${MEDUSA_E2E_TEST_TARGET:-integration-tests/http/*.spec.ts}"
TEST_TYPE_VALUE="${MEDUSA_E2E_TEST_TYPE:-integration:http}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "$1 is required" >&2
    exit 1
  fi
}

load_env() {
  if [[ ! -f "$ENV_FILE" ]]; then
    echo "Missing e2e env file: $ENV_FILE" >&2
    exit 1
  fi

  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a

  WAIT_TIMEOUT_SECONDS="${MEDUSA_E2E_WAIT_TIMEOUT_SECONDS:-${WAIT_TIMEOUT_SECONDS}}"
}

compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" -p "$PROJECT_NAME" "$@"
}

backend_url() {
  printf '%s' "${MEDUSA_E2E_BACKEND_URL:?MEDUSA_E2E_BACKEND_URL is required}"
}

logs() {
  compose logs --no-color
}

down() {
  compose down --volumes --remove-orphans --timeout "${COMPOSE_STOP_TIMEOUT:-60}"
}

up() {
  compose up -d --build
}

wait_for_backend() {
  local url started_at now
  url="$(backend_url)"
  started_at="$(date +%s)"

  echo "Waiting for isolated Medusa e2e backend at ${url}"

  while true; do
    if curl -fsS "${url}/health" >/dev/null 2>&1; then
      echo "e2e-medusa-be: healthy"
      return 0
    fi

    now="$(date +%s)"
    if (( now - started_at >= WAIT_TIMEOUT_SECONDS )); then
      echo "Timed out waiting for e2e-medusa-be to become healthy" >&2
      compose ps >&2 || true
      logs >&2 || true
      return 1
    fi

    sleep 2
  done
}

run_tests() {
  local app_dir
  app_dir="${ROOT_DIR}/apps/medusa-be"

  echo "Running Medusa BE e2e tests: ${TEST_TARGET}"

  (
    cd "$app_dir"
    MEDUSA_E2E_BACKEND_URL="$(backend_url)" \
      MEDUSA_E2E_ADMIN_EMAIL="${MEDUSA_E2E_ADMIN_EMAIL:?MEDUSA_E2E_ADMIN_EMAIL is required}" \
      MEDUSA_E2E_ADMIN_PASSWORD="${MEDUSA_E2E_ADMIN_PASSWORD:?MEDUSA_E2E_ADMIN_PASSWORD is required}" \
      TEST_TYPE="$TEST_TYPE_VALUE" \
      NODE_OPTIONS=--experimental-vm-modules \
      pnpm exec jest --runInBand --silent=false ${TEST_TARGET}
  )
}

run() {
  if [[ "$KEEP_STACK" != "1" ]]; then
    trap down EXIT
  fi

  up
  wait_for_backend

  if ! run_tests; then
    echo "Medusa BE e2e tests failed; dumping compose logs" >&2
    logs >&2 || true
    return 1
  fi
}

usage() {
  cat <<'USAGE'
Usage: scripts/e2e/medusa-be-http.sh <command>

Commands:
  up      Start the isolated Medusa BE e2e stack
  wait    Wait for the isolated backend health endpoint
  test    Run Medusa BE HTTP e2e Jest specs against the isolated backend
  logs    Print compose logs for the isolated stack
  down    Stop and remove the isolated e2e stack and volumes
  run     Start stack, wait for health, run tests, and teardown unless MEDUSA_E2E_KEEP_STACK=1

Environment:
  MEDUSA_E2E_ENV_FILE         Path to env file (default: apps/medusa-be/.env.e2e)
  MEDUSA_E2E_PROJECT_NAME     Docker compose project name (default: new-engine-e2e)
  MEDUSA_E2E_BACKEND_URL      Required backend URL used both for health checks and by Jest
  MEDUSA_E2E_BACKEND_PORT     Optional host port for docker-compose publishing only (used by env interpolation)
  MEDUSA_E2E_WAIT_TIMEOUT_SECONDS  Health wait timeout in seconds (default: 300)
  MEDUSA_E2E_KEEP_STACK       Set to 1 to keep containers running after `run`
  MEDUSA_E2E_TEST_TARGET      Jest target, file, or glob (default: integration-tests/http/*.spec.ts)
USAGE
}

main() {
  local command="${1:-run}"

  require_cmd docker
  require_cmd pnpm
  require_cmd curl
  load_env

  case "$command" in
    up)
      up
      ;;
    wait)
      wait_for_backend
      ;;
    test)
      run_tests
      ;;
    logs)
      logs
      ;;
    down)
      down
      ;;
    run)
      run
      ;;
    -h|--help|help)
      usage
      ;;
    *)
      echo "Unknown command: $command" >&2
      usage >&2
      exit 1
      ;;
  esac
}

main "$@"
