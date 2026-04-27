#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOCAL_DEV_RUNTIME_ENV_FILE="${LOCAL_DEV_RUNTIME_ENV_FILE:-${ROOT_DIR}/.docker_data/dev-runtime.env}"

# shellcheck source=scripts/dev/project-env.sh
. "$ROOT_DIR/scripts/dev/project-env.sh"

PROJECT_NAME="$(new_engine_project_name)"
export COMPOSE_PROJECT_NAME="$PROJECT_NAME"

runtime_value() {
  local key="$1"

  if [[ ! -f "$LOCAL_DEV_RUNTIME_ENV_FILE" ]]; then
    return 0
  fi

  awk -F= -v key="$key" '$1 == key {
    value = substr($0, index($0, "=") + 1)
    gsub(/^"|"$/, "", value)
    print value
    exit
  }' "$LOCAL_DEV_RUNTIME_ENV_FILE"
}

print_url() {
  local label="$1"
  local value="$2"

  if [[ -n "$value" ]]; then
    printf "  %-18s %s\n" "$label:" "$value"
  fi
}

local_http_url() {
  local host="$1"
  local port="$2"

  if [[ "$port" == "80" ]]; then
    printf "http://%s" "$host"
  else
    printf "http://%s:%s" "$host" "$port"
  fi
}

local_https_url() {
  local host="$1"
  local port="$2"

  if [[ "$port" == "443" ]]; then
    printf "https://%s" "$host"
  else
    printf "https://%s:%s" "$host" "$port"
  fi
}

main() {
  local medusa_port n1_port meili_port minio_console_port minio_api_port postgres_port
  local adminer_port caddy_http_port caddy_https_port

  medusa_port="$(runtime_value DC_MEDUSA_BE_PUBLIC_PORT)"
  n1_port="$(runtime_value DC_N1_PUBLIC_PORT)"
  meili_port="$(runtime_value DC_MEILISEARCH_PUBLIC_PORT)"
  minio_console_port="$(runtime_value DC_MINIO_CONSOLE_PUBLIC_PORT)"
  minio_api_port="$(runtime_value DC_MINIO_API_PUBLIC_PORT)"
  postgres_port="$(runtime_value DC_POSTGRES_PUBLIC_PORT)"
  adminer_port="$(runtime_value DC_ADMINER_PUBLIC_PORT)"
  caddy_http_port="$(runtime_value DC_CADDY_HTTP_PUBLIC_PORT)"
  caddy_https_port="$(runtime_value DC_CADDY_HTTPS_PUBLIC_PORT)"

  printf "Worktree: %s\n" "$ROOT_DIR"
  printf "Compose project: %s\n" "$PROJECT_NAME"
  printf "Runtime env: %s\n" "$LOCAL_DEV_RUNTIME_ENV_FILE"

  if [[ -f "$LOCAL_DEV_RUNTIME_ENV_FILE" ]]; then
    printf "\nResolved local endpoints:\n"
    print_url "N1" "${n1_port:+http://localhost:${n1_port}}"
    print_url "Medusa admin/API" "${medusa_port:+http://localhost:${medusa_port}/app}"
    print_url "Meilisearch" "${meili_port:+http://localhost:${meili_port}/health}"
    print_url "MinIO console" "${minio_console_port:+http://localhost:${minio_console_port}}"
    print_url "MinIO API" "${minio_api_port:+http://localhost:${minio_api_port}}"
    print_url "Postgres" "${postgres_port:+localhost:${postgres_port}}"
    print_url "Adminer" "${adminer_port:+http://localhost:${adminer_port}}"
    print_url "Caddy HTTP" "${caddy_http_port:+$(local_http_url n1.medusa.localhost "$caddy_http_port")}"
    print_url "Caddy HTTPS" "${caddy_https_port:+$(local_https_url n1.medusa.localhost "$caddy_https_port")}"
  else
    printf "\nNo runtime env exists yet. Run `mise run dev:ports` or `mise run dev`.\n"
  fi

  printf "\nCompose services:\n"
  (
    cd "$ROOT_DIR"
    bash ./scripts/dev/compose.sh ps
  )
}

main "$@"
