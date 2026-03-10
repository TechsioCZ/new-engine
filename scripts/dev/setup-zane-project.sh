#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
# Reuse small shell helpers already used by the CI scripts.
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

MEDUSA_BACKEND_URL_OVERRIDE="${ZANE_PUBLIC_MEDUSA_BACKEND_URL:-}"
N1_SITE_URL_OVERRIDE="${ZANE_PUBLIC_N1_URL:-}"
MEILISEARCH_URL_OVERRIDE="${ZANE_PUBLIC_MEILISEARCH_URL:-}"
MINIO_FILE_URL_OVERRIDE="${ZANE_PUBLIC_MINIO_FILE_URL:-}"
STORE_CORS_OVERRIDE="${ZANE_STORE_CORS:-}"
ADMIN_CORS_OVERRIDE="${ZANE_ADMIN_CORS:-}"
AUTH_CORS_OVERRIDE="${ZANE_AUTH_CORS:-}"

COOKIE_JAR=""
CSRF_TOKEN=""

setup::usage() {
  cat <<'EOF'
Usage:
  scripts/dev/setup-zane-project.sh [options]

Creates or reuses a Zane project, creates the six required services as Git-backed
Dockerfile builds, and upserts shared/service environment variables.

Options:
  --env-file PATH                Source local values from PATH (default: .env.docker)
  --zane-base-url URL            Zane base URL (default: $ZANE_BASE_URL or http://localhost)
  --zane-username USER           Zane username
  --zane-password PASS           Zane password
  --project-slug SLUG            Canonical Zane project slug (default: new-engine)
  --project-description TEXT     Project description when creating the project
  --repository-url URL           Git repository URL (default: origin remote converted to https)
  --branch NAME                  Git branch to configure (default: current branch)
  --git-app-id ID                Optional Zane git app id for private repositories
  --medusa-backend-url URL       Shared MEDUSA_BACKEND_URL / NEXT_PUBLIC_MEDUSA_BACKEND_URL override
  --n1-site-url URL              Shared NEXT_PUBLIC_SITE_URL override
  --meilisearch-url URL          Shared NEXT_PUBLIC_MEILISEARCH_URL override
  --minio-file-url URL           Shared MINIO_FILE_URL override
  --store-cors VALUE             Shared STORE_CORS override
  --admin-cors VALUE             Shared ADMIN_CORS override
  --auth-cors VALUE              Shared AUTH_CORS override
  --help                         Show this help

Environment variables with the same names are also supported.

Notes:
  - This script does not manage public Zane URL routes. It prepares project/service
    state and shared envs only; add public domains/routes separately in Zane.
  - For private repositories, provide --git-app-id after installing the git app in Zane.
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
}

setup::derive_repository_url() {
  local remote_url

  if [[ -n "$REPOSITORY_URL" ]]; then
    return
  fi

  remote_url="$(git -C "$REPO_ROOT" remote get-url origin 2>/dev/null || true)"
  [[ -n "$remote_url" ]] || ci::die "Unable to determine repository URL from git remote 'origin'."

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
      ci::die "Unsupported git remote for Zane bootstrap: $remote_url"
      ;;
  esac
}

setup::derive_branch_name() {
  if [[ -n "$BRANCH_NAME" ]]; then
    return
  fi

  BRANCH_NAME="$(git -C "$REPO_ROOT" branch --show-current 2>/dev/null || true)"
  [[ -n "$BRANCH_NAME" ]] || ci::die "Unable to determine current git branch."
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

  if [[ -n "$body" ]]; then
    curl_args+=(
      --header 'Content-Type: application/json'
      --header "X-CSRFToken: ${CSRF_TOKEN}"
      --data "$body"
    )
  fi

  curl_args+=("$url")

  status="$(
    curl "${curl_args[@]}"
  )"

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
      --arg builder "DOCKERFILE" \
      --arg dockerfile_path "$dockerfile_path" \
      --arg build_context_dir "$build_context_dir" \
      --arg git_app_id "$GIT_APP_ID" \
      '
        {
          slug: $slug,
          repository_url: $repository_url,
          branch_name: $branch_name,
          builder: $builder,
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

zane::ensure_shared_env_var() {
  local key="$1"
  local value="$2"
  local vars_json existing_id payload

  vars_json="$(zane::api GET "projects/${PROJECT_SLUG}/${ENVIRONMENT_NAME}/variables/")"
  existing_id="$(jq -r --arg key "$key" '.[] | select(.key == $key) | .id' <<<"$vars_json")"

  payload="$(
    jq -n \
      --arg key "$key" \
      --arg value "$value" \
      '{key: $key, value: $value}'
  )"

  if [[ -n "$existing_id" ]]; then
    local current_value
    current_value="$(jq -r --arg key "$key" '.[] | select(.key == $key) | .value' <<<"$vars_json")"
    [[ "$current_value" == "$value" ]] && return
    zane::api PATCH "projects/${PROJECT_SLUG}/${ENVIRONMENT_NAME}/variables/${existing_id}/" "$payload" >/dev/null
    return
  fi

  zane::api POST "projects/${PROJECT_SLUG}/${ENVIRONMENT_NAME}/variables/" "$payload" >/dev/null
}

setup::service_spec_json() {
  local service_slug="$1"

  case "$service_slug" in
    medusa-db)
      cat <<'EOF'
{"dockerfile_path":"./docker/development/postgres/Dockerfile","build_context_dir":"./docker/development/postgres","command":"postgres -c shared_preload_libraries=pg_stat_statements -c file_copy_method=clone","volumes":[{"name":"pgdata","container_path":"/var/lib/postgresql","host_path":null,"mode":"READ_WRITE"}],"envs":{"POSTGRES_USER":"{{env.POSTGRES_SUPERUSER}}","POSTGRES_PASSWORD":"{{env.POSTGRES_SUPERUSER_PASSWORD}}","POSTGRES_DB":"{{env.MEDUSA_APP_DB_NAME}}","PGDATA":"/var/lib/postgresql/18/docker","MEDUSA_APP_DB_USER":"{{env.MEDUSA_APP_DB_USER}}","MEDUSA_APP_DB_PASSWORD":"{{env.MEDUSA_APP_DB_PASSWORD}}","MEDUSA_APP_DB_NAME":"{{env.MEDUSA_APP_DB_NAME}}","MEDUSA_APP_DB_SCHEMA":"{{env.MEDUSA_APP_DB_SCHEMA}}","MEDUSA_DEV_DB_USER":"{{env.MEDUSA_DEV_DB_USER}}","MEDUSA_DEV_DB_PASSWORD":"{{env.MEDUSA_DEV_DB_PASSWORD}}"}} 
EOF
      ;;
    medusa-valkey)
      cat <<'EOF'
{"dockerfile_path":"./docker/development/medusa-valkey/Dockerfile","build_context_dir":"./docker/development/medusa-valkey","command":"valkey-server --requirepass {{env.VALKEY_PASSWORD}} --appendonly yes","volumes":[{"name":"data","container_path":"/data","host_path":null,"mode":"READ_WRITE"}],"envs":{"VALKEY_PASSWORD":"{{env.VALKEY_PASSWORD}}"}} 
EOF
      ;;
    medusa-minio)
      cat <<'EOF'
{"dockerfile_path":"./docker/development/medusa-minio/Dockerfile","build_context_dir":"./docker/development/medusa-minio","command":null,"volumes":[{"name":"data","container_path":"/data","host_path":null,"mode":"READ_WRITE"}],"envs":{"MINIO_ROOT_USER":"{{env.MINIO_ROOT_USER}}","MINIO_ROOT_PASSWORD":"{{env.MINIO_ROOT_PASSWORD}}","MINIO_MEDUSA_ACCESS_KEY":"{{env.MINIO_ACCESS_KEY}}","MINIO_MEDUSA_SECRET_KEY":"{{env.MINIO_SECRET_KEY}}","MINIO_MEDUSA_BUCKET":"{{env.MINIO_BUCKET}}"}} 
EOF
      ;;
    medusa-meilisearch)
      cat <<'EOF'
{"dockerfile_path":"./docker/development/medusa-meilisearch/Dockerfile","build_context_dir":"./docker/development/medusa-meilisearch","command":null,"volumes":[{"name":"data","container_path":"/meili_data","host_path":null,"mode":"READ_WRITE"}],"envs":{"MEILI_MASTER_KEY":"{{env.MEILI_MASTER_KEY}}","MEILI_NO_ANALYTICS":"true"}} 
EOF
      ;;
    medusa-be)
      cat <<'EOF'
{"dockerfile_path":"./docker/development/medusa-be/Dockerfile","build_context_dir":"./","command":null,"volumes":[],"envs":{"DATABASE_TYPE":"postgres","MEDUSA_APP_DB_USER":"{{env.MEDUSA_APP_DB_USER}}","MEDUSA_APP_DB_PASSWORD":"{{env.MEDUSA_APP_DB_PASSWORD}}","MEDUSA_APP_DB_NAME":"{{env.MEDUSA_APP_DB_NAME}}","MEDUSA_APP_DB_SCHEMA":"{{env.MEDUSA_APP_DB_SCHEMA}}","MEDUSA_DATABASE_SCHEMA":"{{env.MEDUSA_APP_DB_SCHEMA}}","DATABASE_SCHEMA":"{{env.MEDUSA_APP_DB_SCHEMA}}","DATABASE_URL":"postgresql://{{env.MEDUSA_APP_DB_USER}}:{{env.MEDUSA_APP_DB_PASSWORD}}@{{env.MEDUSA_DB_HOST}}:5432/{{env.MEDUSA_APP_DB_NAME}}?sslmode=disable&options=-csearch_path%3D{{env.MEDUSA_APP_DB_SCHEMA}}%2Cpg_catalog","REDIS_URL":"redis://:{{env.VALKEY_PASSWORD}}@{{env.VALKEY_HOST}}:6379","MEILISEARCH_HOST":"http://{{env.MEILI_HOST}}:7700","MEILISEARCH_API_KEY":"{{env.MEILI_MASTER_KEY}}","MINIO_FILE_URL":"{{env.MINIO_FILE_URL}}","MINIO_REGION":"{{env.MINIO_REGION}}","MINIO_ENDPOINT":"{{env.MINIO_ENDPOINT}}","MINIO_BUCKET":"{{env.MINIO_BUCKET}}","MINIO_ACCESS_KEY":"{{env.MINIO_ACCESS_KEY}}","MINIO_SECRET_KEY":"{{env.MINIO_SECRET_KEY}}","LEGACY_DATABASE_URL":"{{env.LEGACY_DATABASE_URL}}"}} 
EOF
      ;;
    n1)
      cat <<'EOF'
{"dockerfile_path":"./docker/development/n1/Dockerfile","build_context_dir":"./","command":null,"volumes":[],"envs":{"MEDUSA_BACKEND_URL_INTERNAL":"http://{{env.MEDUSA_BE_HOST}}:9000","NEXT_PUBLIC_MEDUSA_BACKEND_URL":"{{env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}}","NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY":"{{env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY}}","NEXT_PUBLIC_MEILISEARCH_URL":"{{env.NEXT_PUBLIC_MEILISEARCH_URL}}","NEXT_PUBLIC_MEILISEARCH_API_KEY":"{{env.NEXT_PUBLIC_MEILISEARCH_API_KEY}}","NEXT_PUBLIC_SITE_URL":"{{env.NEXT_PUBLIC_SITE_URL}}","NEXT_PUBLIC_META_PIXEL_ID":"{{env.NEXT_PUBLIC_META_PIXEL_ID}}","NEXT_PUBLIC_GOOGLE_ADS_ID":"{{env.NEXT_PUBLIC_GOOGLE_ADS_ID}}","NEXT_PUBLIC_HEUREKA_API_KEY":"{{env.NEXT_PUBLIC_HEUREKA_API_KEY}}","NEXT_PUBLIC_LEADHUB_TRACKING_ID":"{{env.NEXT_PUBLIC_LEADHUB_TRACKING_ID}}","RESEND_API_KEY":"{{env.RESEND_API_KEY}}","CONTACT_EMAIL":"{{env.CONTACT_EMAIL}}","RESEND_FROM_EMAIL":"{{env.RESEND_FROM_EMAIL}}"}} 
EOF
      ;;
    *)
      ci::die "Unsupported service slug: $service_slug"
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
          + (
            if $git_app_id != "" then
              {new_value: (.new_value + {git_app_id: $git_app_id})}
            else
              {}
            end
          )
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

  effective_command="$(jq -r '
    ([.unapplied_changes[] | select(.field == "command")] | last | .new_value) // .command // empty
  ' <<<"$service_json")"
  if [[ "$effective_command" == "$desired_command" ]]; then
    return 0
  fi

  payload="$(
    jq -n \
      --arg command "$desired_command" \
      '{field: "command", type: "UPDATE", new_value: $command}'
  )"
  zane::request_service_change "$service_slug" "$payload"
}

setup::ensure_service_volumes() {
  local service_slug="$1"
  local service_json="$2"
  local desired_json="$3"
  local pending_count

  pending_count="$(jq '[.unapplied_changes[] | select(.field == "volumes")] | length' <<<"$service_json")"
  if [[ "$pending_count" != "0" ]]; then
    ci::die "Service ${service_slug} already has pending volume changes. Deploy or clear them before rerunning bootstrap."
  fi

  while IFS= read -r desired_row; do
    local name container_path host_path mode current_row item_id payload current_compact desired_compact
    name="$(jq -r '.name' <<<"$desired_row")"
    container_path="$(jq -r '.container_path' <<<"$desired_row")"
    host_path="$(jq -r '.host_path // empty' <<<"$desired_row")"
    mode="$(jq -r '.mode' <<<"$desired_row")"

    current_row="$(jq -c --arg container_path "$container_path" '
      .volumes[]
      | select(.container_path == $container_path)
      | {
          id: .id,
          name: .name,
          container_path: .container_path,
          host_path: (.host_path // null),
          mode: .mode
        }
    ' <<<"$service_json")"

    desired_compact="$(jq -cS . <<<"$desired_row")"
    if [[ -n "$current_row" ]]; then
      current_compact="$(jq -cS 'del(.id)' <<<"$current_row")"
      [[ "$current_compact" == "$desired_compact" ]] && continue
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
            + (
              if $host_path != "" then
                {new_value: (.new_value + {host_path: $host_path})}
              else
                {}
              end
            )
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
          + (
            if $host_path != "" then
              {new_value: (.new_value + {host_path: $host_path})}
            else
              {}
            end
          )
        '
    )"
    zane::request_service_change "$service_slug" "$payload"
  done < <(jq -c '.[]' <<<"$desired_json")
}

setup::ensure_service_envs() {
  local service_slug="$1"
  local service_json="$2"
  local desired_envs_json="$3"
  local pending_count

  pending_count="$(jq '[.unapplied_changes[] | select(.field == "env_variables")] | length' <<<"$service_json")"
  if [[ "$pending_count" != "0" ]]; then
    ci::die "Service ${service_slug} already has pending env var changes. Deploy or clear them before rerunning bootstrap."
  fi

  while IFS=$'\t' read -r key value; do
    local current_row current_value item_id payload
    current_row="$(jq -c --arg key "$key" '
      .env_variables[]
      | select(.key == $key)
      | {id: .id, key: .key, value: .value}
    ' <<<"$service_json")"

    if [[ -n "$current_row" ]]; then
      current_value="$(jq -r '.value' <<<"$current_row")"
      [[ "$current_value" == "$value" ]] && continue
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
            new_value: {
              key: $key,
              value: $value
            }
          }'
      )"
      zane::request_service_change "$service_slug" "$payload"
      continue
    fi

    payload="$(
      jq -n \
        --arg key "$key" \
        --arg value "$value" \
        '{
          field: "env_variables",
          type: "ADD",
          new_value: {
            key: $key,
            value: $value
          }
        }'
    )"
    zane::request_service_change "$service_slug" "$payload"
  done < <(jq -r 'to_entries[] | [.key, .value] | @tsv' <<<"$desired_envs_json")
}

setup::ensure_service() {
  local service_slug="$1"
  local service_json spec_json dockerfile_path build_context_dir service_type command_json

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
}

setup::shared_env_json() {
  local medusa_db_host="$1"
  local valkey_host="$2"
  local minio_host="$3"
  local meili_host="$4"
  local medusa_be_host="$5"
  local medusa_backend_url next_public_site_url next_public_meilisearch_url minio_file_url
  local store_cors admin_cors auth_cors

  medusa_backend_url="${MEDUSA_BACKEND_URL_OVERRIDE:-${DC_N1_NEXT_PUBLIC_MEDUSA_BACKEND_URL:-}}"
  next_public_site_url="${N1_SITE_URL_OVERRIDE:-${DC_N1_NEXT_PUBLIC_SITE_URL:-}}"
  next_public_meilisearch_url="${MEILISEARCH_URL_OVERRIDE:-${DC_N1_NEXT_PUBLIC_MEILISEARCH_URL:-}}"
  minio_file_url="${MINIO_FILE_URL_OVERRIDE:-${DC_MINIO_FILE_URL:-}}"

  store_cors="${STORE_CORS_OVERRIDE:-${DC_STORE_CORS:-${next_public_site_url}}}"
  admin_cors="${ADMIN_CORS_OVERRIDE:-${DC_ADMIN_CORS:-${medusa_backend_url}}}"
  auth_cors="${AUTH_CORS_OVERRIDE:-${DC_AUTH_CORS:-${medusa_backend_url}}}"

  jq -n \
    --arg medusa_db_host "$medusa_db_host" \
    --arg valkey_host "$valkey_host" \
    --arg minio_host "$minio_host" \
    --arg meili_host "$meili_host" \
    --arg medusa_be_host "$medusa_be_host" \
    --arg medusa_backend_url "$medusa_backend_url" \
    --arg store_cors "$store_cors" \
    --arg admin_cors "$admin_cors" \
    --arg auth_cors "$auth_cors" \
    --arg next_public_site_url "$next_public_site_url" \
    --arg next_public_meilisearch_url "$next_public_meilisearch_url" \
    --arg minio_file_url "$minio_file_url" \
    --arg postgres_superuser "${DC_POSTGRES_SUPERUSER:-root}" \
    --arg postgres_superuser_password "${DC_POSTGRES_SUPERUSER_PASSWORD:-root}" \
    --arg medusa_app_db_user "${DC_MEDUSA_APP_DB_USER:-medusa_app}" \
    --arg medusa_app_db_password "${DC_MEDUSA_APP_DB_PASSWORD:-medusa_app_change_me}" \
    --arg medusa_app_db_name "${DC_MEDUSA_APP_DB_NAME:-medusa}" \
    --arg medusa_app_db_schema "${DC_MEDUSA_APP_DB_SCHEMA:-medusa}" \
    --arg medusa_dev_db_user "${DC_MEDUSA_DEV_DB_USER:-medusa_dev}" \
    --arg medusa_dev_db_password "${DC_MEDUSA_DEV_DB_PASSWORD:-medusa_dev_change_me}" \
    --arg valkey_password "${DC_VALKEY_PASSWORD:-valkey_dev_change_me}" \
    --arg minio_root_user "${DC_MINIO_ROOT_USER:-minioadmin}" \
    --arg minio_root_password "${DC_MINIO_ROOT_PASSWORD:-minioadmin}" \
    --arg minio_access_key "${DC_MINIO_ACCESS_KEY:-medusaappkey}" \
    --arg minio_secret_key "${DC_MINIO_SECRET_KEY:-medusaappsecret_change_me}" \
    --arg minio_bucket "${DC_MINIO_BUCKET:-medusa-bucket}" \
    --arg minio_region "${DC_MINIO_REGION:-us-east-1}" \
    --arg meili_master_key "${DC_MEILISEARCH_MASTER_KEY:-}" \
    --arg next_public_meilisearch_api_key "${DC_N1_NEXT_PUBLIC_MEILISEARCH_API_KEY:-}" \
    --arg jwt_secret "${DC_JWT_SECRET:-supersecret}" \
    --arg cookie_secret "${DC_COOKIE_SECRET:-supersecret}" \
    --arg settings_encryption_key "${DC_SETTINGS_ENCRYPTION_KEY:-}" \
    --arg superadmin_email "${DC_SUPERADMIN_EMAIL:-}" \
    --arg superadmin_password "${DC_SUPERADMIN_PASSWORD:-}" \
    --arg initial_publishable_key_name "${DC_INITIAL_PUBLISHABLE_KEY_NAME:-Storefront Publishable Key}" \
    --arg feature_ppl_enabled "${DC_FEATURE_PPL_ENABLED:-0}" \
    --arg ppl_environment "${DC_PPL_ENVIRONMENT:-testing}" \
    --arg sentry_name "${DC_SENTRY_NAME:-}" \
    --arg sentry_dsn "${DC_SENTRY_DSN:-}" \
    --arg legacy_database_url "${DC_LEGACY_DATABASE_URL:-}" \
    --arg next_public_meta_pixel_id "${DC_N1_NEXT_PUBLIC_META_PIXEL_ID:-}" \
    --arg next_public_google_ads_id "${DC_N1_NEXT_PUBLIC_GOOGLE_ADS_ID:-}" \
    --arg next_public_heureka_api_key "${DC_N1_NEXT_PUBLIC_HEUREKA_API_KEY:-}" \
    --arg next_public_leadhub_tracking_id "${DC_N1_NEXT_PUBLIC_LEADHUB_TRACKING_ID:-}" \
    --arg resend_api_key "${DC_N1_MEDUSA_RESEND_API_KEY:-}" \
    --arg contact_email "${DC_N1_MEDUSA_CONTACT_EMAIL:-}" \
    --arg resend_from_email "${DC_N1_MEDUSA_RESEND_FROM_EMAIL:-}" \
    --arg next_public_medusa_publishable_key "${DC_N1_NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY:-}" \
    '
      {
        NODE_ENV: "production",
        MEDUSA_BACKEND_URL: $medusa_backend_url,
        STORE_CORS: $store_cors,
        ADMIN_CORS: $admin_cors,
        AUTH_CORS: $auth_cors,
        NEXT_PUBLIC_SITE_URL: $next_public_site_url,
        NEXT_PUBLIC_MEDUSA_BACKEND_URL: $medusa_backend_url,
        NEXT_PUBLIC_MEILISEARCH_URL: $next_public_meilisearch_url,
        MINIO_FILE_URL: $minio_file_url,
        MEDUSA_DB_HOST: $medusa_db_host,
        VALKEY_HOST: $valkey_host,
        MINIO_HOST: $minio_host,
        MEILI_HOST: $meili_host,
        MEDUSA_BE_HOST: $medusa_be_host,
        POSTGRES_SUPERUSER: $postgres_superuser,
        POSTGRES_SUPERUSER_PASSWORD: $postgres_superuser_password,
        MEDUSA_APP_DB_USER: $medusa_app_db_user,
        MEDUSA_APP_DB_PASSWORD: $medusa_app_db_password,
        MEDUSA_APP_DB_NAME: $medusa_app_db_name,
        MEDUSA_APP_DB_SCHEMA: $medusa_app_db_schema,
        MEDUSA_DEV_DB_USER: $medusa_dev_db_user,
        MEDUSA_DEV_DB_PASSWORD: $medusa_dev_db_password,
        VALKEY_PASSWORD: $valkey_password,
        MINIO_ROOT_USER: $minio_root_user,
        MINIO_ROOT_PASSWORD: $minio_root_password,
        MINIO_ACCESS_KEY: $minio_access_key,
        MINIO_SECRET_KEY: $minio_secret_key,
        MINIO_BUCKET: $minio_bucket,
        MINIO_REGION: $minio_region,
        MINIO_ENDPOINT: ("http://" + $minio_host + ":9004/"),
        MEILI_MASTER_KEY: $meili_master_key,
        NEXT_PUBLIC_MEILISEARCH_API_KEY: $next_public_meilisearch_api_key,
        JWT_SECRET: $jwt_secret,
        COOKIE_SECRET: $cookie_secret,
        SETTINGS_ENCRYPTION_KEY: $settings_encryption_key,
        SUPERADMIN_EMAIL: $superadmin_email,
        SUPERADMIN_PASSWORD: $superadmin_password,
        INITIAL_PUBLISHABLE_KEY_NAME: $initial_publishable_key_name,
        FEATURE_PPL_ENABLED: $feature_ppl_enabled,
        PPL_ENVIRONMENT: $ppl_environment,
        SENTRY_NAME: $sentry_name,
        SENTRY_DSN: $sentry_dsn,
        LEGACY_DATABASE_URL: $legacy_database_url,
        NEXT_PUBLIC_META_PIXEL_ID: $next_public_meta_pixel_id,
        NEXT_PUBLIC_GOOGLE_ADS_ID: $next_public_google_ads_id,
        NEXT_PUBLIC_HEUREKA_API_KEY: $next_public_heureka_api_key,
        NEXT_PUBLIC_LEADHUB_TRACKING_ID: $next_public_leadhub_tracking_id,
        RESEND_API_KEY: $resend_api_key,
        CONTACT_EMAIL: $contact_email,
        RESEND_FROM_EMAIL: $resend_from_email,
        NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: $next_public_medusa_publishable_key
      }
    '
}

setup::upsert_shared_envs() {
  local shared_json="$1"
  while IFS=$'\t' read -r key value; do
    zane::ensure_shared_env_var "$key" "$value"
  done < <(jq -r 'to_entries[] | [.key, .value] | @tsv' <<<"$shared_json")
}

setup::service_network_alias() {
  local service_slug="$1"
  local service_json alias

  service_json="$(zane::get_service "$service_slug")"
  alias="$(jq -r '.network_alias // empty' <<<"$service_json")"
  [[ -n "$alias" ]] || ci::die "Service ${service_slug} does not have a network alias yet."
  printf '%s\n' "$alias"
}

setup::upsert_service_envs() {
  local service_slug="$1"
  local service_json spec_json

  service_json="$(zane::get_service "$service_slug")"
  spec_json="$(setup::service_spec_json "$service_slug")"
  setup::ensure_service_envs "$service_slug" "$service_json" "$(jq -c '.envs' <<<"$spec_json")"
}

setup::main() {
  local services=(
    medusa-db
    medusa-valkey
    medusa-minio
    medusa-meilisearch
    medusa-be
    n1
  )
  local service_slug
  local medusa_db_host valkey_host minio_host meili_host medusa_be_host shared_envs_json

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

  echo "Ensuring project ${PROJECT_SLUG}..."
  zane::ensure_project
  zane::api GET "projects/${PROJECT_SLUG}/environment-details/${ENVIRONMENT_NAME}/" >/dev/null

  for service_slug in "${services[@]}"; do
    setup::ensure_service "$service_slug"
  done

  medusa_db_host="$(setup::service_network_alias medusa-db)"
  valkey_host="$(setup::service_network_alias medusa-valkey)"
  minio_host="$(setup::service_network_alias medusa-minio)"
  meili_host="$(setup::service_network_alias medusa-meilisearch)"
  medusa_be_host="$(setup::service_network_alias medusa-be)"

  shared_envs_json="$(
    setup::shared_env_json \
      "$medusa_db_host" \
      "$valkey_host" \
      "$minio_host" \
      "$meili_host" \
      "$medusa_be_host"
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

Notes:
- public Zane routes were not changed by this script
- any new service changes are pending in Zane until you deploy the services
EOF
}

setup::main "$@"
