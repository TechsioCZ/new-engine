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
SERVICE_SLUG=""
VERIFY_PR_NUMBER="${VERIFY_PR_NUMBER:-999998}"
ASSUME_YES="false"

usage() {
  cat <<'EOF'
Usage:
  scripts/dev/refresh-zane-template-db-via-service.sh [options]

Creates or refreshes the Zane preview template DB by deploying a temporary
postgres client service inside the target Zane environment. Use this when the
normal refresh helper cannot reach the internal Zane Docker network locally.

Options:
  --env-file PATH          Source local defaults from PATH (default: .env.zane)
  --zane-base-url URL      Zane base URL used for discovery/auth
  --zane-username USER     Zane username used for discovery/auth
  --zane-password PASS     Zane password used for discovery/auth
  --project-slug SLUG      Zane project slug
  --environment-name NAME  Zane environment name (default: production)
  --service-slug SLUG      Temporary service slug (default: generated)
  --verify-pr-number NUM   Temporary preview DB PR number for verification
  --yes                    Skip the confirmation prompt
  -h, --help               Show this help
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
      --service-slug)
        SERVICE_SLUG="$2"
        shift 2
        ;;
      --verify-pr-number)
        VERIFY_PR_NUMBER="$2"
        shift 2
        ;;
      --yes)
        ASSUME_YES="true"
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

assert_non_empty() {
  local value="${1-}"
  local label="$2"
  [[ -n "$value" ]] || common::die "${label} is required."
}

request_service_change() {
  local field="$1"
  local type="$2"
  local new_value_json="$3"
  local payload

  payload="$(
    jq -n \
      --arg field "$field" \
      --arg type "$type" \
      --argjson new_value "$new_value_json" \
      '{field: $field, type: $type, new_value: $new_value}'
  )"
  zane::api PUT \
    "projects/${PROJECT_SLUG}/${ENVIRONMENT_NAME}/request-service-changes/${SERVICE_SLUG}/" \
    "$payload" >/dev/null
}

add_env() {
  local key="$1"
  local value="$2"
  local new_value_json

  new_value_json="$(jq -n --arg key "$key" --arg value "$value" '{key: $key, value: $value}')"
  request_service_change "env_variables" "ADD" "$new_value_json"
}

archive_temp_service() {
  [[ -n "${SERVICE_SLUG:-}" ]] || return 0
  zane::api DELETE "projects/${PROJECT_SLUG}/${ENVIRONMENT_NAME}/archive-service/docker/${SERVICE_SLUG}/" >/dev/null 2>&1 || true
}

verify_template_db() {
  local operator_url="$1"
  local operator_token="$2"
  local verify_body response_file status

  verify_body="$(jq -n --argjson pr_number "$VERIFY_PR_NUMBER" '{pr_number: $pr_number}')"
  for _ in {1..60}; do
    response_file="$(mktemp)"
    status="$(
      curl --silent --show-error \
        --output "$response_file" \
        --write-out "%{http_code}" \
        --header "Authorization: Bearer ${operator_token}" \
        --header "Content-Type: application/json" \
        --data "$verify_body" \
        "${operator_url%/}/v1/preview-db/ensure"
    )"

    if [[ "$status" =~ ^2 ]]; then
      rm -f "$response_file"
      curl --silent --show-error \
        --request DELETE \
        --header "Authorization: Bearer ${operator_token}" \
        "${operator_url%/}/v1/preview-db/${VERIFY_PR_NUMBER}" >/dev/null || true
      return 0
    fi

    rm -f "$response_file"
    sleep 5
  done

  return 1
}

main() {
  local plan_json db_host db_port db_user db_password db_admin_name db_sslmode
  local source_db_name template_db_name staging_db_name template_owner
  local operator_url operator_token create_payload command_payload refresh_command deploy_json

  parse_args "$@"
  dev::load_env_file "$ENV_FILE" optional

  ZANE_BASE_URL="$(dev::first_non_empty "$ZANE_BASE_URL" "${ZANEOPS_URL:-}" "${DC_ZANE_OPERATOR_ZANE_BASE_URL:-}")"
  ZANE_USERNAME="$(dev::first_non_empty "$ZANE_USERNAME" "${ZANEOPS_USERNAME:-}" "${DC_ZANE_OPERATOR_ZANE_USERNAME:-}")"
  ZANE_PASSWORD="$(dev::first_non_empty "$ZANE_PASSWORD" "${ZANEOPS_PASSWORD:-}" "${DC_ZANE_OPERATOR_ZANE_PASSWORD:-}")"
  PROJECT_SLUG="$(dev::first_non_empty "$PROJECT_SLUG" "${ZANE_PROJECT_SLUG:-}")"
  ENVIRONMENT_NAME="$(dev::first_non_empty "$ENVIRONMENT_NAME" "${ZANE_ENVIRONMENT_NAME:-}" "${ZANE_PRODUCTION_ENVIRONMENT_NAME:-}" "production")"
  SERVICE_SLUG="$(dev::first_non_empty "$SERVICE_SLUG" "template-db-refresh-$(date +%H%M%S)")"

  assert_non_empty "$ZANE_BASE_URL" "Zane base URL"
  assert_non_empty "$ZANE_USERNAME" "Zane username"
  assert_non_empty "$ZANE_PASSWORD" "Zane password"
  assert_non_empty "$PROJECT_SLUG" "Zane project slug"
  assert_non_empty "$ENVIRONMENT_NAME" "Zane environment name"
  common::require_command curl
  common::require_command jq
  common::configure_curl_ca_bundle_from_local_caddy "$ZANE_BASE_URL"

  zane::login
  trap 'archive_temp_service; [[ -n "${COOKIE_JAR:-}" && -f "${COOKIE_JAR:-}" ]] && rm -f "$COOKIE_JAR"' EXIT

  plan_json="$(
    bash "${REPO_ROOT}/scripts/dev/refresh-zane-template-db.sh" \
      --env-file "$ENV_FILE" \
      --zane-base-url "$ZANE_BASE_URL" \
      --project-slug "$PROJECT_SLUG" \
      --environment-name "$ENVIRONMENT_NAME" \
      --dry-run \
      --yes
  )"

  db_host="$(jq -r '.db_host' <<<"$plan_json")"
  db_port="$(jq -r '.db_port' <<<"$plan_json")"
  db_user="$(jq -r '.db_user' <<<"$plan_json")"
  db_password="${DC_POSTGRES_SUPERUSER_PASSWORD:-}"
  db_admin_name="$(jq -r '.db_admin_name' <<<"$plan_json")"
  db_sslmode="$(jq -r '.db_sslmode' <<<"$plan_json")"
  source_db_name="$(jq -r '.source_db_name' <<<"$plan_json")"
  template_db_name="$(jq -r '.template_db_name' <<<"$plan_json")"
  staging_db_name="zane_template_staging_$(date +%Y%m%d%H%M%S)"
  template_owner="$(jq -r '.template_owner' <<<"$plan_json")"
  operator_url="$(dev::first_non_empty "${ZANEOPS_ZANE_OPERATOR_BASE_URL:-}" "${ZANE_OPERATOR_BASE_URL:-}" "https://new-engine-zane-operator-zane.web-revolution.cz")"
  operator_token="$(dev::first_non_empty "${ZANEOPS_ZANE_OPERATOR_API_TOKEN:-}" "${DC_ZANE_OPERATOR_API_AUTH_TOKEN:-}")"

  assert_non_empty "$db_host" "DB host"
  assert_non_empty "$db_port" "DB port"
  assert_non_empty "$db_user" "DB user"
  assert_non_empty "$db_password" "DB password"
  assert_non_empty "$db_admin_name" "DB admin database"
  assert_non_empty "$source_db_name" "source DB name"
  assert_non_empty "$template_db_name" "template DB name"
  assert_non_empty "$template_owner" "template owner"
  assert_non_empty "$operator_token" "operator API token"

  dev::confirm_or_die "refresh ${PROJECT_SLUG}/${ENVIRONMENT_NAME}" "About to deploy a temporary Zane service ${SERVICE_SLUG} to refresh ${template_db_name}."

  create_payload="$(jq -n --arg slug "$SERVICE_SLUG" --arg image "postgres:18.1-alpine" '{slug: $slug, image: $image}')"
  zane::api POST "projects/${PROJECT_SLUG}/${ENVIRONMENT_NAME}/create-service/docker/" "$create_payload" >/dev/null

  add_env PGHOST "$db_host"
  add_env PGPORT "$db_port"
  add_env PGUSER "$db_user"
  add_env PGPASSWORD "$db_password"
  add_env PGDATABASE "$db_admin_name"
  add_env PGSSLMODE "$db_sslmode"
  add_env SOURCE_DB_NAME "$source_db_name"
  add_env TEMPLATE_DB_NAME "$template_db_name"
  add_env STAGING_DB_NAME "$staging_db_name"
  add_env TEMPLATE_OWNER "$template_owner"

  read -r -d '' refresh_command <<'SH' || true
sh -lc '
set -eu
DUMP_FILE=/tmp/template_medusa.dump
echo "refresh: dumping source database"
pg_dump --host "$PGHOST" --port "$PGPORT" --username "$PGUSER" --dbname "$SOURCE_DB_NAME" --format=custom --no-owner --no-privileges --file "$DUMP_FILE"
echo "refresh: preparing staging database"
psql --host "$PGHOST" --port "$PGPORT" --username "$PGUSER" --dbname "$PGDATABASE" -v ON_ERROR_STOP=1 -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '\''${STAGING_DB_NAME}'\'' AND pid <> pg_backend_pid();"
psql --host "$PGHOST" --port "$PGPORT" --username "$PGUSER" --dbname "$PGDATABASE" -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS ${STAGING_DB_NAME};"
psql --host "$PGHOST" --port "$PGPORT" --username "$PGUSER" --dbname "$PGDATABASE" -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${STAGING_DB_NAME} OWNER ${TEMPLATE_OWNER};"
echo "refresh: restoring staging database"
pg_restore --host "$PGHOST" --port "$PGPORT" --username "$PGUSER" --dbname "$STAGING_DB_NAME" --role "$TEMPLATE_OWNER" --clean --if-exists --no-owner --no-privileges "$DUMP_FILE"
echo "refresh: swapping template database"
TEMPLATE_EXISTS="$(psql --host "$PGHOST" --port "$PGPORT" --username "$PGUSER" --dbname "$PGDATABASE" -tA -c "SELECT 1 FROM pg_database WHERE datname = '\''${TEMPLATE_DB_NAME}'\''")"
if [ "$TEMPLATE_EXISTS" = "1" ]; then
  psql --host "$PGHOST" --port "$PGPORT" --username "$PGUSER" --dbname "$PGDATABASE" -v ON_ERROR_STOP=1 -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '\''${TEMPLATE_DB_NAME}'\'' AND pid <> pg_backend_pid();"
  psql --host "$PGHOST" --port "$PGPORT" --username "$PGUSER" --dbname "$PGDATABASE" -v ON_ERROR_STOP=1 -c "DROP DATABASE ${TEMPLATE_DB_NAME};"
fi
psql --host "$PGHOST" --port "$PGPORT" --username "$PGUSER" --dbname "$PGDATABASE" -v ON_ERROR_STOP=1 -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '\''${STAGING_DB_NAME}'\'' AND pid <> pg_backend_pid();"
psql --host "$PGHOST" --port "$PGPORT" --username "$PGUSER" --dbname "$PGDATABASE" -v ON_ERROR_STOP=1 -c "ALTER DATABASE ${STAGING_DB_NAME} RENAME TO ${TEMPLATE_DB_NAME};"
psql --host "$PGHOST" --port "$PGPORT" --username "$PGUSER" --dbname "$PGDATABASE" -v ON_ERROR_STOP=1 -c "ALTER DATABASE ${TEMPLATE_DB_NAME} OWNER TO ${TEMPLATE_OWNER};"
echo "refresh: complete"
sleep 1800
'
SH

  command_payload="$(jq -n --arg command "$refresh_command" '{field: "command", type: "UPDATE", new_value: $command}')"
  zane::api PUT \
    "projects/${PROJECT_SLUG}/${ENVIRONMENT_NAME}/request-service-changes/${SERVICE_SLUG}/" \
    "$command_payload" >/dev/null

  deploy_json="$(zane::api PUT "projects/${PROJECT_SLUG}/${ENVIRONMENT_NAME}/deploy-service/docker/${SERVICE_SLUG}/")"

  if ! verify_template_db "$operator_url" "$operator_token"; then
    common::die "Timed out waiting for ${template_db_name} verification through zane-operator."
  fi

  jq -n \
    --arg service_slug "$SERVICE_SLUG" \
    --arg deployment_hash "$(jq -r '.hash // empty' <<<"$deploy_json")" \
    --arg template_db_name "$template_db_name" \
    '{temporary_service_slug: $service_slug, deployment_hash: $deployment_hash, template_db_name: $template_db_name, verified: true}'
}

main "$@"
