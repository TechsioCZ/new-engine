#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
# shellcheck source=scripts/dev/lib/common.sh
source "${REPO_ROOT}/scripts/dev/lib/common.sh"
source "${REPO_ROOT}/scripts/dev/lib/zane.sh"

ENV_FILE="${REPO_ROOT}/.env.zane"
ZANE_BASE_URL="${ZANE_BASE_URL:-}"
ZANE_USERNAME="${ZANE_USERNAME:-}"
ZANE_PASSWORD="${ZANE_PASSWORD:-}"
PROJECT_SLUG="${ZANE_PROJECT_SLUG:-}"
ENVIRONMENT_NAME="${ZANE_ENVIRONMENT_NAME:-${ZANE_PRODUCTION_ENVIRONMENT_NAME:-production}}"

DB_SERVICE_ID="medusa-db"
OPERATOR_SERVICE_ID="zane-operator"
DB_SERVICE_SLUG=""
OPERATOR_SERVICE_SLUG=""
SOURCE_DB_NAME="${MEDUSA_APP_DB_NAME:-${DC_MEDUSA_APP_DB_NAME:-medusa}}"
TEMPLATE_DB_NAME=""
STAGING_DB_NAME=""
TEMPLATE_OWNER=""
DB_HOST=""
DB_PORT=""
DB_USER=""
DB_PASSWORD=""
DB_ADMIN_NAME=""
DB_SSLMODE=""
DOCKER_NETWORK="${ZANE_DOCKER_NETWORK:-zane}"
POSTGRES_CLIENT_IMAGE="${ZANE_POSTGRES_CLIENT_IMAGE:-postgres:18.1-alpine}"
DUMP_FILE=""
KEEP_DUMP="false"
DRY_RUN="false"
ASSUME_YES="false"

COOKIE_JAR=""
CSRF_TOKEN=""
INSPECT_JSON_FILE=""
PLAN_JSON_FILE=""

usage() {
  cat <<'EOF'
Usage:
  scripts/dev/refresh-zane-template-db.sh [options]

Creates or refreshes the live preview template database on the Zane-deployed stack by:
1. dumping the source Medusa DB
2. restoring into a staging DB
3. swapping staging into the configured template DB

Options:
  --env-file PATH                Source local defaults from PATH (default: .env.zane)
  --zane-base-url URL            Zane base URL used for discovery/auth
  --zane-username USER           Zane username used for discovery/auth
  --zane-password PASS           Zane password used for discovery/auth
  --project-slug SLUG            Zane project slug (required; no default)
  --environment-name NAME        Zane environment name (default: production)
  --db-service-slug SLUG         Zane DB service slug (default: resolved from manifest)
  --operator-service-slug SLUG   Zane operator service slug (default: resolved from manifest)
  --source-db-name NAME          Source DB to snapshot (default: MEDUSA_APP_DB_NAME or medusa)
  --template-db-name NAME        Template DB to replace (default: resolved from operator env)
  --staging-db-name NAME         Explicit staging DB name (default: generated)
  --template-owner ROLE          Owner for the final template DB (default: resolved from live bootstrap/operator env)
  --db-host HOST                 Explicit internal DB host override
  --db-port PORT                 Explicit DB port override
  --db-user USER                 Explicit DB admin user override
  --db-password PASS             Explicit DB admin password override
  --db-admin-name NAME           Explicit admin DB name override
  --db-sslmode MODE              Explicit sslmode override
  --docker-network NAME          Docker network with Zane internal aliases (default: zane)
  --postgres-client-image IMAGE  Docker image with pg_dump/pg_restore/psql
  --dump-file PATH               Keep dump at PATH instead of a temp file
  --keep-dump                    Keep the generated dump file
  --yes                          Skip the interactive confirmation prompt
  --dry-run                      Print the resolved plan without mutating the DB
  -h, --help                     Show this help

Notes:
  - This is a one-time dev helper for the Zane-deployed stack, not local docker-compose.
  - The script discovers the live medusa-db alias, DB admin credentials, and zane-operator template owner settings from Zane.
EOF
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --env-file)
        ENV_FILE="$2"
        shift 2
        ;;
      --zane-base-url)
        ZANE_BASE_URL="$2"
        shift 2
        ;;
      --zane-username)
        ZANE_USERNAME="$2"
        shift 2
        ;;
      --zane-password)
        ZANE_PASSWORD="$2"
        shift 2
        ;;
      --project-slug)
        PROJECT_SLUG="$2"
        shift 2
        ;;
      --environment-name)
        ENVIRONMENT_NAME="$2"
        shift 2
        ;;
      --db-service-slug)
        DB_SERVICE_SLUG="$2"
        shift 2
        ;;
      --operator-service-slug)
        OPERATOR_SERVICE_SLUG="$2"
        shift 2
        ;;
      --source-db-name)
        SOURCE_DB_NAME="$2"
        shift 2
        ;;
      --template-db-name)
        TEMPLATE_DB_NAME="$2"
        shift 2
        ;;
      --staging-db-name)
        STAGING_DB_NAME="$2"
        shift 2
        ;;
      --template-owner)
        TEMPLATE_OWNER="$2"
        shift 2
        ;;
      --db-host)
        DB_HOST="$2"
        shift 2
        ;;
      --db-port)
        DB_PORT="$2"
        shift 2
        ;;
      --db-user)
        DB_USER="$2"
        shift 2
        ;;
      --db-password)
        DB_PASSWORD="$2"
        shift 2
        ;;
      --db-admin-name)
        DB_ADMIN_NAME="$2"
        shift 2
        ;;
      --db-sslmode)
        DB_SSLMODE="$2"
        shift 2
        ;;
      --docker-network)
        DOCKER_NETWORK="$2"
        shift 2
        ;;
      --postgres-client-image)
        POSTGRES_CLIENT_IMAGE="$2"
        shift 2
        ;;
      --dump-file)
        DUMP_FILE="$2"
        shift 2
        ;;
      --keep-dump)
        KEEP_DUMP="true"
        shift
        ;;
      --yes)
        ASSUME_YES="true"
        shift
        ;;
      --dry-run)
        DRY_RUN="true"
        shift
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        usage >&2
        common::die "Unknown argument: $1"
        ;;
    esac
  done
}

require_tools() {
  common::require_command curl
  common::require_command docker
  common::require_command jq
  common::require_command mktemp
}

require_bootstrap_inputs() {
  PROJECT_SLUG="${PROJECT_SLUG:-${ZANE_PROJECT_SLUG:-}}"
  common::require_env PROJECT_SLUG "ZANE project slug"
}

assert_non_empty() {
  local value="${1-}"
  local label="$2"
  [[ -n "$value" ]] || common::die "${label} is required."
}

resolve_default_service_slugs() {
  local resolved_json
  local service_id
  local service_slug

  if [[ -n "$DB_SERVICE_SLUG" && -n "$OPERATOR_SERVICE_SLUG" ]]; then
    return
  fi

  resolved_json="$(dev::run_ctl manifest service-slugs --service-ids-csv "${DB_SERVICE_ID},${OPERATOR_SERVICE_ID}")"
  while IFS=$'\t' read -r service_id service_slug; do
    case "$service_id" in
      "$DB_SERVICE_ID")
        DB_SERVICE_SLUG="${DB_SERVICE_SLUG:-$service_slug}"
        ;;
      "$OPERATOR_SERVICE_ID")
        OPERATOR_SERVICE_SLUG="${OPERATOR_SERVICE_SLUG:-$service_slug}"
        ;;
    esac
  done < <(jq -r '.services[] | [.service_id, .service_slug] | @tsv' <<<"$resolved_json")

  assert_non_empty "$DB_SERVICE_SLUG" "DB service slug"
  assert_non_empty "$OPERATOR_SERVICE_SLUG" "operator service slug"
}

resolve_ctl_plan() {
  local ctl_args=()

  resolve_default_service_slugs

  INSPECT_JSON_FILE="$(mktemp)"
  PLAN_JSON_FILE="$(mktemp)"
  zane::bootstrap_preview_template_db_inspect_json \
    "$DB_SERVICE_SLUG" \
    "$OPERATOR_SERVICE_SLUG" >"$INSPECT_JSON_FILE"

  ctl_args=(
    bootstrap preview-template-db plan
    --project-slug "$PROJECT_SLUG"
    --environment-name "$ENVIRONMENT_NAME"
    --inspect-json "$INSPECT_JSON_FILE"
    --db-service-slug "$DB_SERVICE_SLUG"
    --operator-service-slug "$OPERATOR_SERVICE_SLUG"
    --source-db-name "$SOURCE_DB_NAME"
    --docker-network "$DOCKER_NETWORK"
    --postgres-client-image "$POSTGRES_CLIENT_IMAGE"
    --include-secrets
  )
  [[ -n "$TEMPLATE_DB_NAME" ]] && ctl_args+=(--template-db-name "$TEMPLATE_DB_NAME")
  [[ -n "$STAGING_DB_NAME" ]] && ctl_args+=(--staging-db-name "$STAGING_DB_NAME")
  [[ -n "$TEMPLATE_OWNER" ]] && ctl_args+=(--template-owner "$TEMPLATE_OWNER")
  [[ -n "$DB_HOST" ]] && ctl_args+=(--db-host "$DB_HOST")
  [[ -n "$DB_PORT" ]] && ctl_args+=(--db-port "$DB_PORT")
  [[ -n "$DB_USER" ]] && ctl_args+=(--db-user "$DB_USER")
  [[ -n "$DB_PASSWORD" ]] && ctl_args+=(--db-password "$DB_PASSWORD")
  [[ -n "$DB_ADMIN_NAME" ]] && ctl_args+=(--db-admin-name "$DB_ADMIN_NAME")
  [[ -n "$DB_SSLMODE" ]] && ctl_args+=(--db-sslmode "$DB_SSLMODE")
  [[ -n "$DUMP_FILE" ]] && ctl_args+=(--dump-file "$DUMP_FILE")

  dev::run_ctl "${ctl_args[@]}" >"$PLAN_JSON_FILE"

  DB_HOST="$(jq -r '.db_host // empty' <"$PLAN_JSON_FILE")"
  DB_PORT="$(jq -r '.db_port // empty' <"$PLAN_JSON_FILE")"
  DB_USER="$(jq -r '.db_user // empty' <"$PLAN_JSON_FILE")"
  DB_PASSWORD="$(jq -r '.db_password // empty' <"$PLAN_JSON_FILE")"
  DB_ADMIN_NAME="$(jq -r '.db_admin_name // empty' <"$PLAN_JSON_FILE")"
  DB_SSLMODE="$(jq -r '.db_sslmode // empty' <"$PLAN_JSON_FILE")"
  TEMPLATE_DB_NAME="$(jq -r '.template_db_name // empty' <"$PLAN_JSON_FILE")"
  STAGING_DB_NAME="$(jq -r '.staging_db_name // empty' <"$PLAN_JSON_FILE")"
  TEMPLATE_OWNER="$(jq -r '.template_owner // empty' <"$PLAN_JSON_FILE")"
}

prepare_dump_paths() {
  if [[ -n "$DUMP_FILE" ]]; then
    mkdir -p "$(dirname "$DUMP_FILE")"
    DUMP_FILE="$(cd "$(dirname "$DUMP_FILE")" && pwd)/$(basename "$DUMP_FILE")"
    return
  fi

  DUMP_FILE="$(mktemp "/tmp/zane-template-db.XXXXXX.dump")"
}

postgres::docker() {
  local script="$1"

  docker run --rm \
    --network "$DOCKER_NETWORK" \
    -e PGHOST="$DB_HOST" \
    -e PGPORT="$DB_PORT" \
    -e PGUSER="$DB_USER" \
    -e PGPASSWORD="$DB_PASSWORD" \
    -e PGDATABASE="$DB_ADMIN_NAME" \
    -e PGSSLMODE="$DB_SSLMODE" \
    -e SOURCE_DB_NAME="$SOURCE_DB_NAME" \
    -e TEMPLATE_DB_NAME="$TEMPLATE_DB_NAME" \
    -e STAGING_DB_NAME="$STAGING_DB_NAME" \
    -e TEMPLATE_OWNER="$TEMPLATE_OWNER" \
    -e DUMP_FILE_IN_CONTAINER="/work/$(basename "$DUMP_FILE")" \
    -v "$(dirname "$DUMP_FILE"):/work" \
    "$POSTGRES_CLIENT_IMAGE" \
    sh -lc "$script"
}

execute_refresh() {
  local dump_cmd restore_cmd swap_cmd

  dump_cmd='
    set -euo pipefail
    pg_dump \
      --host "$PGHOST" \
      --port "$PGPORT" \
      --username "$PGUSER" \
      --dbname "$SOURCE_DB_NAME" \
      --format=custom \
      --no-owner \
      --no-privileges \
      --file "$DUMP_FILE_IN_CONTAINER"
  '

  restore_cmd='
    set -euo pipefail
    psql \
      --host "$PGHOST" \
      --port "$PGPORT" \
      --username "$PGUSER" \
      --dbname "$PGDATABASE" \
      -v ON_ERROR_STOP=1 \
      -c "CREATE DATABASE ${STAGING_DB_NAME} OWNER ${TEMPLATE_OWNER};"

    pg_restore \
      --host "$PGHOST" \
      --port "$PGPORT" \
      --username "$PGUSER" \
      --dbname "$STAGING_DB_NAME" \
      --role "$TEMPLATE_OWNER" \
      --clean \
      --if-exists \
      --no-owner \
      --no-privileges \
      "$DUMP_FILE_IN_CONTAINER"
  '

  swap_cmd='
    set -euo pipefail

    TEMPLATE_EXISTS="$(
      psql --host "$PGHOST" --port "$PGPORT" --username "$PGUSER" --dbname "$PGDATABASE" -tA \
        -c "SELECT 1 FROM pg_database WHERE datname = '\''${TEMPLATE_DB_NAME}'\''"
    )"
    if [ "$TEMPLATE_EXISTS" = "1" ]; then
      psql --host "$PGHOST" --port "$PGPORT" --username "$PGUSER" --dbname "$PGDATABASE" -v ON_ERROR_STOP=1 <<SQL
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '\''${TEMPLATE_DB_NAME}'\''
  AND pid <> pg_backend_pid();
SQL

      psql \
        --host "$PGHOST" \
        --port "$PGPORT" \
        --username "$PGUSER" \
        --dbname "$PGDATABASE" \
        -v ON_ERROR_STOP=1 \
        -c "DROP DATABASE ${TEMPLATE_DB_NAME};"
    fi

    psql \
      --host "$PGHOST" \
      --port "$PGPORT" \
      --username "$PGUSER" \
      --dbname "$PGDATABASE" \
      -v ON_ERROR_STOP=1 \
      -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '\''${STAGING_DB_NAME}'\'' AND pid <> pg_backend_pid();"

    psql \
      --host "$PGHOST" \
      --port "$PGPORT" \
      --username "$PGUSER" \
      --dbname "$PGDATABASE" \
      -v ON_ERROR_STOP=1 \
      -c "ALTER DATABASE ${STAGING_DB_NAME} RENAME TO ${TEMPLATE_DB_NAME};"

    psql \
      --host "$PGHOST" \
      --port "$PGPORT" \
      --username "$PGUSER" \
      --dbname "$PGDATABASE" \
      -v ON_ERROR_STOP=1 \
      -c "ALTER DATABASE ${TEMPLATE_DB_NAME} OWNER TO ${TEMPLATE_OWNER};"
  '

  postgres::docker "$dump_cmd"
  postgres::docker "$restore_cmd"
  postgres::docker "$swap_cmd"
}

print_plan() {
  jq 'del(.db_password)' <"$PLAN_JSON_FILE"
}

print_plan_block_summary() {
  jq '{status, blocking_reasons}' <"$PLAN_JSON_FILE" >&2
}

confirm_execution() {
  local summary

  if [[ "$DRY_RUN" == "true" ]]; then
    return 0
  fi

  summary="$(cat <<EOF
About to refresh the live preview template DB on the deployed Zane stack:
  zane_base_url: ${ZANE_BASE_URL}
  project_slug: ${PROJECT_SLUG}
  environment_name: ${ENVIRONMENT_NAME}
  db_host: ${DB_HOST}
  source_db_name: ${SOURCE_DB_NAME}
  template_db_name: ${TEMPLATE_DB_NAME}
  template_owner: ${TEMPLATE_OWNER}
EOF
)"
  dev::confirm_or_die "refresh ${PROJECT_SLUG}/${ENVIRONMENT_NAME}" "$summary"
}

cleanup() {
  common::cleanup_curl_ca_bundle_temp

  if [[ -n "$COOKIE_JAR" && -f "$COOKIE_JAR" ]]; then
    rm -f "$COOKIE_JAR"
  fi

  if [[ -n "$INSPECT_JSON_FILE" && -f "$INSPECT_JSON_FILE" ]]; then
    rm -f "$INSPECT_JSON_FILE"
  fi

  if [[ -n "$PLAN_JSON_FILE" && -f "$PLAN_JSON_FILE" ]]; then
    rm -f "$PLAN_JSON_FILE"
  fi

  if [[ "$KEEP_DUMP" != "true" && -n "$DUMP_FILE" && -f "$DUMP_FILE" ]]; then
    rm -f "$DUMP_FILE"
  fi
}

main() {
  parse_args "$@"
  dev::load_env_file "$ENV_FILE" optional
  require_tools

  ZANE_BASE_URL="$(dev::first_non_empty \
    "$ZANE_BASE_URL" \
    "${ZANEOPS_URL:-}" \
    "${DC_ZANE_OPERATOR_ZANE_BASE_URL:-}")"
  ZANE_USERNAME="$(dev::first_non_empty \
    "$ZANE_USERNAME" \
    "${ZANEOPS_USERNAME:-}" \
    "${DC_ZANE_OPERATOR_ZANE_USERNAME:-}")"
  ZANE_PASSWORD="$(dev::first_non_empty \
    "$ZANE_PASSWORD" \
    "${ZANEOPS_PASSWORD:-}" \
    "${DC_ZANE_OPERATOR_ZANE_PASSWORD:-}")"
  PROJECT_SLUG="$(dev::first_non_empty \
    "$PROJECT_SLUG" \
    "${ZANE_PROJECT_SLUG:-}")"
  ENVIRONMENT_NAME="$(dev::first_non_empty \
    "$ENVIRONMENT_NAME" \
    "${ZANE_ENVIRONMENT_NAME:-}" \
    "${ZANE_PRODUCTION_ENVIRONMENT_NAME:-}" \
    "production")"

  assert_non_empty "$ZANE_BASE_URL" "Zane base URL"
  assert_non_empty "$ZANE_USERNAME" "Zane username"
  assert_non_empty "$ZANE_PASSWORD" "Zane password"
  require_bootstrap_inputs
  assert_non_empty "$ENVIRONMENT_NAME" "Zane environment name"
  assert_non_empty "$SOURCE_DB_NAME" "Source DB name"
  common::configure_curl_ca_bundle_from_local_caddy "$ZANE_BASE_URL"

  trap cleanup EXIT

  zane::login
  prepare_dump_paths
  resolve_ctl_plan

  if [[ "$(jq -r '.status' <"$PLAN_JSON_FILE")" != "ready" ]]; then
    print_plan_block_summary
    common::die "CTL preview-template-db plan is blocked."
  fi

  assert_non_empty "$DB_HOST" "DB host"
  assert_non_empty "$DB_PORT" "DB port"
  assert_non_empty "$DB_USER" "DB user"
  assert_non_empty "$DB_PASSWORD" "DB password"
  assert_non_empty "$DB_ADMIN_NAME" "DB admin database"
  assert_non_empty "$TEMPLATE_DB_NAME" "Template DB name"
  assert_non_empty "$TEMPLATE_OWNER" "Template DB owner"

  if [[ "$DRY_RUN" == "true" ]]; then
    print_plan
    return 0
  fi

  confirm_execution
  execute_refresh >/dev/null
  print_plan | jq -c '. + {refreshed: true, dry_run: false}'
}

main "$@"
