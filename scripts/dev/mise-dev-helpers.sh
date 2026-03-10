#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"
PROJECT_NAME="${PROJECT_NAME:-new-engine}"
HEALTH_TIMEOUT_SECONDS="${MISE_DEV_HEALTH_TIMEOUT_SECONDS:-180}"
KEY_CONFLICT_POLICY="${MISE_DEV_MEILI_KEY_CONFLICT:-prompt}" # prompt|override|keep
MISE_DEV_MEILI_URL="${MISE_DEV_MEILI_URL:-http://127.0.0.1:7700}"
STACK_MANIFEST_HELPER="${ROOT_DIR}/scripts/lib/stack-manifest.sh"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "$1 is required" >&2
    exit 1
  fi
}

compose() {
  (
    cd "$ROOT_DIR"
    docker compose -f docker-compose.yaml -p "$PROJECT_NAME" "$@"
  )
}

wait_for_service_healthy() {
  local service="$1"
  local started_at now container_id status

  started_at="$(date +%s)"
  while true; do
    container_id="$(compose ps -q "$service" 2>/dev/null | head -n1 || true)"

    if [[ -n "$container_id" ]]; then
      status="$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$container_id" 2>/dev/null || echo unknown)"
      case "$status" in
        healthy)
          echo "${service}: healthy"
          return 0
          ;;
        unhealthy)
          echo "${service}: unhealthy" >&2
          docker logs --tail=120 "$container_id" >&2 || true
          return 1
          ;;
      esac
    fi

    now="$(date +%s)"
    if (( now - started_at >= HEALTH_TIMEOUT_SECONDS )); then
      echo "Timed out waiting for ${service} to become healthy" >&2
      if [[ -n "$container_id" ]]; then
        docker logs --tail=120 "$container_id" >&2 || true
      fi
      return 1
    fi

    sleep 2
  done
}

services_for_phase() {
  local phase="$1"
  local default_only="${2:-true}"

  if [[ "$default_only" == "true" ]]; then
    bash "$STACK_MANIFEST_HELPER" compose-services --phase "$phase" --default-only
  else
    bash "$STACK_MANIFEST_HELPER" compose-services --phase "$phase"
  fi
}

get_env_value() {
  local var_name="$1"
  local line

  if [[ ! -f "$ENV_FILE" ]]; then
    echo ""
    return 0
  fi

  line="$(grep -E "^${var_name}=" "$ENV_FILE" | tail -n1 || true)"
  if [[ -z "$line" ]]; then
    echo ""
    return 0
  fi

  printf '%s' "${line#*=}"
}

set_env_value() {
  local var_name="$1"
  local var_value="$2"
  local tmp_file matched

  mkdir -p "$(dirname "$ENV_FILE")"
  touch "$ENV_FILE"

  tmp_file="$(mktemp)"
  matched="0"

  while IFS= read -r line || [[ -n "$line" ]]; do
    if [[ "$line" =~ ^${var_name}= ]]; then
      if [[ "$matched" == "0" ]]; then
        printf '%s=%s\n' "$var_name" "$var_value" >>"$tmp_file"
        matched="1"
      fi
      continue
    fi
    printf '%s\n' "$line" >>"$tmp_file"
  done <"$ENV_FILE"

  if [[ "$matched" == "0" ]]; then
    printf '%s=%s\n' "$var_name" "$var_value" >>"$tmp_file"
  fi

  mv "$tmp_file" "$ENV_FILE"
}

resolve_conflict_choice() {
  local var_name="$1"

  case "$KEY_CONFLICT_POLICY" in
    override)
      echo "override"
      return 0
      ;;
    keep)
      echo "keep"
      return 0
      ;;
    prompt)
      ;;
    *)
      echo "Invalid MISE_DEV_MEILI_KEY_CONFLICT=${KEY_CONFLICT_POLICY}. Expected: prompt|override|keep" >&2
      return 1
      ;;
  esac

  if [[ ! -t 0 ]]; then
    echo "No interactive TTY detected; keeping existing ${var_name}." >&2
    echo "keep"
    return 0
  fi

  while true; do
    read -r -p "${var_name} differs from provisioned value. Override existing value? [o]verride/[k]eep: " answer
    case "${answer}" in
      o|O|override|OVERRIDE)
        echo "override"
        return 0
        ;;
      k|K|keep|KEEP|"")
        echo "keep"
        return 0
        ;;
      *)
        echo "Please answer 'o' or 'k'." >&2
        ;;
    esac
  done
}

sync_env_key() {
  local var_name="$1"
  local provisioned_value="$2"
  local current_value choice

  current_value="$(get_env_value "$var_name")"

  if [[ -z "$current_value" ]]; then
    set_env_value "$var_name" "$provisioned_value"
    echo "${var_name}: was empty -> set from provisioned key"
    return 0
  fi

  if [[ "$current_value" == "$provisioned_value" ]]; then
    echo "${var_name}: unchanged (already matches provisioned key)"
    return 0
  fi

  choice="$(resolve_conflict_choice "$var_name")"
  if [[ "$choice" == "override" ]]; then
    set_env_value "$var_name" "$provisioned_value"
    echo "${var_name}: overridden with provisioned key"
  else
    echo "${var_name}: kept existing value"
    echo "Warning: kept value may not match current Meilisearch key policy for this stack." >&2
  fi
}

sync_meili_env() {
  local output backend_key frontend_key backend_created backend_updated frontend_created frontend_updated

  require_cmd bash
  require_cmd sed

  if [[ ! -f "$ENV_FILE" ]]; then
    echo "Missing ${ENV_FILE}. Create it from .env.docker first." >&2
    exit 1
  fi

  echo "Provisioning Meilisearch keys against ${MISE_DEV_MEILI_URL}"
  output="$(cd "$ROOT_DIR" && bash -lc 'set -a; source ./.env; set +a; bash ./scripts/ci/provision-meili-keys.sh --meili-url "'"${MISE_DEV_MEILI_URL}"'"')"

  backend_key="$(printf '%s\n' "$output" | sed -n 's/^DC_MEILISEARCH_BACKEND_API_KEY=//p' | tail -n1)"
  frontend_key="$(printf '%s\n' "$output" | sed -n 's/^DC_N1_NEXT_PUBLIC_MEILISEARCH_API_KEY=//p' | tail -n1)"

  if [[ -z "$backend_key" || -z "$frontend_key" ]]; then
    echo "Failed to parse provisioned keys from scripts/ci/provision-meili-keys.sh output." >&2
    exit 1
  fi

  backend_created="$(printf '%s\n' "$output" | sed -n 's/^backend_created=//p' | tail -n1)"
  backend_updated="$(printf '%s\n' "$output" | sed -n 's/^backend_updated=//p' | tail -n1)"
  frontend_created="$(printf '%s\n' "$output" | sed -n 's/^frontend_created=//p' | tail -n1)"
  frontend_updated="$(printf '%s\n' "$output" | sed -n 's/^frontend_updated=//p' | tail -n1)"

  echo "Provision status: backend(created=${backend_created:-unknown},updated=${backend_updated:-unknown}), frontend(created=${frontend_created:-unknown},updated=${frontend_updated:-unknown})"

  sync_env_key "DC_MEILISEARCH_BACKEND_API_KEY" "$backend_key"
  sync_env_key "DC_N1_NEXT_PUBLIC_MEILISEARCH_API_KEY" "$frontend_key"
}

require_operator_bootstrap() {
  local role_name db_name container_id

  role_name="$(get_env_value "DC_ZANE_OPERATOR_PGUSER")"
  db_name="$(get_env_value "DC_MEDUSA_APP_DB_NAME")"
  role_name="${role_name:-zane_operator}"
  db_name="${db_name:-medusa}"
  container_id="$(compose ps -q medusa-db 2>/dev/null | head -n1 || true)"

  if [[ -z "$container_id" ]]; then
    echo "medusa-db is not running. Start the core stack first with 'mise run dev' or 'mise run dev:resources'." >&2
    exit 1
  fi

  if compose exec -T -e TARGET_ROLE="$role_name" medusa-db sh -lc '
    psql -U "$POSTGRES_USER" -d "'"$db_name"'" -Atqc "SELECT 1 FROM pg_roles WHERE rolname = '\''$TARGET_ROLE'\''" | grep -qx 1
  ' >/dev/null 2>&1; then
    echo "zane-operator bootstrap detected for role ${role_name}"
    return 0
  fi

  echo "zane-operator bootstrap has not been applied for role ${role_name}." >&2
  echo "Run 'mise run dev:operator:bootstrap' first, or 'mise run dev:operator:init' to bootstrap and start the operator." >&2
  exit 1
}

usage() {
  cat <<'USAGE'
Usage: scripts/dev/mise-dev-helpers.sh <command> [args]

Commands:
  wait-healthy <service...>   Wait until each docker compose service is healthy
  services-for-phase <phase>  Print compose services for a local-dev phase from stack manifest
  sync-meili-env              Provision Meili keys and sync .env values
  require-operator-bootstrap  Fail unless zane-operator bootstrap has already been applied

Environment options:
  PROJECT_NAME                         docker compose project name (default: new-engine)
  MISE_DEV_HEALTH_TIMEOUT_SECONDS      health wait timeout per service (default: 180)
  MISE_DEV_MEILI_KEY_CONFLICT          prompt|override|keep (default: prompt)
  MISE_DEV_MEILI_URL                   Host-accessible Meilisearch URL for provisioning (default: http://127.0.0.1:7700)
USAGE
}

main() {
  local command="${1:-help}"
  shift || true

  require_cmd docker

  case "$command" in
    wait-healthy)
      if [[ "$#" -lt 1 ]]; then
        echo "wait-healthy requires at least one service name" >&2
        exit 1
      fi
      for service in "$@"; do
        wait_for_service_healthy "$service"
      done
      ;;
    services-for-phase)
      [[ "$#" -eq 1 ]] || {
        echo "services-for-phase requires exactly one phase name" >&2
        exit 1
      }
      services_for_phase "$1"
      ;;
    sync-meili-env)
      sync_meili_env
      ;;
    require-operator-bootstrap)
      require_operator_bootstrap
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
