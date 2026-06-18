#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"
PROJECT_NAME="${PROJECT_NAME:-new-engine}"
HEALTH_TIMEOUT_SECONDS="${MISE_DEV_HEALTH_TIMEOUT_SECONDS:-180}"
KEY_CONFLICT_POLICY="${MISE_DEV_MEILI_KEY_CONFLICT:-prompt}" # prompt|override|keep
MISE_DEV_MEILI_URL="${MISE_DEV_MEILI_URL:-http://127.0.0.1:7700}"
CTL_DIST="$ROOT_DIR/apps/new-engine-ctl/dist/cli.js"
CTL_ROOT="$ROOT_DIR/apps/new-engine-ctl"
# shellcheck source=scripts/dev/lib/common.sh
source "${ROOT_DIR}/scripts/dev/lib/common.sh"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "$1 is required" >&2
    exit 1
  fi
}

ensure_ctl_built() {
  require_cmd node

  if [[ ! -f "$CTL_DIST" ]] ||
    find "$CTL_ROOT/src" "$CTL_ROOT/config" "$CTL_ROOT/scripts" -type f -newer "$CTL_DIST" -print -quit | grep -q . ||
    find "$CTL_ROOT/package.json" "$ROOT_DIR/pnpm-lock.yaml" "$ROOT_DIR/pnpm-workspace.yaml" "$ROOT_DIR/node_modules/.modules.yaml" -maxdepth 0 -type f -newer "$CTL_DIST" -print -quit 2>/dev/null | grep -q .; then
    echo "Building new-engine-ctl..." >&2
    (
      cd "$CTL_ROOT"
      node ./scripts/build.mjs >/dev/null
    )
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

  ensure_ctl_built

  if [[ "$default_only" == "true" ]]; then
    node "$CTL_DIST" manifest compose-services --phase "$phase" --default-only
  else
    node "$CTL_DIST" manifest compose-services --phase "$phase"
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

requested_frontend_services() {
  if [[ "$#" -gt 0 ]]; then
    printf '%s\n' "$@"
    return 0
  fi

  if [[ -n "${MISE_DEV_FRONTEND_SERVICES:-}" ]]; then
    printf '%s\n' $MISE_DEV_FRONTEND_SERVICES
    return 0
  fi

  if [[ -n "${MISE_DEV_MEILI_FRONTEND_SERVICES:-}" ]]; then
    printf '%s\n' $MISE_DEV_MEILI_FRONTEND_SERVICES
    return 0
  fi

  services_for_phase frontend
}

join_csv() {
  local IFS=,
  printf '%s' "$*"
}

local_env_aliases_for_runtime_provider_output() {
  local provider_id="$1"
  local output_id="$2"
  local service_ids_csv="$3"

  ensure_ctl_built

  node "$CTL_DIST" local-env runtime-provider-output-targets \
    --provider-id "$provider_id" \
    --output-id "$output_id" \
    --service-ids-csv "$service_ids_csv" \
    --format local-env-vars
}

sync_runtime_provider_output_env() {
  local provider_id="$1"
  local output_id="$2"
  local provisioned_value="$3"
  local local_env_var
  local local_env_vars=()
  shift 3

  while IFS= read -r local_env_var; do
    [[ -n "$local_env_var" ]] || continue
    local_env_vars+=("$local_env_var")
  done < <(local_env_aliases_for_runtime_provider_output "$provider_id" "$output_id" "$(join_csv "$@")")

  if [[ "${#local_env_vars[@]}" -eq 0 ]]; then
    echo "No local env aliases resolved for ${provider_id}.${output_id}; skipping sync."
    return 0
  fi

  for local_env_var in "${local_env_vars[@]}"; do
    sync_env_key "$local_env_var" "$provisioned_value"
  done
}


sync_meili_env() {
  local frontend_services=()
  local frontend_service
  local output backend_key frontend_key backend_env_var frontend_env_var backend_created backend_updated frontend_created frontend_updated

  require_cmd bash
  require_cmd awk
  require_cmd sed

  while IFS= read -r frontend_service; do
    [[ -n "$frontend_service" ]] || continue
    frontend_services+=("$frontend_service")
  done < <(requested_frontend_services "$@")

  if [[ ! -f "$ENV_FILE" ]]; then
    echo "Missing ${ENV_FILE}. Create it from .env.docker first." >&2
    exit 1
  fi

  echo "Provisioning Meilisearch keys against ${MISE_DEV_MEILI_URL}"
  output="$(cd "$ROOT_DIR" && bash -lc 'set -a; source ./.env; set +a; bash ./scripts/dev/provision-meili-keys.sh --meili-url "'"${MISE_DEV_MEILI_URL}"'"')"

  backend_env_var="$(printf '%s\n' "$output" | sed -n 's/^backend_env_var=//p' | tail -n1)"
  frontend_env_var="$(printf '%s\n' "$output" | sed -n 's/^frontend_env_var=//p' | tail -n1)"
  backend_key="$(printf '%s\n' "$output" | awk -F= -v expected_key="$backend_env_var" '$1 == expected_key {print substr($0, length($1) + 2)}' | tail -n1)"
  frontend_key="$(printf '%s\n' "$output" | awk -F= -v expected_key="$frontend_env_var" '$1 == expected_key {print substr($0, length($1) + 2)}' | tail -n1)"

  if [[ -z "$backend_env_var" || -z "$frontend_env_var" || -z "$backend_key" || -z "$frontend_key" ]]; then
    echo "Failed to parse provisioned keys from scripts/dev/provision-meili-keys.sh output." >&2
    exit 1
  fi

  backend_created="$(printf '%s\n' "$output" | sed -n 's/^backend_created=//p' | tail -n1)"
  backend_updated="$(printf '%s\n' "$output" | sed -n 's/^backend_updated=//p' | tail -n1)"
  frontend_created="$(printf '%s\n' "$output" | sed -n 's/^frontend_created=//p' | tail -n1)"
  frontend_updated="$(printf '%s\n' "$output" | sed -n 's/^frontend_updated=//p' | tail -n1)"

  echo "Provision status: backend(created=${backend_created:-unknown},updated=${backend_updated:-unknown}), frontend(created=${frontend_created:-unknown},updated=${frontend_updated:-unknown})"

  sync_runtime_provider_output_env meili_api_credentials backend_key "$backend_key" medusa-be
  sync_runtime_provider_output_env meili_api_credentials frontend_key "$frontend_key" "${frontend_services[@]}"
}

ensure_operator_db_convergence() {
  local operator_user operator_password operator_template_db container_id

  operator_user="${DC_ZANE_OPERATOR_PGUSER:-$(get_env_value "DC_ZANE_OPERATOR_PGUSER")}"
  operator_password="${DC_ZANE_OPERATOR_PGPASSWORD:-$(get_env_value "DC_ZANE_OPERATOR_PGPASSWORD")}"
  operator_template_db="${DC_ZANE_OPERATOR_DB_TEMPLATE_NAME:-$(get_env_value "DC_ZANE_OPERATOR_DB_TEMPLATE_NAME")}"

  operator_user="${operator_user:-zane_operator}"
  operator_template_db="${operator_template_db:-template_medusa}"

  if [[ -z "$operator_password" ]]; then
    echo "DC_ZANE_OPERATOR_PGPASSWORD is required before starting the operator." >&2
    exit 1
  fi

  container_id="$(compose ps -q medusa-db 2>/dev/null | head -n1 || true)"
  if [[ -z "$container_id" ]]; then
    echo "medusa-db is not running; starting it before operator bootstrap convergence."
    compose up -d --build medusa-db
  fi

  wait_for_service_healthy medusa-db

  echo "Converging medusa-db bootstrap state for zane-operator..."
  compose exec -T \
    -e MEDUSA_DB_ZANE_OPERATOR_USER="$operator_user" \
    -e MEDUSA_DB_ZANE_OPERATOR_PASSWORD="$operator_password" \
    -e MEDUSA_DB_ZANE_OPERATOR_DB_TEMPLATE_NAME="$operator_template_db" \
    medusa-db sh /usr/local/bin/postgres-role-bootstrap
}

validate_local_helper_service() {
  local service="$1"

  case "$service" in
    adminer|caddy)
      return 0
      ;;
    *)
      echo "Unsupported local helper service: ${service}" >&2
      echo "Expected one of: adminer, caddy, all" >&2
      return 1
      ;;
  esac
}

run_local_helper_action_for_service() {
  local action="$1"
  local service="$2"

  validate_local_helper_service "$service"

  case "$action" in
    up)
      compose up -d --build "$service"
      ;;
    down)
      compose stop "$service"
      compose rm -f "$service"
      ;;
    restart)
      compose up -d --build --force-recreate "$service"
      ;;
    status)
      compose ps "$service"
      ;;
    *)
      echo "Unsupported local helper action: ${action}" >&2
      echo "Expected one of: up, down, restart, status" >&2
      return 1
      ;;
  esac
}

local_helper() {
  local action="${1:-}"
  local service="${2:-}"

  if [[ -z "$action" || -z "$service" ]]; then
    echo "local-helper requires ACTION and SERVICE" >&2
    echo "Usage: scripts/dev/mise-dev-helpers.sh local-helper <up|down|restart|status> <adminer|caddy|all>" >&2
    exit 1
  fi

  case "$service" in
    all)
      run_local_helper_action_for_service "$action" adminer
      run_local_helper_action_for_service "$action" caddy
      ;;
    adminer|caddy)
      run_local_helper_action_for_service "$action" "$service"
      ;;
    *)
      validate_local_helper_service "$service"
      ;;
  esac
}

usage() {
  cat <<'USAGE'
Usage: scripts/dev/mise-dev-helpers.sh <command> [args]

Commands:
  wait-healthy <service...>   Wait until each docker compose service is healthy
  services-for-phase <phase>  Print compose services for a local-dev phase from stack manifest
  sync-meili-env [frontend-service...]
                              Provision Meili keys and sync .env values.
                              Defaults to manifest default frontend services.
                              Pass n1 herbatika, or set MISE_DEV_FRONTEND_SERVICES,
                              to sync the frontend key to multiple local targets.
  ensure-operator-db-convergence
                              Ensure medusa-db has converged zane-operator bootstrap state for current local envs
  local-helper <action> <service>
                              Manage optional local helper services.
                              action: up|down|restart|status
                              service: adminer|caddy|all

Environment options:
  PROJECT_NAME                         docker compose project name (default: new-engine)
  MISE_DEV_HEALTH_TIMEOUT_SECONDS      health wait timeout per service (default: 180)
  MISE_DEV_MEILI_KEY_CONFLICT          prompt|override|keep (default: prompt)
  MISE_DEV_MEILI_URL                   Host-accessible Meilisearch URL for provisioning (default: http://127.0.0.1:7700)
  MISE_DEV_FRONTEND_SERVICES           Space-separated frontend services for provisioned frontend env fan-out
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
      sync_meili_env "$@"
      ;;
    ensure-operator-db-convergence)
      ensure_operator_db_convergence
      ;;
    local-helper)
      local_helper "$@"
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
