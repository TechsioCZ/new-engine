#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ENV_FILE:-${ROOT_DIR}/.env}"
LOCAL_DEV_RUNTIME_ENV_FILE="${LOCAL_DEV_RUNTIME_ENV_FILE:-${ROOT_DIR}/.docker_data/dev-runtime.env}"
PROJECT_NAME="${PROJECT_NAME:-new-engine}"

needs_port_resolution() {
  local arg

  for arg in "$@"; do
    case "$arg" in
      build|config|create|restart|run|start|up)
        return 0
        ;;
    esac
  done

  return 1
}

compose_env_args() {
  if [[ -f "$ENV_FILE" ]]; then
    printf '%s\0%s\0' "--env-file" "$ENV_FILE"
  fi

  if [[ -f "$LOCAL_DEV_RUNTIME_ENV_FILE" ]]; then
    printf '%s\0%s\0' "--env-file" "$LOCAL_DEV_RUNTIME_ENV_FILE"
  fi
}

main() {
  local compose_args=()

  cd "$ROOT_DIR"

  if needs_port_resolution "$@"; then
    bash ./scripts/dev/mise-dev-helpers.sh resolve-local-ports >/dev/null
  fi

  while IFS= read -r -d '' arg; do
    compose_args+=("$arg")
  done < <(compose_env_args)

  docker compose "${compose_args[@]}" -f docker-compose.yaml -p "$PROJECT_NAME" "$@"
}

main "$@"
