#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ENV_FILE:-${ROOT_DIR}/.env}"
LOCAL_DEV_RUNTIME_ENV_FILE="${LOCAL_DEV_RUNTIME_ENV_FILE:-${ROOT_DIR}/.docker_data/dev-runtime.env}"

# shellcheck source=scripts/dev/project-env.sh
. "$ROOT_DIR/scripts/dev/project-env.sh"

PROJECT_NAME="$(new_engine_project_name)"
export COMPOSE_PROJECT_NAME="$PROJECT_NAME"
LEGACY_PROJECT_NAME="${LEGACY_PROJECT_NAME:-new-engine}"

compose_command() {
  local arg command
  local skip_next=0

  for arg in "$@"; do
    if (( skip_next )); then
      skip_next=0
      continue
    fi

    case "$arg" in
      --ansi|-c|--context|--env-file|-f|--file|--parallel|--profile|--progress|--project-directory|-p|--project-name)
        skip_next=1
        ;;
      --ansi=*|-c=*|--context=*|--env-file=*|--file=*|--parallel=*|--profile=*|--progress=*|--project-directory=*|--project-name=*|-f=*|-p=*)
        ;;
      --*|-*)
        ;;
      *)
        command="$arg"
        break
        ;;
    esac
  done

  if [[ -n "${command:-}" ]]; then
    printf '%s\n' "$command"
    return 0
  fi

  return 1
}

needs_port_resolution() {
  local command="$1"

  case "$command" in
    build|config|create|run|up)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

stop_legacy_project_if_needed() {
  local command="$1"
  shift

  if [[ "$PROJECT_NAME" == "$LEGACY_PROJECT_NAME" ]]; then
    return 0
  fi

  case "$command" in
    create|run|up)
      docker compose -f docker-compose.yaml -p "$LEGACY_PROJECT_NAME" stop -t "${COMPOSE_STOP_TIMEOUT:-60}" >/dev/null 2>&1 || true
      ;;
    down)
      docker compose -f docker-compose.yaml -p "$LEGACY_PROJECT_NAME" "$@" >/dev/null 2>&1 || true
      ;;
  esac
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
  local command
  local compose_args=()

  cd "$ROOT_DIR"

  command="$(compose_command "$@" || true)"

  stop_legacy_project_if_needed "$command" "$@"

  if needs_port_resolution "$command"; then
    bash ./scripts/dev/mise-dev-helpers.sh resolve-local-ports >/dev/null
  fi

  while IFS= read -r -d '' arg; do
    compose_args+=("$arg")
  done < <(compose_env_args)

  if (( ${#compose_args[@]} > 0 )); then
    docker compose "${compose_args[@]}" -f docker-compose.yaml -p "$PROJECT_NAME" "$@"
  else
    docker compose -f docker-compose.yaml -p "$PROJECT_NAME" "$@"
  fi
}

main "$@"
