#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
source "${REPO_ROOT}/scripts/ci/lib.sh"
source "${REPO_ROOT}/scripts/dev/lib/zane.sh"

ENV_FILE="${REPO_ROOT}/.env.zane"
ZANE_BASE_URL="${ZANE_BASE_URL:-}"
ZANE_USERNAME="${ZANE_USERNAME:-}"
ZANE_PASSWORD="${ZANE_PASSWORD:-}"
PROJECT_SLUG="${ZANE_PROJECT_SLUG:-${ZANE_CANONICAL_PROJECT_SLUG:-new-engine}}"
ENVIRONMENT_NAME="${ZANE_ENVIRONMENT_NAME:-${ZANE_PRODUCTION_ENVIRONMENT_NAME:-production}}"

DB_SERVICE_SLUG="medusa-db"
OPERATOR_SERVICE_SLUG="zane-operator"
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

usage() {
  cat <<'EOF'
Usage:
  scripts/dev/refresh-zane-template-db.sh [options]

Refreshes the live preview template database on the Zane-deployed stack by:
1. dumping the source Medusa DB
2. restoring into a staging DB
3. swapping staging into the configured template DB

Options:
  --env-file PATH                Source local defaults from PATH (default: .env.zane)
  --zane-base-url URL            Zane base URL used for discovery/auth
  --zane-username USER           Zane username used for discovery/auth
  --zane-password PASS           Zane password used for discovery/auth
  --project-slug SLUG            Zane project slug (default: new-engine)
  --environment-name NAME        Zane environment name (default: production)
  --db-service-slug SLUG         Zane DB service slug (default: medusa-db)
  --operator-service-slug SLUG   Zane operator service slug (default: zane-operator)
  --source-db-name NAME          Source DB to snapshot (default: MEDUSA_APP_DB_NAME or medusa)
  --template-db-name NAME        Template DB to replace (default: resolved from operator env)
  --staging-db-name NAME         Explicit staging DB name (default: generated)
  --template-owner ROLE          Owner for the final template DB (default: operator PGUSER)
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
  - The script discovers the live medusa-db alias and zane-operator PG* settings from Zane.
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
        ci::die "Unknown argument: $1"
        ;;
    esac
  done
}

require_tools() {
  ci::require_command curl
  ci::require_command docker
  ci::require_command jq
  ci::require_command mktemp
}

assert_non_empty() {
  local value="${1-}"
  local label="$2"
  [[ -n "$value" ]] || ci::die "${label} is required."
}

resolve_live_defaults() {
  local db_service_json operator_service_json

  db_service_json="$(zane::get_service "$DB_SERVICE_SLUG")"
  operator_service_json="$(zane::get_service "$OPERATOR_SERVICE_SLUG")"

  DB_HOST="$(dev::first_non_empty \
    "$DB_HOST" \
    "$(jq -r '.global_network_alias // empty' <<<"$db_service_json")" \
    "$(jq -r '.network_alias // empty' <<<"$db_service_json")")"
  DB_PORT="$(dev::first_non_empty "$DB_PORT" "$(zane::service_env_value "$operator_service_json" "PGPORT")" "5432")"
  DB_USER="$(dev::first_non_empty \
    "$DB_USER" \
    "$(zane::service_env_value "$operator_service_json" "PGUSER")" \
    "${DC_ZANE_OPERATOR_PGUSER:-}" \
    "${DC_POSTGRES_SUPERUSER:-}")"
  DB_PASSWORD="$(dev::first_non_empty \
    "$DB_PASSWORD" \
    "$(zane::service_env_value "$operator_service_json" "PGPASSWORD")" \
    "${DC_ZANE_OPERATOR_PGPASSWORD:-}" \
    "${DC_POSTGRES_SUPERUSER_PASSWORD:-}")"
  DB_ADMIN_NAME="$(dev::first_non_empty "$DB_ADMIN_NAME" "$(zane::service_env_value "$operator_service_json" "PGDATABASE")" "postgres")"
  DB_SSLMODE="$(dev::first_non_empty "$DB_SSLMODE" "$(zane::service_env_value "$operator_service_json" "PGSSLMODE")" "disable")"
  TEMPLATE_DB_NAME="$(dev::first_non_empty \
    "$TEMPLATE_DB_NAME" \
    "$(zane::service_env_value "$operator_service_json" "DB_TEMPLATE_NAME")" \
    "${DC_ZANE_OPERATOR_DB_TEMPLATE_NAME:-}" \
    "template_medusa")"
  TEMPLATE_OWNER="$(dev::first_non_empty "$TEMPLATE_OWNER" "$DB_USER")"

  if [[ -z "$STAGING_DB_NAME" ]]; then
    STAGING_DB_NAME="${TEMPLATE_DB_NAME}_staging_$(date +%Y%m%d%H%M%S)"
  fi
}

prepare_dump_paths() {
  if [[ -n "$DUMP_FILE" ]]; then
    mkdir -p "$(dirname "$DUMP_FILE")"
    DUMP_FILE="$(cd "$(dirname "$DUMP_FILE")" && pwd)/$(basename "$DUMP_FILE")"
    return
  fi

  DUMP_FILE="$(mktemp "/tmp/${TEMPLATE_DB_NAME}.XXXXXX.dump")"
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
  jq -cn \
    --arg project_slug "$PROJECT_SLUG" \
    --arg environment_name "$ENVIRONMENT_NAME" \
    --arg db_service_slug "$DB_SERVICE_SLUG" \
    --arg operator_service_slug "$OPERATOR_SERVICE_SLUG" \
    --arg source_db_name "$SOURCE_DB_NAME" \
    --arg template_db_name "$TEMPLATE_DB_NAME" \
    --arg staging_db_name "$STAGING_DB_NAME" \
    --arg template_owner "$TEMPLATE_OWNER" \
    --arg db_host "$DB_HOST" \
    --arg db_port "$DB_PORT" \
    --arg db_user "$DB_USER" \
    --arg db_admin_name "$DB_ADMIN_NAME" \
    --arg db_sslmode "$DB_SSLMODE" \
    --arg docker_network "$DOCKER_NETWORK" \
    --arg postgres_client_image "$POSTGRES_CLIENT_IMAGE" \
    --arg dump_file "$DUMP_FILE" \
    --argjson dry_run "$( [[ "$DRY_RUN" == "true" ]] && printf 'true' || printf 'false' )" \
    '{
      project_slug: $project_slug,
      environment_name: $environment_name,
      db_service_slug: $db_service_slug,
      operator_service_slug: $operator_service_slug,
      source_db_name: $source_db_name,
      template_db_name: $template_db_name,
      staging_db_name: $staging_db_name,
      template_owner: $template_owner,
      db_host: $db_host,
      db_port: $db_port,
      db_user: $db_user,
      db_admin_name: $db_admin_name,
      db_sslmode: $db_sslmode,
      docker_network: $docker_network,
      postgres_client_image: $postgres_client_image,
      dump_file: $dump_file,
      dry_run: $dry_run
    }'
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
  if [[ -n "$COOKIE_JAR" && -f "$COOKIE_JAR" ]]; then
    rm -f "$COOKIE_JAR"
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
    "${ZANE_PROJECT_SLUG:-}" \
    "${ZANE_CANONICAL_PROJECT_SLUG:-}")"
  ENVIRONMENT_NAME="$(dev::first_non_empty \
    "$ENVIRONMENT_NAME" \
    "${ZANE_ENVIRONMENT_NAME:-}" \
    "${ZANE_PRODUCTION_ENVIRONMENT_NAME:-}" \
    "production")"

  assert_non_empty "$ZANE_BASE_URL" "Zane base URL"
  assert_non_empty "$ZANE_USERNAME" "Zane username"
  assert_non_empty "$ZANE_PASSWORD" "Zane password"
  assert_non_empty "$PROJECT_SLUG" "Zane project slug"
  assert_non_empty "$ENVIRONMENT_NAME" "Zane environment name"
  assert_non_empty "$SOURCE_DB_NAME" "Source DB name"

  trap cleanup EXIT

  zane::login
  resolve_live_defaults
  prepare_dump_paths

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
