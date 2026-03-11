#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"

get_env_value() {
  local var_name="$1"
  local line

  if [[ ! -f "$ENV_FILE" ]]; then
    printf '%s' ""
    return 0
  fi

  line="$(grep -E "^${var_name}=" "$ENV_FILE" | tail -n1 || true)"
  if [[ -z "$line" ]]; then
    printf '%s' ""
    return 0
  fi

  printf '%s' "${line#*=}"
}

resolved_env_value() {
  local var_name="$1"
  local fallback="$2"
  local shell_value="${!var_name-}"

  if [[ -n "$shell_value" ]]; then
    printf '%s' "$shell_value"
    return 0
  fi

  local file_value
  file_value="$(get_env_value "$var_name")"
  if [[ -n "$file_value" ]]; then
    printf '%s' "$file_value"
    return 0
  fi

  printf '%s' "$fallback"
}

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required" >&2
  exit 1
fi

if [ -z "$(docker compose ps -q medusa-db)" ]; then
  echo "medusa-db container is not running. Start the stack first (for example: make dev)." >&2
  exit 1
fi

operator_user="$(resolved_env_value "DC_ZANE_OPERATOR_PGUSER" "zane_operator")"
operator_password="$(resolved_env_value "DC_ZANE_OPERATOR_PGPASSWORD" "")"
operator_template_db="$(resolved_env_value "DC_ZANE_OPERATOR_DB_TEMPLATE_NAME" "template_medusa")"

echo "Applying postgres role bootstrap (medusa_app/medusa_dev/zane_operator) to running medusa-db container..."
(
  cd "$ROOT_DIR"
  docker compose exec -T \
    -e MEDUSA_DB_ZANE_OPERATOR_USER="$operator_user" \
    -e MEDUSA_DB_ZANE_OPERATOR_PASSWORD="$operator_password" \
    -e MEDUSA_DB_ZANE_OPERATOR_DB_TEMPLATE_NAME="$operator_template_db" \
    medusa-db sh /usr/local/bin/postgres-role-bootstrap
)

if [ "${1:-}" = "--verify-idempotent" ]; then
  echo "Running bootstrap second time to verify idempotency..."
  (
    cd "$ROOT_DIR"
    docker compose exec -T \
      -e MEDUSA_DB_ZANE_OPERATOR_USER="$operator_user" \
      -e MEDUSA_DB_ZANE_OPERATOR_PASSWORD="$operator_password" \
      -e MEDUSA_DB_ZANE_OPERATOR_DB_TEMPLATE_NAME="$operator_template_db" \
      medusa-db sh /usr/local/bin/postgres-role-bootstrap
  )
fi

echo "Done."
