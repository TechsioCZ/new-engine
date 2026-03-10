#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
source "${REPO_ROOT}/scripts/ci/lib.sh"

ENV_FILE="${REPO_ROOT}/.env.docker"
ZANE_BASE_URL="${ZANE_BASE_URL:-}"
ZANE_USERNAME="${ZANE_USERNAME:-}"
ZANE_PASSWORD="${ZANE_PASSWORD:-}"
PROJECT_SLUG="${ZANE_PROJECT_SLUG:-new-engine}"
PROJECT_DESCRIPTION="${ZANE_PROJECT_DESCRIPTION:-new-engine local bootstrap}"
ENVIRONMENT_NAME="production"
REPOSITORY_URL="${ZANE_REPOSITORY_URL:-}"
BRANCH_NAME="${ZANE_BRANCH_NAME:-}"
GIT_APP_ID="${ZANE_GIT_APP_ID:-}"
PUBLIC_DOMAIN="${ZANE_PUBLIC_DOMAIN:-}"
PUBLIC_URL_AFFIX="${ZANE_PUBLIC_URL_AFFIX:--zane}"

MEDUSA_BACKEND_URL_OVERRIDE="${ZANE_PUBLIC_MEDUSA_BACKEND_URL:-}"
N1_SITE_URL_OVERRIDE="${ZANE_PUBLIC_N1_URL:-}"
MEILISEARCH_URL_OVERRIDE="${ZANE_PUBLIC_MEILISEARCH_URL:-}"
MINIO_FILE_URL_OVERRIDE="${ZANE_PUBLIC_MINIO_FILE_URL:-}"
STORE_CORS_OVERRIDE="${ZANE_STORE_CORS:-}"
ADMIN_CORS_OVERRIDE="${ZANE_ADMIN_CORS:-}"
AUTH_CORS_OVERRIDE="${ZANE_AUTH_CORS:-}"

OPERATOR_UPSTREAM_ZANE_BASE_URL="${ZANE_OPERATOR_UPSTREAM_ZANE_BASE_URL:-}"
OPERATOR_UPSTREAM_ZANE_USERNAME="${ZANE_OPERATOR_UPSTREAM_ZANE_USERNAME:-}"
OPERATOR_UPSTREAM_ZANE_PASSWORD="${ZANE_OPERATOR_UPSTREAM_ZANE_PASSWORD:-}"
ZANE_ROOT_DOMAIN=""
ZANE_APP_DOMAIN=""
COMPUTED_MEDUSA_DB_HOST=""
COMPUTED_VALKEY_HOST=""
COMPUTED_MINIO_HOST=""
COMPUTED_MEILI_HOST=""
COMPUTED_MEDUSA_BE_HOST=""
COMPUTED_MEDUSA_BE_PUBLIC_URL=""
COMPUTED_N1_PUBLIC_URL=""
COMPUTED_MEILISEARCH_PUBLIC_URL=""

COOKIE_JAR=""
CSRF_TOKEN=""

setup::usage() {
  cat <<'EOF'
Usage:
  scripts/dev/setup-zane-project.sh [options]

Creates or reuses a Zane project, creates the required Git-backed services, and
upserts the shared/service environment contract used by the deployed stack.

Options:
  --env-file PATH                Source local values from PATH (default: .env.docker)
  --zane-base-url URL            Zane base URL used by this setup script
  --zane-username USER           Zane username used by this setup script
  --zane-password PASS           Zane password used by this setup script
  --project-slug SLUG            Canonical Zane project slug (default: new-engine)
  --project-description TEXT     Project description when creating the project
  --repository-url URL           Git repository URL (default: origin remote as https)
  --branch NAME                  Git branch to configure (default: master)
  --git-app-id ID                Optional Zane git app id for private repositories
  --public-domain DOMAIN         Public root domain for managed service URLs
                                 (default: auto-discovered from Zane API settings)
  --public-url-affix SUFFIX      Service URL suffix between service slug and domain
                                 (default: -zane)
  --medusa-backend-url URL       Public Medusa backend URL override
  --n1-site-url URL              Public N1 site URL override
  --meilisearch-url URL          Public Meilisearch URL override
  --minio-file-url URL           Public MinIO file URL override
  --store-cors VALUE             STORE_CORS override
  --admin-cors VALUE             ADMIN_CORS override
  --auth-cors VALUE              AUTH_CORS override
  --operator-upstream-zane-base-url URL
                                 Upstream Zane URL for the deployed zane-operator
  --operator-upstream-zane-username USER
                                 Upstream Zane username for the deployed zane-operator
  --operator-upstream-zane-password PASS
                                 Upstream Zane password for the deployed zane-operator
  --help                         Show this help

Notes:
  - The helper manages public routes for medusa-be, n1, medusa-meilisearch, and zane-operator.
  - The default branch is intentionally master. Use --branch for non-master runs.
EOF
}

setup::parse_args() {
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
      --project-description)
        PROJECT_DESCRIPTION="$2"
        shift 2
        ;;
      --repository-url)
        REPOSITORY_URL="$2"
        shift 2
        ;;
      --branch)
        BRANCH_NAME="$2"
        shift 2
        ;;
      --git-app-id)
        GIT_APP_ID="$2"
        shift 2
        ;;
      --public-domain)
        PUBLIC_DOMAIN="$2"
        shift 2
        ;;
      --public-url-affix)
        PUBLIC_URL_AFFIX="$2"
        shift 2
        ;;
      --medusa-backend-url)
        MEDUSA_BACKEND_URL_OVERRIDE="$2"
        shift 2
        ;;
      --n1-site-url)
        N1_SITE_URL_OVERRIDE="$2"
        shift 2
        ;;
      --meilisearch-url)
        MEILISEARCH_URL_OVERRIDE="$2"
        shift 2
        ;;
      --minio-file-url)
        MINIO_FILE_URL_OVERRIDE="$2"
        shift 2
        ;;
      --store-cors)
        STORE_CORS_OVERRIDE="$2"
        shift 2
        ;;
      --admin-cors)
        ADMIN_CORS_OVERRIDE="$2"
        shift 2
        ;;
      --auth-cors)
        AUTH_CORS_OVERRIDE="$2"
        shift 2
        ;;
      --operator-upstream-zane-base-url)
        OPERATOR_UPSTREAM_ZANE_BASE_URL="$2"
        shift 2
        ;;
      --operator-upstream-zane-username)
        OPERATOR_UPSTREAM_ZANE_USERNAME="$2"
        shift 2
        ;;
      --operator-upstream-zane-password)
        OPERATOR_UPSTREAM_ZANE_PASSWORD="$2"
        shift 2
        ;;
      --help)
        setup::usage
        exit 0
        ;;
      *)
        ci::die "Unknown argument: $1"
        ;;
    esac
  done
}

setup::load_env_file() {
  [[ -f "$ENV_FILE" ]] || ci::die "Env file not found: $ENV_FILE"

  set +u
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
  set -u
}

setup::normalize_base_url() {
  ZANE_BASE_URL="${ZANE_BASE_URL:-${DC_ZANE_OPERATOR_ZANE_BASE_URL:-http://localhost}}"
  ZANE_BASE_URL="${ZANE_BASE_URL%/}"

  OPERATOR_UPSTREAM_ZANE_BASE_URL="${OPERATOR_UPSTREAM_ZANE_BASE_URL:-${DC_ZANE_OPERATOR_ZANE_BASE_URL:-}}"
  OPERATOR_UPSTREAM_ZANE_USERNAME="${OPERATOR_UPSTREAM_ZANE_USERNAME:-${DC_ZANE_OPERATOR_ZANE_USERNAME:-}}"
  OPERATOR_UPSTREAM_ZANE_PASSWORD="${OPERATOR_UPSTREAM_ZANE_PASSWORD:-${DC_ZANE_OPERATOR_ZANE_PASSWORD:-}}"
}

setup::is_loopback_url() {
  local value="${1:-}"
  [[ "$value" =~ ^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?(/.*)?$ ]] || [[ "$value" =~ ^(localhost|127\.0\.0\.1)(:[0-9]+)?$ ]]
}

setup::normalize_origin_url() {
  local value="${1:-}"

  if [[ -z "$value" ]]; then
    printf '\n'
    return
  fi

  value="${value%/}"
  if [[ "$value" =~ ^https?:// ]]; then
    printf '%s\n' "$value"
    return
  fi

  printf 'https://%s\n' "$value"
}

setup::prefer_public_url() {
  local explicit_value="${1:-}"
  local env_value="${2:-}"
  local fallback_value="${3:-}"

  if [[ -n "$explicit_value" ]]; then
    printf '%s\n' "$explicit_value"
    return
  fi

  if [[ -n "$env_value" ]] && ! setup::is_loopback_url "$env_value"; then
    printf '%s\n' "$env_value"
    return
  fi

  printf '%s\n' "$fallback_value"
}

setup::prefer_public_csv_or_url() {
  local explicit_value="${1:-}"
  local env_value="${2:-}"
  local fallback_value="${3:-}"

  if [[ -n "$explicit_value" ]]; then
    printf '%s\n' "$explicit_value"
    return
  fi

  jq -rRn \
    --arg env_value "$env_value" \
    --arg fallback_value "$fallback_value" '
      def trim: sub("^\\s+"; "") | sub("\\s+$"; "");
      def strip_slash: if . == "/" then . else sub("/+$"; "") end;
      def is_loopback:
        test("^(https?://)?(localhost|127\\.0\\.0\\.1)(:[0-9]+)?(/.*)?$");
      (
        ($env_value | split(",") | map(trim | select(length > 0) | strip_slash | select(is_loopback | not)))
        + [($fallback_value | trim | strip_slash)]
      )
      | map(select(length > 0))
      | unique
      | join(",")
    '
}

setup::derive_repository_url() {
  local remote_url

  [[ -n "$REPOSITORY_URL" ]] && return

  remote_url="$(git -C "$REPO_ROOT" remote get-url origin 2>/dev/null || true)"
  [[ -n "$remote_url" ]] || ci::die "Unable to determine repository URL from origin."

  case "$remote_url" in
    git@github.com:*)
      REPOSITORY_URL="https://github.com/${remote_url#git@github.com:}"
      ;;
    ssh://git@github.com/*)
      REPOSITORY_URL="https://github.com/${remote_url#ssh://git@github.com/}"
      ;;
    https://github.com/*)
      REPOSITORY_URL="$remote_url"
      ;;
    *)
      ci::die "Unsupported git remote for bootstrap: $remote_url"
      ;;
  esac
}

setup::derive_branch_name() {
  [[ -n "$BRANCH_NAME" ]] || BRANCH_NAME="master"
}

setup::require_tools() {
  ci::require_command curl
  ci::require_command git
  ci::require_command jq
  ci::require_command mktemp
}

zane::request() {
  local method="$1"
  local path="$2"
  local body="${3-}"
  local response_file status
  local url="${ZANE_BASE_URL}/api/${path#/}"
  local curl_args=()

  response_file="$(mktemp)"
  curl_args=(
    --silent
    --show-error
    --location
    --request "$method"
    --cookie "$COOKIE_JAR"
    --cookie-jar "$COOKIE_JAR"
    --header 'Accept: application/json'
    --output "$response_file"
    --write-out '%{http_code}'
  )

  if [[ "$method" != "GET" ]]; then
    curl_args+=(--header "X-CSRFToken: ${CSRF_TOKEN}")
  fi

  if [[ -n "$body" ]]; then
    curl_args+=(
      --header 'Content-Type: application/json'
      --data "$body"
    )
  fi

  curl_args+=("$url")
  status="$(curl "${curl_args[@]}")"
  printf '%s\t%s\n' "$status" "$response_file"
}

zane::api() {
  local method="$1"
  local path="$2"
  local body="${3-}"
  local status response_file

  read -r status response_file < <(zane::request "$method" "$path" "$body")
  if [[ ! "$status" =~ ^2 ]]; then
    {
      echo "Zane API request failed:"
      echo "  ${method} ${path}"
      echo "  HTTP ${status}"
      echo "  response: $(cat "$response_file")"
    } >&2
    rm -f "$response_file"
    exit 1
  fi

  cat "$response_file"
  rm -f "$response_file"
}

zane::api_optional_get() {
  local path="$1"
  local status response_file

  read -r status response_file < <(zane::request GET "$path")
  if [[ "$status" == "404" ]]; then
    rm -f "$response_file"
    return 1
  fi
  if [[ ! "$status" =~ ^2 ]]; then
    {
      echo "Zane API request failed:"
      echo "  GET ${path}"
      echo "  HTTP ${status}"
      echo "  response: $(cat "$response_file")"
    } >&2
    rm -f "$response_file"
    exit 1
  fi

  cat "$response_file"
  rm -f "$response_file"
}

zane::refresh_csrf_token() {
  CSRF_TOKEN="$(
    awk '
      $6 == "csrftoken" {
        token = $7
      }
      END {
        print token
      }
    ' "$COOKIE_JAR"
  )"
}

zane::login() {
  local login_payload

  COOKIE_JAR="$(mktemp)"
  trap 'rm -f "$COOKIE_JAR"' EXIT

  zane::api GET "csrf/" >/dev/null
  zane::refresh_csrf_token
  [[ -n "$CSRF_TOKEN" ]] || ci::die "Unable to obtain CSRF token from Zane."

  login_payload="$(
    jq -n \
      --arg username "$ZANE_USERNAME" \
      --arg password "$ZANE_PASSWORD" \
      '{username: $username, password: $password}'
  )"

  zane::api POST "auth/login/" "$login_payload" >/dev/null
  zane::refresh_csrf_token
}

zane::settings() {
  zane::api GET "settings/"
}

zane::ensure_project() {
  local projects_json create_payload

  projects_json="$(zane::api GET "projects/")"
  if jq -e --arg slug "$PROJECT_SLUG" '.[] | select(.slug == $slug)' >/dev/null <<<"$projects_json"; then
    return
  fi

  create_payload="$(
    jq -n \
      --arg slug "$PROJECT_SLUG" \
      --arg description "$PROJECT_DESCRIPTION" \
      '{slug: $slug, description: $description}'
  )"
  zane::api POST "projects/" "$create_payload" >/dev/null
}

zane::get_service() {
  local service_slug="$1"
  zane::api_optional_get "projects/${PROJECT_SLUG}/${ENVIRONMENT_NAME}/service-details/${service_slug}/"
}

zane::create_git_service() {
  local service_slug="$1"
  local dockerfile_path="$2"
  local build_context_dir="$3"
  local payload

  payload="$(
    jq -n \
      --arg slug "$service_slug" \
      --arg repository_url "$REPOSITORY_URL" \
      --arg branch_name "$BRANCH_NAME" \
      --arg dockerfile_path "$dockerfile_path" \
      --arg build_context_dir "$build_context_dir" \
      --arg git_app_id "$GIT_APP_ID" \
      '
        {
          slug: $slug,
          repository_url: $repository_url,
          branch_name: $branch_name,
          builder: "DOCKERFILE",
          dockerfile_path: $dockerfile_path,
          build_context_dir: $build_context_dir
        }
        + (if $git_app_id != "" then {git_app_id: $git_app_id} else {} end)
      '
  )"

  zane::api POST "projects/${PROJECT_SLUG}/${ENVIRONMENT_NAME}/create-service/git/" "$payload" >/dev/null
}

zane::request_service_change() {
  local service_slug="$1"
  local payload="$2"

  zane::api PUT \
    "projects/${PROJECT_SLUG}/${ENVIRONMENT_NAME}/request-service-changes/${service_slug}/" \
    "$payload" >/dev/null
}

zane::cancel_service_change() {
  local service_slug="$1"
  local change_id="$2"

  zane::api DELETE \
    "projects/${PROJECT_SLUG}/${ENVIRONMENT_NAME}/cancel-service-changes/${service_slug}/${change_id}/" >/dev/null
}

zane::ensure_shared_env_var() {
  local key="$1"
  local value="$2"
  local vars_json existing_id payload current_value

  vars_json="$(zane::api GET "projects/${PROJECT_SLUG}/${ENVIRONMENT_NAME}/variables/")"
  existing_id="$(jq -r --arg key "$key" '.[] | select(.key == $key) | .id' <<<"$vars_json")"

  payload="$(
    jq -n \
      --arg key "$key" \
      --arg value "$value" \
      '{key: $key, value: $value}'
  )"

  if [[ -n "$existing_id" ]]; then
    current_value="$(jq -r --arg key "$key" '.[] | select(.key == $key) | .value' <<<"$vars_json")"
    [[ "$current_value" == "$value" ]] && return
    zane::api PATCH "projects/${PROJECT_SLUG}/${ENVIRONMENT_NAME}/variables/${existing_id}/" "$payload" >/dev/null
    return
  fi

  zane::api POST "projects/${PROJECT_SLUG}/${ENVIRONMENT_NAME}/variables/" "$payload" >/dev/null
}

zane::delete_shared_env_var() {
  local key="$1"
  local vars_json existing_id

  vars_json="$(zane::api GET "projects/${PROJECT_SLUG}/${ENVIRONMENT_NAME}/variables/")"
  existing_id="$(jq -r --arg key "$key" '.[] | select(.key == $key) | .id' <<<"$vars_json")"
  [[ -n "$existing_id" ]] || return 0

  zane::api DELETE "projects/${PROJECT_SLUG}/${ENVIRONMENT_NAME}/variables/${existing_id}/" >/dev/null
}

setup::capture_zane_settings() {
  local settings_json

  settings_json="$(zane::settings)"
  ZANE_ROOT_DOMAIN="$(jq -r '.root_domain // empty' <<<"$settings_json")"
  ZANE_APP_DOMAIN="$(jq -r '.app_domain // empty' <<<"$settings_json")"
  OPERATOR_UPSTREAM_ZANE_BASE_URL="$(setup::normalize_origin_url "$OPERATOR_UPSTREAM_ZANE_BASE_URL")"

  PUBLIC_DOMAIN="${PUBLIC_DOMAIN:-$ZANE_ROOT_DOMAIN}"
  [[ -n "$PUBLIC_DOMAIN" ]] || ci::die "Unable to determine public root domain from Zane. Pass --public-domain."

  if [[ -z "$OPERATOR_UPSTREAM_ZANE_BASE_URL" ]] || setup::is_loopback_url "$OPERATOR_UPSTREAM_ZANE_BASE_URL"; then
    [[ -n "$ZANE_APP_DOMAIN" ]] || ci::die "Unable to determine Zane app domain from Zane settings."
    OPERATOR_UPSTREAM_ZANE_BASE_URL="https://${ZANE_APP_DOMAIN}"
  fi
}

setup::public_service_domain() {
  local service_slug="$1"
  printf '%s\n' "${PROJECT_SLUG}-${service_slug}${PUBLIC_URL_AFFIX}.${PUBLIC_DOMAIN}"
}

setup::public_service_origin() {
  local service_slug="$1"
  printf 'https://%s\n' "$(setup::public_service_domain "$service_slug")"
}

setup::service_public_urls_json() {
  local service_slug="$1"
  local domain port

  case "$service_slug" in
    medusa-be)
      port=9000
      ;;
    n1)
      port=3000
      ;;
    medusa-meilisearch)
      port=7700
      ;;
    zane-operator)
      port=8080
      ;;
    *)
      printf '%s\n' '[]'
      return 0
      ;;
  esac

  domain="$(setup::public_service_domain "$service_slug")"
  jq -cS -n \
    --arg domain "$domain" \
    --argjson port "$port" \
    '[
      {
        domain: $domain,
        base_path: "/",
        strip_prefix: true,
        associated_port: $port
      }
    ]'
}

setup::service_spec_json() {
  local service_slug="$1"

  case "$service_slug" in
    medusa-db)
      printf '%s\n' '{"dockerfile_path":"./docker/development/postgres/Dockerfile","build_context_dir":"./docker/development/postgres","command":"su -c \"/usr/local/bin/docker-entrypoint.sh -c file_copy_method=clone\" postgres","volumes":[{"name":"pgdata","container_path":"/var/lib/postgresql","host_path":null,"mode":"READ_WRITE"}],"envs":{"POSTGRES_USER":"{{env.MEDUSA_DB_POSTGRES_SUPERUSER}}","POSTGRES_PASSWORD":"{{env.MEDUSA_DB_POSTGRES_SUPERUSER_PASSWORD}}","POSTGRES_DB":"{{env.MEDUSA_APP_DB_NAME}}","PGDATA":"/var/lib/postgresql/18/docker","MEDUSA_APP_DB_USER":"{{env.MEDUSA_APP_DB_USER}}","MEDUSA_APP_DB_PASSWORD":"{{env.MEDUSA_APP_DB_PASSWORD}}","MEDUSA_APP_DB_NAME":"{{env.MEDUSA_APP_DB_NAME}}","MEDUSA_APP_DB_SCHEMA":"{{env.MEDUSA_APP_DB_SCHEMA}}","MEDUSA_DEV_DB_USER":"{{env.MEDUSA_DEV_DB_USER}}","MEDUSA_DEV_DB_PASSWORD":"{{env.MEDUSA_DEV_DB_PASSWORD}}"}}'
      ;;
    medusa-valkey)
      printf '%s\n' '{"dockerfile_path":"./docker/development/medusa-valkey/Dockerfile","build_context_dir":"./docker/development/medusa-valkey","command":"sh -lc '\''exec valkey-server --requirepass \"$VALKEY_PASSWORD\" --appendonly yes'\''","volumes":[{"name":"data","container_path":"/data","host_path":null,"mode":"READ_WRITE"}],"envs":{"VALKEY_PASSWORD":"{{env.MEDUSA_VALKEY_PASSWORD}}"}}'
      ;;
    medusa-minio)
      printf '%s\n' '{"dockerfile_path":"./docker/development/medusa-minio/Dockerfile","build_context_dir":"./docker/development/medusa-minio","command":null,"volumes":[{"name":"data","container_path":"/data","host_path":null,"mode":"READ_WRITE"}],"envs":{"MINIO_ROOT_USER":"{{env.MEDUSA_MINIO_ROOT_USER}}","MINIO_ROOT_PASSWORD":"{{env.MEDUSA_MINIO_ROOT_PASSWORD}}","MINIO_MEDUSA_ACCESS_KEY":"{{env.MEDUSA_MINIO_ACCESS_KEY}}","MINIO_MEDUSA_SECRET_KEY":"{{env.MEDUSA_MINIO_SECRET_KEY}}","MINIO_MEDUSA_BUCKET":"{{env.MEDUSA_MINIO_BUCKET}}"}}'
      ;;
    medusa-meilisearch)
      printf '%s\n' '{"dockerfile_path":"./docker/development/medusa-meilisearch/Dockerfile","build_context_dir":"./docker/development/medusa-meilisearch","command":null,"volumes":[{"name":"data","container_path":"/meili_data","host_path":null,"mode":"READ_WRITE"}],"envs":{"MEILI_MASTER_KEY":"{{env.MEDUSA_MEILISEARCH_MASTER_KEY}}","MEILI_NO_ANALYTICS":"true"}}'
      ;;
    medusa-be)
      printf '%s\n' '{"dockerfile_path":"./docker/development/medusa-be/Dockerfile","build_context_dir":"./","command":null,"volumes":[],"envs":{"NODE_ENV":"{{env.MEDUSA_BE_NODE_ENV}}","JWT_SECRET":"{{env.MEDUSA_BE_JWT_SECRET}}","COOKIE_SECRET":"{{env.MEDUSA_BE_COOKIE_SECRET}}","MEDUSA_BACKEND_URL":"{{env.MEDUSA_BE_BACKEND_URL}}","STORE_CORS":"{{env.MEDUSA_BE_STORE_CORS}}","ADMIN_CORS":"{{env.MEDUSA_BE_ADMIN_CORS}}","AUTH_CORS":"{{env.MEDUSA_BE_AUTH_CORS}}","SUPERADMIN_EMAIL":"{{env.MEDUSA_BE_SUPERADMIN_EMAIL}}","SUPERADMIN_PASSWORD":"{{env.MEDUSA_BE_SUPERADMIN_PASSWORD}}","INITIAL_PUBLISHABLE_KEY_NAME":"{{env.MEDUSA_BE_INITIAL_PUBLISHABLE_KEY_NAME}}","SETTINGS_ENCRYPTION_KEY":"{{env.MEDUSA_BE_SETTINGS_ENCRYPTION_KEY}}","FEATURE_PPL_ENABLED":"{{env.MEDUSA_BE_FEATURE_PPL_ENABLED}}","PPL_ENVIRONMENT":"{{env.MEDUSA_BE_PPL_ENVIRONMENT}}","DATABASE_TYPE":"postgres","MEDUSA_APP_DB_USER":"{{env.MEDUSA_APP_DB_USER}}","MEDUSA_APP_DB_PASSWORD":"{{env.MEDUSA_APP_DB_PASSWORD}}","MEDUSA_APP_DB_NAME":"{{env.MEDUSA_APP_DB_NAME}}","MEDUSA_APP_DB_SCHEMA":"{{env.MEDUSA_APP_DB_SCHEMA}}","MEDUSA_DATABASE_SCHEMA":"{{env.MEDUSA_APP_DB_SCHEMA}}","DATABASE_SCHEMA":"{{env.MEDUSA_APP_DB_SCHEMA}}","DATABASE_URL":"postgresql://{{env.MEDUSA_APP_DB_USER}}:{{env.MEDUSA_APP_DB_PASSWORD}}@{{env.MEDUSA_DB_HOST}}:5432/{{env.MEDUSA_APP_DB_NAME}}?sslmode=disable&options=-csearch_path%3D{{env.MEDUSA_APP_DB_SCHEMA}}%2Cpg_catalog","REDIS_URL":"redis://:{{env.MEDUSA_VALKEY_PASSWORD}}@{{env.MEDUSA_VALKEY_HOST}}:6379","MEILISEARCH_HOST":"http://{{env.MEDUSA_MEILISEARCH_HOST}}:7700","MEILISEARCH_API_KEY":"{{env.MEDUSA_MEILISEARCH_MASTER_KEY}}","MINIO_FILE_URL":"{{env.MEDUSA_MINIO_FILE_URL}}","MINIO_REGION":"{{env.MEDUSA_MINIO_REGION}}","MINIO_ENDPOINT":"{{env.MEDUSA_MINIO_ENDPOINT}}","MINIO_BUCKET":"{{env.MEDUSA_MINIO_BUCKET}}","MINIO_ACCESS_KEY":"{{env.MEDUSA_MINIO_ACCESS_KEY}}","MINIO_SECRET_KEY":"{{env.MEDUSA_MINIO_SECRET_KEY}}"}}'
      ;;
    n1)
      printf '%s\n' '{"dockerfile_path":"./docker/development/n1/Dockerfile","build_context_dir":"./","command":null,"volumes":[],"envs":{"MEDUSA_BACKEND_URL_INTERNAL":"http://{{env.MEDUSA_BE_HOST}}:9000","NEXT_PUBLIC_MEDUSA_BACKEND_URL":"{{env.N1_NEXT_PUBLIC_MEDUSA_BACKEND_URL}}","NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY":"{{env.N1_NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY}}","NEXT_PUBLIC_MEILISEARCH_URL":"{{env.N1_NEXT_PUBLIC_MEILISEARCH_URL}}","NEXT_PUBLIC_MEILISEARCH_API_KEY":"{{env.N1_NEXT_PUBLIC_MEILISEARCH_API_KEY}}","NEXT_PUBLIC_SITE_URL":"{{env.N1_NEXT_PUBLIC_SITE_URL}}"}}'
      ;;
    zane-operator)
      printf '%s\n' '{"dockerfile_path":"./docker/development/zane-operator/Dockerfile","build_context_dir":"./","command":null,"volumes":[],"envs":{"PORT":"8080","API_AUTH_TOKEN":"{{env.ZANE_OPERATOR_API_AUTH_TOKEN}}","PGHOST":"{{env.MEDUSA_DB_HOST}}","PGPORT":"5432","PGUSER":"{{env.MEDUSA_DB_POSTGRES_SUPERUSER}}","PGPASSWORD":"{{env.MEDUSA_DB_POSTGRES_SUPERUSER_PASSWORD}}","PGDATABASE":"postgres","PGSSLMODE":"disable","DB_TEMPLATE_NAME":"{{env.ZANE_OPERATOR_DB_TEMPLATE_NAME}}","DB_PREVIEW_PREFIX":"{{env.ZANE_OPERATOR_DB_PREVIEW_PREFIX}}","DB_PREVIEW_APP_USER_PREFIX":"{{env.ZANE_OPERATOR_DB_PREVIEW_APP_USER_PREFIX}}","DB_PREVIEW_DEV_ROLE":"{{env.MEDUSA_DEV_DB_USER}}","DB_APP_SCHEMA":"{{env.MEDUSA_APP_DB_SCHEMA}}","DB_PREVIEW_APP_PASSWORD_SECRET":"{{env.ZANE_OPERATOR_DB_PREVIEW_APP_PASSWORD_SECRET}}","DB_PROTECTED_NAMES":"{{env.ZANE_OPERATOR_DB_PROTECTED_NAMES}}","ZANE_BASE_URL":"{{env.ZANE_OPERATOR_UPSTREAM_BASE_URL}}","ZANE_USERNAME":"{{env.ZANE_OPERATOR_UPSTREAM_USERNAME}}","ZANE_PASSWORD":"{{env.ZANE_OPERATOR_UPSTREAM_PASSWORD}}"}}'
      ;;
    *)
      ci::die "Unsupported service slug: $service_slug"
      ;;
  esac
}

setup::service_healthcheck_json() {
  local service_slug="$1"

  case "$service_slug" in
    medusa-db)
      jq -cS -n '{
        type: "COMMAND",
        value: "sh -lc '\''pg_isready -U \"$POSTGRES_USER\" -d \"$POSTGRES_DB\"'\''",
        timeout_seconds: 30,
        interval_seconds: 30
      }'
      ;;
    medusa-valkey)
      jq -cS -n '{
        type: "COMMAND",
        value: "sh -lc '\''valkey-cli -a \"$VALKEY_PASSWORD\" --no-auth-warning ping | grep -q PONG'\''",
        timeout_seconds: 30,
        interval_seconds: 5
      }'
      ;;
    medusa-minio)
      jq -cS -n '{
        type: "PATH",
        value: "/minio/health/live",
        timeout_seconds: 30,
        interval_seconds: 10,
        associated_port: 9004
      }'
      ;;
    medusa-meilisearch)
      jq -cS -n '{
        type: "PATH",
        value: "/health",
        timeout_seconds: 30,
        interval_seconds: 10,
        associated_port: 7700
      }'
      ;;
    medusa-be)
      jq -cS -n '{
        type: "PATH",
        value: "/app",
        timeout_seconds: 120,
        interval_seconds: 10,
        associated_port: 9000
      }'
      ;;
    n1)
      jq -cS -n '{
        type: "PATH",
        value: "/api/health",
        timeout_seconds: 30,
        interval_seconds: 30,
        associated_port: 3000
      }'
      ;;
    zane-operator)
      jq -cS -n '{
        type: "PATH",
        value: "/healthz",
        timeout_seconds: 30,
        interval_seconds: 30,
        associated_port: 8080
      }'
      ;;
    *)
      ci::die "Unsupported service slug: $service_slug"
      ;;
  esac
}

setup::service_resource_limits_json() {
  local service_slug="$1"

  case "$service_slug" in
    medusa-db)
      jq -cS -n '{
        cpus: 0.5,
        memory: {
          unit: "MEGABYTES",
          value: 768
        }
      }'
      ;;
    medusa-valkey)
      jq -cS -n '{
        cpus: 0.25,
        memory: {
          unit: "MEGABYTES",
          value: 256
        }
      }'
      ;;
    medusa-minio)
      jq -cS -n '{
        cpus: 0.25,
        memory: {
          unit: "MEGABYTES",
          value: 512
        }
      }'
      ;;
    medusa-meilisearch)
      jq -cS -n '{
        cpus: 0.5,
        memory: {
          unit: "MEGABYTES",
          value: 1024
        }
      }'
      ;;
    medusa-be)
      jq -cS -n '{
        cpus: 1,
        memory: {
          unit: "MEGABYTES",
          value: 2048
        }
      }'
      ;;
    n1)
      jq -cS -n '{
        cpus: 0.75,
        memory: {
          unit: "MEGABYTES",
          value: 1536
        }
      }'
      ;;
    zane-operator)
      jq -cS -n '{
        cpus: 0.25,
        memory: {
          unit: "MEGABYTES",
          value: 256
        }
      }'
      ;;
    *)
      ci::die "Unsupported service slug: $service_slug"
      ;;
  esac
}

setup::service_env_cleanup_keys_json() {
  local service_slug="$1"

  case "$service_slug" in
    medusa-be)
      printf '%s\n' '["LEGACY_DATABASE_URL"]'
      ;;
    n1)
      printf '%s\n' '["NEXT_PUBLIC_META_PIXEL_ID","NEXT_PUBLIC_GOOGLE_ADS_ID","NEXT_PUBLIC_HEUREKA_API_KEY","NEXT_PUBLIC_LEADHUB_TRACKING_ID","RESEND_API_KEY","CONTACT_EMAIL","RESEND_FROM_EMAIL"]'
      ;;
    *)
      printf '%s\n' '[]'
      ;;
  esac
}

setup::shared_env_cleanup_keys_json() {
  printf '%s\n' '["LEGACY_DATABASE_URL","SENTRY_NAME","SENTRY_DSN","NEXT_PUBLIC_META_PIXEL_ID","NEXT_PUBLIC_GOOGLE_ADS_ID","NEXT_PUBLIC_HEUREKA_API_KEY","NEXT_PUBLIC_LEADHUB_TRACKING_ID","RESEND_API_KEY","CONTACT_EMAIL","RESEND_FROM_EMAIL","NODE_ENV","MEDUSA_BACKEND_URL","STORE_CORS","ADMIN_CORS","AUTH_CORS","NEXT_PUBLIC_SITE_URL","NEXT_PUBLIC_MEDUSA_BACKEND_URL","NEXT_PUBLIC_MEILISEARCH_URL","NEXT_PUBLIC_MEILISEARCH_API_KEY","NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY","MINIO_FILE_URL","VALKEY_HOST","MINIO_HOST","MEILI_HOST","POSTGRES_SUPERUSER","POSTGRES_SUPERUSER_PASSWORD","VALKEY_PASSWORD","MINIO_ROOT_USER","MINIO_ROOT_PASSWORD","MINIO_ACCESS_KEY","MINIO_SECRET_KEY","MINIO_BUCKET","MINIO_REGION","MINIO_ENDPOINT","MEILI_MASTER_KEY","JWT_SECRET","COOKIE_SECRET","SETTINGS_ENCRYPTION_KEY","SUPERADMIN_EMAIL","SUPERADMIN_PASSWORD","INITIAL_PUBLISHABLE_KEY_NAME","FEATURE_PPL_ENABLED","PPL_ENVIRONMENT","MEDUSA_BE_NODE_ENV","MEDUSA_BE_BACKEND_URL","MEDUSA_BE_STORE_CORS","MEDUSA_BE_ADMIN_CORS","MEDUSA_BE_AUTH_CORS","N1_NEXT_PUBLIC_SITE_URL","N1_NEXT_PUBLIC_MEDUSA_BACKEND_URL","N1_NEXT_PUBLIC_MEILISEARCH_URL","N1_NEXT_PUBLIC_MEILISEARCH_API_KEY","N1_NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY","MEDUSA_BE_HOST","MEDUSA_DB_POSTGRES_SUPERUSER","MEDUSA_DB_POSTGRES_SUPERUSER_PASSWORD","MEDUSA_DEV_DB_USER","MEDUSA_DEV_DB_PASSWORD","MEDUSA_MINIO_ROOT_USER","MEDUSA_MINIO_ROOT_PASSWORD","MEDUSA_MINIO_REGION","MEDUSA_MINIO_ENDPOINT","MEDUSA_MINIO_FILE_URL","MEDUSA_MINIO_HOST","MEDUSA_BE_JWT_SECRET","MEDUSA_BE_COOKIE_SECRET","MEDUSA_BE_SETTINGS_ENCRYPTION_KEY","MEDUSA_BE_SUPERADMIN_EMAIL","MEDUSA_BE_SUPERADMIN_PASSWORD","MEDUSA_BE_INITIAL_PUBLISHABLE_KEY_NAME","MEDUSA_BE_FEATURE_PPL_ENABLED","MEDUSA_BE_PPL_ENVIRONMENT","ZANE_OPERATOR_API_AUTH_TOKEN","ZANE_OPERATOR_DB_PREVIEW_APP_PASSWORD_SECRET","ZANE_OPERATOR_DB_TEMPLATE_NAME","ZANE_OPERATOR_DB_PREVIEW_PREFIX","ZANE_OPERATOR_DB_PREVIEW_APP_USER_PREFIX","ZANE_OPERATOR_DB_PROTECTED_NAMES","ZANE_OPERATOR_UPSTREAM_BASE_URL","ZANE_OPERATOR_UPSTREAM_USERNAME","ZANE_OPERATOR_UPSTREAM_PASSWORD"]'
}

setup::computed_medusa_backend_url() {
  setup::prefer_public_url \
    "$MEDUSA_BACKEND_URL_OVERRIDE" \
    "${DC_N1_NEXT_PUBLIC_MEDUSA_BACKEND_URL:-}" \
    "$COMPUTED_MEDUSA_BE_PUBLIC_URL"
}

setup::computed_n1_site_url() {
  setup::prefer_public_url \
    "$N1_SITE_URL_OVERRIDE" \
    "${DC_N1_NEXT_PUBLIC_SITE_URL:-}" \
    "$COMPUTED_N1_PUBLIC_URL"
}

setup::computed_meilisearch_public_url() {
  setup::prefer_public_url \
    "$MEILISEARCH_URL_OVERRIDE" \
    "${DC_N1_NEXT_PUBLIC_MEILISEARCH_URL:-}" \
    "$COMPUTED_MEILISEARCH_PUBLIC_URL"
}

setup::computed_minio_file_url() {
  printf '%s\n' "${MINIO_FILE_URL_OVERRIDE:-http://${COMPUTED_MINIO_HOST}:9004/${DC_MINIO_BUCKET:-medusa-bucket}}"
}

setup::computed_store_cors() {
  setup::prefer_public_csv_or_url \
    "$STORE_CORS_OVERRIDE" \
    "${DC_STORE_CORS:-}" \
    "$(setup::computed_n1_site_url)"
}

setup::computed_admin_cors() {
  setup::prefer_public_csv_or_url \
    "$ADMIN_CORS_OVERRIDE" \
    "${DC_ADMIN_CORS:-}" \
    "$(setup::computed_medusa_backend_url)"
}

setup::computed_auth_cors() {
  setup::prefer_public_csv_or_url \
    "$AUTH_CORS_OVERRIDE" \
    "${DC_AUTH_CORS:-}" \
    "$(setup::computed_medusa_backend_url)"
}

setup::service_envs_json() {
  local service_slug="$1"
  local medusa_backend_url next_public_site_url next_public_meilisearch_url minio_file_url
  local store_cors admin_cors auth_cors protected_names

  medusa_backend_url="$(setup::computed_medusa_backend_url)"
  next_public_site_url="$(setup::computed_n1_site_url)"
  next_public_meilisearch_url="$(setup::computed_meilisearch_public_url)"
  minio_file_url="$(setup::computed_minio_file_url)"
  store_cors="$(setup::computed_store_cors)"
  admin_cors="$(setup::computed_admin_cors)"
  auth_cors="$(setup::computed_auth_cors)"
  protected_names="${DC_ZANE_OPERATOR_DB_PROTECTED_NAMES:-postgres,template0,template1}"
  if [[ "$protected_names" != *template_medusa* ]]; then
    protected_names="${protected_names},template_medusa"
  fi

  case "$service_slug" in
    medusa-db)
      jq -n \
        --arg postgres_superuser "${DC_POSTGRES_SUPERUSER:-root}" \
        --arg postgres_superuser_password "${DC_POSTGRES_SUPERUSER_PASSWORD:-root}" \
        --arg medusa_dev_db_user "${DC_MEDUSA_DEV_DB_USER:-medusa_dev}" \
        --arg medusa_dev_db_password "${DC_MEDUSA_DEV_DB_PASSWORD:-medusa_dev_change_me}" \
        '{
          POSTGRES_USER: $postgres_superuser,
          POSTGRES_PASSWORD: $postgres_superuser_password,
          POSTGRES_DB: "{{env.MEDUSA_APP_DB_NAME}}",
          PGDATA: "/var/lib/postgresql/18/docker",
          MEDUSA_APP_DB_USER: "{{env.MEDUSA_APP_DB_USER}}",
          MEDUSA_APP_DB_PASSWORD: "{{env.MEDUSA_APP_DB_PASSWORD}}",
          MEDUSA_APP_DB_NAME: "{{env.MEDUSA_APP_DB_NAME}}",
          MEDUSA_APP_DB_SCHEMA: "{{env.MEDUSA_APP_DB_SCHEMA}}",
          MEDUSA_DEV_DB_USER: $medusa_dev_db_user,
          MEDUSA_DEV_DB_PASSWORD: $medusa_dev_db_password
        }'
      ;;
    medusa-valkey)
      jq -n '{
        VALKEY_PASSWORD: "{{env.MEDUSA_VALKEY_PASSWORD}}"
      }'
      ;;
    medusa-minio)
      jq -n \
        --arg minio_root_user "${DC_MINIO_ROOT_USER:-minioadmin}" \
        --arg minio_root_password "${DC_MINIO_ROOT_PASSWORD:-minioadmin}" \
        '{
          MINIO_ROOT_USER: $minio_root_user,
          MINIO_ROOT_PASSWORD: $minio_root_password,
          MINIO_MEDUSA_ACCESS_KEY: "{{env.MEDUSA_MINIO_ACCESS_KEY}}",
          MINIO_MEDUSA_SECRET_KEY: "{{env.MEDUSA_MINIO_SECRET_KEY}}",
          MINIO_MEDUSA_BUCKET: "{{env.MEDUSA_MINIO_BUCKET}}"
        }'
      ;;
    medusa-meilisearch)
      jq -n '{
        MEILI_MASTER_KEY: "{{env.MEDUSA_MEILISEARCH_MASTER_KEY}}",
        MEILI_NO_ANALYTICS: "true"
      }'
      ;;
    medusa-be)
      jq -n \
        --arg medusa_backend_url "$medusa_backend_url" \
        --arg store_cors "$store_cors" \
        --arg admin_cors "$admin_cors" \
        --arg auth_cors "$auth_cors" \
        --arg jwt_secret "${DC_JWT_SECRET:-supersecret}" \
        --arg cookie_secret "${DC_COOKIE_SECRET:-supersecret}" \
        --arg settings_encryption_key "${DC_SETTINGS_ENCRYPTION_KEY:-}" \
        --arg superadmin_email "${DC_SUPERADMIN_EMAIL:-}" \
        --arg superadmin_password "${DC_SUPERADMIN_PASSWORD:-}" \
        --arg initial_publishable_key_name "${DC_INITIAL_PUBLISHABLE_KEY_NAME:-Storefront Publishable Key}" \
        --arg feature_ppl_enabled "${DC_FEATURE_PPL_ENABLED:-0}" \
        --arg ppl_environment "${DC_PPL_ENVIRONMENT:-testing}" \
        --arg minio_file_url "$minio_file_url" \
        --arg minio_region "${DC_MINIO_REGION:-us-east-1}" \
        --arg minio_endpoint "http://${COMPUTED_MINIO_HOST}:9004/" \
        '{
          NODE_ENV: "production",
          JWT_SECRET: $jwt_secret,
          COOKIE_SECRET: $cookie_secret,
          MEDUSA_BACKEND_URL: $medusa_backend_url,
          STORE_CORS: $store_cors,
          ADMIN_CORS: $admin_cors,
          AUTH_CORS: $auth_cors,
          SUPERADMIN_EMAIL: $superadmin_email,
          SUPERADMIN_PASSWORD: $superadmin_password,
          INITIAL_PUBLISHABLE_KEY_NAME: $initial_publishable_key_name,
          SETTINGS_ENCRYPTION_KEY: $settings_encryption_key,
          FEATURE_PPL_ENABLED: $feature_ppl_enabled,
          PPL_ENVIRONMENT: $ppl_environment,
          DATABASE_TYPE: "postgres",
          MEDUSA_APP_DB_USER: "{{env.MEDUSA_APP_DB_USER}}",
          MEDUSA_APP_DB_PASSWORD: "{{env.MEDUSA_APP_DB_PASSWORD}}",
          MEDUSA_APP_DB_NAME: "{{env.MEDUSA_APP_DB_NAME}}",
          MEDUSA_APP_DB_SCHEMA: "{{env.MEDUSA_APP_DB_SCHEMA}}",
          MEDUSA_DATABASE_SCHEMA: "{{env.MEDUSA_APP_DB_SCHEMA}}",
          DATABASE_SCHEMA: "{{env.MEDUSA_APP_DB_SCHEMA}}",
          DATABASE_URL: "postgresql://{{env.MEDUSA_APP_DB_USER}}:{{env.MEDUSA_APP_DB_PASSWORD}}@{{env.MEDUSA_DB_HOST}}:5432/{{env.MEDUSA_APP_DB_NAME}}?sslmode=disable&options=-csearch_path%3D{{env.MEDUSA_APP_DB_SCHEMA}}%2Cpg_catalog",
          REDIS_URL: "redis://:{{env.MEDUSA_VALKEY_PASSWORD}}@{{env.MEDUSA_VALKEY_HOST}}:6379",
          MEILISEARCH_HOST: "http://{{env.MEDUSA_MEILISEARCH_HOST}}:7700",
          MEILISEARCH_API_KEY: "{{env.MEDUSA_MEILISEARCH_MASTER_KEY}}",
          MINIO_FILE_URL: $minio_file_url,
          MINIO_REGION: $minio_region,
          MINIO_ENDPOINT: $minio_endpoint,
          MINIO_BUCKET: "{{env.MEDUSA_MINIO_BUCKET}}",
          MINIO_ACCESS_KEY: "{{env.MEDUSA_MINIO_ACCESS_KEY}}",
          MINIO_SECRET_KEY: "{{env.MEDUSA_MINIO_SECRET_KEY}}"
        }'
      ;;
    n1)
      jq -n \
        --arg medusa_be_host "$COMPUTED_MEDUSA_BE_HOST" \
        --arg medusa_backend_url "$medusa_backend_url" \
        --arg next_public_site_url "$next_public_site_url" \
        --arg next_public_meilisearch_url "$next_public_meilisearch_url" \
        --arg next_public_meilisearch_api_key "${DC_N1_NEXT_PUBLIC_MEILISEARCH_API_KEY:-}" \
        --arg next_public_medusa_publishable_key "${DC_N1_NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY:-}" \
        '{
          MEDUSA_BACKEND_URL_INTERNAL: ("http://" + $medusa_be_host + ":9000"),
          NEXT_PUBLIC_MEDUSA_BACKEND_URL: $medusa_backend_url,
          NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: $next_public_medusa_publishable_key,
          NEXT_PUBLIC_MEILISEARCH_URL: $next_public_meilisearch_url,
          NEXT_PUBLIC_MEILISEARCH_API_KEY: $next_public_meilisearch_api_key,
          NEXT_PUBLIC_SITE_URL: $next_public_site_url
        }'
      ;;
    zane-operator)
      jq -n \
        --arg api_auth_token "${DC_ZANE_OPERATOR_API_AUTH_TOKEN:-}" \
        --arg postgres_superuser "${DC_POSTGRES_SUPERUSER:-root}" \
        --arg postgres_superuser_password "${DC_POSTGRES_SUPERUSER_PASSWORD:-root}" \
        --arg medusa_dev_db_user "${DC_MEDUSA_DEV_DB_USER:-medusa_dev}" \
        --arg db_preview_app_password_secret "${DC_ZANE_OPERATOR_DB_PREVIEW_APP_PASSWORD_SECRET:-}" \
        --arg db_template_name "${DC_ZANE_OPERATOR_DB_TEMPLATE_NAME:-template_medusa}" \
        --arg db_preview_prefix "${DC_ZANE_OPERATOR_DB_PREVIEW_PREFIX:-medusa_pr_}" \
        --arg db_preview_app_user_prefix "${DC_ZANE_OPERATOR_DB_PREVIEW_APP_USER_PREFIX:-medusa_pr_app_}" \
        --arg db_protected_names "$protected_names" \
        --arg zane_base_url "${OPERATOR_UPSTREAM_ZANE_BASE_URL:-}" \
        --arg zane_username "${OPERATOR_UPSTREAM_ZANE_USERNAME:-}" \
        --arg zane_password "${OPERATOR_UPSTREAM_ZANE_PASSWORD:-}" \
        '{
          PORT: "8080",
          API_AUTH_TOKEN: $api_auth_token,
          PGHOST: "{{env.MEDUSA_DB_HOST}}",
          PGPORT: "5432",
          PGUSER: $postgres_superuser,
          PGPASSWORD: $postgres_superuser_password,
          PGDATABASE: "postgres",
          PGSSLMODE: "disable",
          DB_TEMPLATE_NAME: $db_template_name,
          DB_PREVIEW_PREFIX: $db_preview_prefix,
          DB_PREVIEW_APP_USER_PREFIX: $db_preview_app_user_prefix,
          DB_PREVIEW_DEV_ROLE: $medusa_dev_db_user,
          DB_APP_SCHEMA: "{{env.MEDUSA_APP_DB_SCHEMA}}",
          DB_PREVIEW_APP_PASSWORD_SECRET: $db_preview_app_password_secret,
          DB_PROTECTED_NAMES: $db_protected_names,
          ZANE_BASE_URL: $zane_base_url,
          ZANE_USERNAME: $zane_username,
          ZANE_PASSWORD: $zane_password
        }'
      ;;
    *)
      ci::die "Unsupported service slug for env sync: $service_slug"
      ;;
  esac
}

setup::effective_git_source_json() {
  local service_json="$1"
  jq -cS '
    ([.unapplied_changes[] | select(.field == "git_source")] | last) as $pending
    | if $pending then
        $pending.new_value
      else
        {
          repository_url: .repository_url,
          branch_name: .branch_name,
          commit_sha: (.commit_sha // "HEAD"),
          git_app_id: (.git_app.id // null)
        }
      end
  ' <<<"$service_json"
}

setup::desired_git_source_json() {
  jq -cS \
    -n \
    --arg repository_url "$REPOSITORY_URL" \
    --arg branch_name "$BRANCH_NAME" \
    --arg git_app_id "$GIT_APP_ID" \
    '
      {
        repository_url: $repository_url,
        branch_name: $branch_name,
        commit_sha: "HEAD",
        git_app_id: (if $git_app_id == "" then null else $git_app_id end)
      }
    '
}

setup::effective_builder_json() {
  local service_json="$1"
  jq -cS '
    ([.unapplied_changes[] | select(.field == "builder")] | last) as $pending
    | if $pending then
        $pending.new_value
      else
        {
          builder: .builder,
          options: {
            dockerfile_path: (.dockerfile_builder_options.dockerfile_path // null),
            build_context_dir: (.dockerfile_builder_options.build_context_dir // null),
            build_stage_target: (.dockerfile_builder_options.build_stage_target // null)
          }
        }
      end
  ' <<<"$service_json"
}

setup::desired_builder_json() {
  local dockerfile_path="$1"
  local build_context_dir="$2"
  jq -cS \
    -n \
    --arg dockerfile_path "$dockerfile_path" \
    --arg build_context_dir "$build_context_dir" \
    '
      {
        builder: "DOCKERFILE",
        options: {
          dockerfile_path: $dockerfile_path,
          build_context_dir: $build_context_dir,
          build_stage_target: null
        }
      }
    '
}

setup::effective_volumes_json() {
  local service_json="$1"
  jq -c '
    def normalized_volume(item):
      {
        id: (item.id // null),
        name: item.name,
        container_path: item.container_path,
        host_path: (item.host_path // null),
        mode: item.mode
      };
    def apply_change(items; change):
      if change.type == "ADD" then
        items + [normalized_volume(change.new_value)]
      elif change.type == "UPDATE" then
        items
        | map(
            if .id == change.item_id then
              normalized_volume(. + change.new_value)
            else
              .
            end
          )
      elif change.type == "DELETE" then
        items | map(select(.id != change.item_id))
      else
        items
      end;
    reduce (.unapplied_changes[] | select(.field == "volumes")) as $change
      ([.volumes[] | normalized_volume(.)]; apply_change(.; $change))
  ' <<<"$service_json"
}

setup::effective_urls_json() {
  local service_json="$1"
  jq -c '
    def normalized_url(item):
      {
        id: (item.id // null),
        domain: item.domain,
        base_path: item.base_path,
        strip_prefix: item.strip_prefix,
        redirect_to: (item.redirect_to // null),
        associated_port: (item.associated_port // null)
      };
    def apply_change(items; change):
      if change.type == "ADD" then
        items + [normalized_url(change.new_value)]
      elif change.type == "UPDATE" then
        items
        | map(
            if .id == change.item_id then
              normalized_url(. + change.new_value)
            else
              .
            end
          )
      elif change.type == "DELETE" then
        items | map(select(.id != change.item_id))
      else
        items
      end;
    reduce (.unapplied_changes[] | select(.field == "urls")) as $change
      ([.urls[] | normalized_url(.)]; apply_change(.; $change))
  ' <<<"$service_json"
}

setup::effective_service_env_row_json() {
  local service_json="$1"
  local key="$2"

  jq -c --arg key "$key" '
    def apply_change(items; change):
      if change.type == "ADD" then
        items + [{id: null, key: change.new_value.key, value: change.new_value.value}]
      elif change.type == "UPDATE" then
        items
        | map(
            if .id == change.item_id then
              .key = change.new_value.key
              | .value = change.new_value.value
            else
              .
            end
          )
      elif change.type == "DELETE" then
        items | map(select(.id != change.item_id))
      else
        items
      end;
    reduce (.unapplied_changes[] | select(.field == "env_variables")) as $change
      ([.env_variables[] | {id, key, value}]; apply_change(.; $change))
    | .[]
    | select(.key == $key)
  ' <<<"$service_json"
}

setup::pending_env_change_ids_for_key() {
  local service_json="$1"
  local key="$2"

  jq -r --arg key "$key" '
    . as $service
    | .unapplied_changes[] as $change
    | select($change.field == "env_variables")
    | select(
        ($change.new_value.key? == $key)
        or (
          ($change.item_id // null) != null
          and any($service.env_variables[]?; .id == $change.item_id and .key == $key)
        )
      )
    | $change.id
  ' <<<"$service_json"
}

setup::pending_change_ids_for_field() {
  local service_json="$1"
  local field="$2"

  jq -r --arg field "$field" '
    .unapplied_changes[]
    | select(.field == $field)
    | .id
  ' <<<"$service_json"
}

setup::cancel_pending_changes_for_field() {
  local service_slug="$1"
  local service_json="$2"
  local field="$3"
  local change_id

  while IFS= read -r change_id; do
    [[ -n "$change_id" ]] || continue
    zane::cancel_service_change "$service_slug" "$change_id"
  done < <(setup::pending_change_ids_for_field "$service_json" "$field")
}

setup::cancel_pending_env_changes_for_key() {
  local service_slug="$1"
  local service_json="$2"
  local key="$3"
  local change_id

  while IFS= read -r change_id; do
    [[ -n "$change_id" ]] || continue
    zane::cancel_service_change "$service_slug" "$change_id"
  done < <(setup::pending_env_change_ids_for_key "$service_json" "$key")
}

setup::ensure_service_source_and_builder() {
  local service_slug="$1"
  local service_json="$2"
  local spec_json="$3"
  local desired_source desired_builder effective_source effective_builder payload

  desired_source="$(setup::desired_git_source_json)"
  effective_source="$(setup::effective_git_source_json "$service_json")"
  if [[ "$effective_source" != "$desired_source" ]]; then
    payload="$(
      jq -n \
        --arg repository_url "$REPOSITORY_URL" \
        --arg branch_name "$BRANCH_NAME" \
        --arg git_app_id "$GIT_APP_ID" \
        '
          {
            field: "git_source",
            type: "UPDATE",
            new_value: {
              repository_url: $repository_url,
              branch_name: $branch_name,
              commit_sha: "HEAD"
            }
          }
          + (if $git_app_id != "" then {new_value: (.new_value + {git_app_id: $git_app_id})} else {} end)
        '
    )"
    zane::request_service_change "$service_slug" "$payload"
    service_json="$(zane::get_service "$service_slug")"
  fi

  desired_builder="$(
    setup::desired_builder_json \
      "$(jq -r '.dockerfile_path' <<<"$spec_json")" \
      "$(jq -r '.build_context_dir' <<<"$spec_json")"
  )"
  effective_builder="$(setup::effective_builder_json "$service_json")"
  if [[ "$effective_builder" != "$desired_builder" ]]; then
    payload="$(
      jq -n \
        --arg dockerfile_path "$(jq -r '.dockerfile_path' <<<"$spec_json")" \
        --arg build_context_dir "$(jq -r '.build_context_dir' <<<"$spec_json")" \
        '
          {
            field: "builder",
            type: "UPDATE",
            new_value: {
              builder: "DOCKERFILE",
              dockerfile_path: $dockerfile_path,
              build_context_dir: $build_context_dir,
              build_stage_target: null
            }
          }
        '
    )"
    zane::request_service_change "$service_slug" "$payload"
  fi
}

setup::ensure_service_command() {
  local service_slug="$1"
  local service_json="$2"
  local desired_command="$3"
  local effective_command payload

  [[ "$desired_command" != "null" ]] || return 0

  effective_command="$(jq -r '([.unapplied_changes[] | select(.field == "command")] | last | .new_value) // .command // empty' <<<"$service_json")"
  [[ "$effective_command" == "$desired_command" ]] && return 0

  payload="$(
    jq -n \
      --arg command "$desired_command" \
      '{field: "command", type: "UPDATE", new_value: $command}'
  )"
  zane::request_service_change "$service_slug" "$payload"
}

setup::effective_healthcheck_json() {
  local service_json="$1"

  jq -cS '
    def normalized(item):
      if item == null then
        null
      else
        {
          type: item.type,
          value: item.value,
          timeout_seconds: item.timeout_seconds,
          interval_seconds: item.interval_seconds,
          associated_port: (item.associated_port // null)
        }
      end;
    ([.unapplied_changes[] | select(.field == "healthcheck")] | last) as $pending
    | if $pending then
        normalized($pending.new_value)
      else
        normalized(.healthcheck)
      end
  ' <<<"$service_json"
}

setup::ensure_service_healthcheck() {
  local service_slug="$1"
  local service_json="$2"
  local desired_healthcheck_json="$3"
  local desired_compact effective_compact payload

  desired_compact="$(jq -cS . <<<"$desired_healthcheck_json")"
  effective_compact="$(setup::effective_healthcheck_json "$service_json")"
  [[ "$effective_compact" == "$desired_compact" ]] && return 0

  setup::cancel_pending_changes_for_field "$service_slug" "$service_json" "healthcheck"
  service_json="$(zane::get_service "$service_slug")"
  effective_compact="$(setup::effective_healthcheck_json "$service_json")"
  [[ "$effective_compact" == "$desired_compact" ]] && return 0

  payload="$(
    jq -n \
      --argjson new_value "$desired_healthcheck_json" \
      '{
        field: "healthcheck",
        type: "UPDATE",
        new_value: $new_value
      }'
  )"
  zane::request_service_change "$service_slug" "$payload"
}

setup::effective_resource_limits_json() {
  local service_json="$1"

  jq -cS '
    def normalized(item):
      if item == null then
        null
      else
        {
          cpus: (item.cpus // null),
          memory: (
            if item.memory == null then
              null
            else
              {
                unit: item.memory.unit,
                value: item.memory.value
              }
            end
          )
        }
      end;
    ([.unapplied_changes[] | select(.field == "resource_limits")] | last) as $pending
    | if $pending then
        normalized($pending.new_value)
      else
        normalized(.resource_limits)
      end
  ' <<<"$service_json"
}

setup::ensure_service_resource_limits() {
  local service_slug="$1"
  local service_json="$2"
  local desired_resource_limits_json="$3"
  local desired_compact effective_compact payload

  desired_compact="$(jq -cS . <<<"$desired_resource_limits_json")"
  effective_compact="$(setup::effective_resource_limits_json "$service_json")"
  [[ "$effective_compact" == "$desired_compact" ]] && return 0

  setup::cancel_pending_changes_for_field "$service_slug" "$service_json" "resource_limits"
  service_json="$(zane::get_service "$service_slug")"
  effective_compact="$(setup::effective_resource_limits_json "$service_json")"
  [[ "$effective_compact" == "$desired_compact" ]] && return 0

  payload="$(
    jq -n \
      --argjson new_value "$desired_resource_limits_json" \
      '{
        field: "resource_limits",
        type: "UPDATE",
        new_value: $new_value
      }'
  )"
  zane::request_service_change "$service_slug" "$payload"
}

setup::ensure_service_volumes() {
  local service_slug="$1"
  local service_json="$2"
  local desired_json="$3"
  local effective_json pending_count

  effective_json="$(setup::effective_volumes_json "$service_json")"

  while IFS= read -r desired_row; do
    local name container_path host_path mode current_row item_id payload current_compact desired_compact
    name="$(jq -r '.name' <<<"$desired_row")"
    container_path="$(jq -r '.container_path' <<<"$desired_row")"
    host_path="$(jq -r '.host_path // empty' <<<"$desired_row")"
    mode="$(jq -r '.mode' <<<"$desired_row")"

    current_row="$(jq -c --arg container_path "$container_path" '
      .[]
      | select(.container_path == $container_path)
      | {
          id: .id,
          name: .name,
          container_path: .container_path,
          host_path: (.host_path // null),
          mode: .mode
        }
    ' <<<"$effective_json")"

    desired_compact="$(jq -cS . <<<"$desired_row")"
    if [[ -n "$current_row" ]]; then
      current_compact="$(jq -cS 'del(.id)' <<<"$current_row")"
      if [[ "$current_compact" == "$desired_compact" ]]; then
        continue
      fi

      pending_count="$(jq '[.unapplied_changes[] | select(.field == "volumes")] | length' <<<"$service_json")"
      if [[ "$pending_count" != "0" ]]; then
        ci::die "Service ${service_slug} has pending volume changes that differ from the desired spec."
      fi

      item_id="$(jq -r '.id' <<<"$current_row")"
      payload="$(
        jq -n \
          --arg item_id "$item_id" \
          --arg name "$name" \
          --arg container_path "$container_path" \
          --arg host_path "$host_path" \
          --arg mode "$mode" \
          '
            {
              field: "volumes",
              type: "UPDATE",
              item_id: $item_id,
              new_value: {
                name: $name,
                container_path: $container_path,
                mode: $mode
              }
            }
            + (if $host_path != "" then {new_value: (.new_value + {host_path: $host_path})} else {} end)
          '
      )"
      zane::request_service_change "$service_slug" "$payload"
      continue
    fi

    payload="$(
      jq -n \
        --arg name "$name" \
        --arg container_path "$container_path" \
        --arg host_path "$host_path" \
        --arg mode "$mode" \
        '
          {
            field: "volumes",
            type: "ADD",
            new_value: {
              name: $name,
              container_path: $container_path,
              mode: $mode
            }
          }
          + (if $host_path != "" then {new_value: (.new_value + {host_path: $host_path})} else {} end)
        '
    )"
    zane::request_service_change "$service_slug" "$payload"
  done < <(jq -c '.[]' <<<"$desired_json")
}

setup::ensure_service_urls() {
  local service_slug="$1"
  local service_json="$2"
  local desired_json="$3"
  local effective_json

  if [[ "$(jq 'length' <<<"$desired_json")" == "0" ]]; then
    return 0
  fi

  setup::cancel_pending_changes_for_field "$service_slug" "$service_json" "urls"
  service_json="$(zane::get_service "$service_slug")"
  effective_json="$(setup::effective_urls_json "$service_json")"

  while IFS= read -r desired_row; do
    local domain base_path strip_prefix associated_port current_row item_id payload current_compact desired_compact
    domain="$(jq -r '.domain' <<<"$desired_row")"
    base_path="$(jq -r '.base_path' <<<"$desired_row")"
    strip_prefix="$(jq -r '.strip_prefix' <<<"$desired_row")"
    associated_port="$(jq -r '.associated_port' <<<"$desired_row")"

    current_row="$(jq -c \
      --arg domain "$domain" \
      --arg base_path "$base_path" \
      --argjson associated_port "$associated_port" '
        first(
          .[]
          | select(.domain == $domain and .base_path == $base_path)
        ) // first(
          .[]
          | select(.associated_port == $associated_port and .redirect_to == null)
        )
      ' <<<"$effective_json")"

    desired_compact="$(jq -cS . <<<"$desired_row")"
    if [[ -n "$current_row" && "$current_row" != "null" ]]; then
      current_compact="$(jq -cS 'del(.id)' <<<"$current_row")"
      if [[ "$current_compact" == "$desired_compact" ]]; then
        continue
      fi

      item_id="$(jq -r '.id' <<<"$current_row")"
      payload="$(
        jq -n \
          --arg item_id "$item_id" \
          --arg domain "$domain" \
          --arg base_path "$base_path" \
          --argjson strip_prefix "$strip_prefix" \
          --argjson associated_port "$associated_port" \
          '{
            field: "urls",
            type: "UPDATE",
            item_id: $item_id,
            new_value: {
              domain: $domain,
              base_path: $base_path,
              strip_prefix: $strip_prefix,
              associated_port: $associated_port
            }
          }'
      )"
    else
      payload="$(
        jq -n \
          --arg domain "$domain" \
          --arg base_path "$base_path" \
          --argjson strip_prefix "$strip_prefix" \
          --argjson associated_port "$associated_port" \
          '{
            field: "urls",
            type: "ADD",
            new_value: {
              domain: $domain,
              base_path: $base_path,
              strip_prefix: $strip_prefix,
              associated_port: $associated_port
            }
          }'
      )"
    fi

    zane::request_service_change "$service_slug" "$payload"
    service_json="$(zane::get_service "$service_slug")"
    effective_json="$(setup::effective_urls_json "$service_json")"
  done < <(jq -c '.[]' <<<"$desired_json")
}

setup::ensure_service_envs() {
  local service_slug="$1"
  local service_json="$2"
  local desired_envs_json="$3"
  local cleanup_keys_json="$4"

  while IFS=$'\t' read -r key value; do
    local current_row current_value item_id payload
    current_row="$(setup::effective_service_env_row_json "$service_json" "$key")"
    if [[ -n "$current_row" ]]; then
      current_value="$(jq -r '.value' <<<"$current_row")"
      if [[ "$current_value" == "$value" ]]; then
        continue
      fi
    fi

    setup::cancel_pending_env_changes_for_key "$service_slug" "$service_json" "$key"
    service_json="$(zane::get_service "$service_slug")"

    current_row="$(jq -c --arg key "$key" '.env_variables[] | select(.key == $key) | {id: .id, key: .key, value: .value}' <<<"$service_json")"
    if [[ -n "$current_row" ]]; then
      item_id="$(jq -r '.id' <<<"$current_row")"
      payload="$(
        jq -n \
          --arg item_id "$item_id" \
          --arg key "$key" \
          --arg value "$value" \
          '{
            field: "env_variables",
            type: "UPDATE",
            item_id: $item_id,
            new_value: {key: $key, value: $value}
          }'
      )"
    else
      payload="$(
        jq -n \
          --arg key "$key" \
          --arg value "$value" \
          '{
            field: "env_variables",
            type: "ADD",
            new_value: {key: $key, value: $value}
          }'
      )"
    fi

    zane::request_service_change "$service_slug" "$payload"
    service_json="$(zane::get_service "$service_slug")"
  done < <(jq -r 'to_entries[] | [.key, .value] | @tsv' <<<"$desired_envs_json")

  while IFS= read -r cleanup_key; do
    local existing_row delete_item_id delete_payload
    [[ -n "$cleanup_key" ]] || continue

    setup::cancel_pending_env_changes_for_key "$service_slug" "$service_json" "$cleanup_key"
    service_json="$(zane::get_service "$service_slug")"

    existing_row="$(jq -c --arg key "$cleanup_key" '.env_variables[] | select(.key == $key) | {id: .id}' <<<"$service_json")"
    [[ -n "$existing_row" ]] || continue

    delete_item_id="$(jq -r '.id' <<<"$existing_row")"
    delete_payload="$(
      jq -n \
        --arg item_id "$delete_item_id" \
        '{field: "env_variables", type: "DELETE", item_id: $item_id}'
    )"
    zane::request_service_change "$service_slug" "$delete_payload"
    service_json="$(zane::get_service "$service_slug")"
  done < <(jq -r '.[]' <<<"$cleanup_keys_json")
}

setup::ensure_service() {
  local service_slug="$1"
  local service_json spec_json dockerfile_path build_context_dir service_type command_json healthcheck_json resource_limits_json public_urls_json

  spec_json="$(setup::service_spec_json "$service_slug")"
  dockerfile_path="$(jq -r '.dockerfile_path' <<<"$spec_json")"
  build_context_dir="$(jq -r '.build_context_dir' <<<"$spec_json")"

  if ! service_json="$(zane::get_service "$service_slug")"; then
    echo "Creating service ${service_slug}..."
    zane::create_git_service "$service_slug" "$dockerfile_path" "$build_context_dir"
    service_json="$(zane::get_service "$service_slug")"
  fi

  service_type="$(jq -r '.type' <<<"$service_json")"
  [[ "$service_type" == "GIT_REPOSITORY" ]] || ci::die "Service ${service_slug} already exists but is not a Git service."

  setup::ensure_service_source_and_builder "$service_slug" "$service_json" "$spec_json"
  service_json="$(zane::get_service "$service_slug")"

  command_json="$(jq -r '.command' <<<"$spec_json")"
  setup::ensure_service_command "$service_slug" "$service_json" "$command_json"
  service_json="$(zane::get_service "$service_slug")"

  setup::ensure_service_volumes "$service_slug" "$service_json" "$(jq -c '.volumes' <<<"$spec_json")"
  service_json="$(zane::get_service "$service_slug")"

  public_urls_json="$(setup::service_public_urls_json "$service_slug")"
  setup::ensure_service_urls "$service_slug" "$service_json" "$public_urls_json"
  service_json="$(zane::get_service "$service_slug")"

  healthcheck_json="$(setup::service_healthcheck_json "$service_slug")"
  setup::ensure_service_healthcheck "$service_slug" "$service_json" "$healthcheck_json"
  service_json="$(zane::get_service "$service_slug")"

  resource_limits_json="$(setup::service_resource_limits_json "$service_slug")"
  setup::ensure_service_resource_limits "$service_slug" "$service_json" "$resource_limits_json"
}

setup::shared_env_json() {
  local medusa_db_host="$1"
  local valkey_host="$2"
  local minio_host="$3"
  local meili_host="$4"
  jq -n \
    --arg medusa_db_host "$medusa_db_host" \
    --arg valkey_host "$valkey_host" \
    --arg meili_host "$meili_host" \
    --arg medusa_app_db_user "${DC_MEDUSA_APP_DB_USER:-medusa_app}" \
    --arg medusa_app_db_password "${DC_MEDUSA_APP_DB_PASSWORD:-medusa_app_change_me}" \
    --arg medusa_app_db_name "${DC_MEDUSA_APP_DB_NAME:-medusa}" \
    --arg medusa_app_db_schema "${DC_MEDUSA_APP_DB_SCHEMA:-medusa}" \
    --arg valkey_password "${DC_VALKEY_PASSWORD:-valkey_dev_change_me}" \
    --arg minio_access_key "${DC_MINIO_ACCESS_KEY:-medusaappkey}" \
    --arg minio_secret_key "${DC_MINIO_SECRET_KEY:-medusaappsecret_change_me}" \
    --arg minio_bucket "${DC_MINIO_BUCKET:-medusa-bucket}" \
    --arg meili_master_key "${DC_MEILISEARCH_MASTER_KEY:-}" \
    '
      {
        MEDUSA_DB_HOST: $medusa_db_host,
        MEDUSA_VALKEY_HOST: $valkey_host,
        MEDUSA_MEILISEARCH_HOST: $meili_host,
        MEDUSA_APP_DB_USER: $medusa_app_db_user,
        MEDUSA_APP_DB_PASSWORD: $medusa_app_db_password,
        MEDUSA_APP_DB_NAME: $medusa_app_db_name,
        MEDUSA_APP_DB_SCHEMA: $medusa_app_db_schema,
        MEDUSA_VALKEY_PASSWORD: $valkey_password,
        MEDUSA_MINIO_ACCESS_KEY: $minio_access_key,
        MEDUSA_MINIO_SECRET_KEY: $minio_secret_key,
        MEDUSA_MINIO_BUCKET: $minio_bucket,
        MEDUSA_MEILISEARCH_MASTER_KEY: $meili_master_key
      }
    '
}

setup::upsert_shared_envs() {
  local shared_json="$1"
  local cleanup_key

  while IFS=$'\t' read -r key value; do
    zane::ensure_shared_env_var "$key" "$value"
  done < <(jq -r 'to_entries[] | [.key, .value] | @tsv' <<<"$shared_json")

  while IFS= read -r cleanup_key; do
    [[ -n "$cleanup_key" ]] || continue
    zane::delete_shared_env_var "$cleanup_key"
  done < <(setup::shared_env_cleanup_keys_json | jq -r '.[]')
}

setup::service_network_alias() {
  local service_slug="$1"
  local service_json alias

  service_json="$(zane::get_service "$service_slug")"
  alias="$(jq -r '.network_alias // empty' <<<"$service_json")"
  [[ -n "$alias" ]] || ci::die "Service ${service_slug} does not have a network alias yet."
  printf '%s\n' "$alias"
}

setup::service_global_network_alias() {
  local service_slug="$1"
  local service_json alias

  service_json="$(zane::get_service "$service_slug")"
  alias="$(jq -r '.global_network_alias // empty' <<<"$service_json")"
  [[ -n "$alias" ]] || ci::die "Service ${service_slug} does not have a global network alias yet."
  printf '%s\n' "$alias"
}

setup::upsert_service_envs() {
  local service_slug="$1"
  local service_json

  service_json="$(zane::get_service "$service_slug")"
  setup::ensure_service_envs \
    "$service_slug" \
    "$service_json" \
    "$(setup::service_envs_json "$service_slug")" \
    "$(setup::service_env_cleanup_keys_json "$service_slug")"
}

setup::main() {
  local services=(
    medusa-db
    medusa-valkey
    medusa-minio
    medusa-meilisearch
    medusa-be
    n1
    zane-operator
  )
  local service_slug
  local medusa_db_host valkey_host minio_host meili_host medusa_be_host shared_envs_json
  local medusa_be_public_url n1_public_url meilisearch_public_url

  setup::parse_args "$@"
  setup::load_env_file
  setup::normalize_base_url
  setup::derive_repository_url
  setup::derive_branch_name
  setup::require_tools

  ci::require_env ZANE_USERNAME "Zane username"
  ci::require_env ZANE_PASSWORD "Zane password"

  echo "Logging into Zane at ${ZANE_BASE_URL}..."
  zane::login
  setup::capture_zane_settings

  echo "Ensuring project ${PROJECT_SLUG}..."
  zane::ensure_project
  zane::api GET "projects/${PROJECT_SLUG}/environment-details/${ENVIRONMENT_NAME}/" >/dev/null

  for service_slug in "${services[@]}"; do
    setup::ensure_service "$service_slug"
  done

  medusa_db_host="$(setup::service_global_network_alias medusa-db)"
  valkey_host="$(setup::service_network_alias medusa-valkey)"
  minio_host="$(setup::service_network_alias medusa-minio)"
  meili_host="$(setup::service_network_alias medusa-meilisearch)"
  medusa_be_host="$(setup::service_network_alias medusa-be)"
  medusa_be_public_url="$(setup::public_service_origin medusa-be)"
  n1_public_url="$(setup::public_service_origin n1)"
  meilisearch_public_url="$(setup::public_service_origin medusa-meilisearch)"
  COMPUTED_MEDUSA_DB_HOST="$medusa_db_host"
  COMPUTED_VALKEY_HOST="$valkey_host"
  COMPUTED_MINIO_HOST="$minio_host"
  COMPUTED_MEILI_HOST="$meili_host"
  COMPUTED_MEDUSA_BE_HOST="$medusa_be_host"
  COMPUTED_MEDUSA_BE_PUBLIC_URL="$medusa_be_public_url"
  COMPUTED_N1_PUBLIC_URL="$n1_public_url"
  COMPUTED_MEILISEARCH_PUBLIC_URL="$meilisearch_public_url"

  shared_envs_json="$(
    setup::shared_env_json \
      "$medusa_db_host" \
      "$valkey_host" \
      "$minio_host" \
      "$meili_host" \
      "$medusa_be_host" \
      "$medusa_be_public_url" \
      "$n1_public_url" \
      "$meilisearch_public_url"
  )"
  setup::upsert_shared_envs "$shared_envs_json"

  for service_slug in "${services[@]}"; do
    setup::upsert_service_envs "$service_slug"
  done

  cat <<EOF
Bootstrap complete.

Configured:
- project slug: ${PROJECT_SLUG}
- environment: ${ENVIRONMENT_NAME}
- repository: ${REPOSITORY_URL}
- branch: ${BRANCH_NAME}

Created or updated services:
- medusa-db
- medusa-valkey
- medusa-minio
- medusa-meilisearch
- medusa-be
- n1
- zane-operator

Notes:
- public Zane routes were aligned for medusa-be, n1, medusa-meilisearch, and zane-operator
- service changes remain pending in Zane until you deploy them
EOF
}

setup::main "$@"
