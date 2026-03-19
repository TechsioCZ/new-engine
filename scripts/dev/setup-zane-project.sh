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
PROJECT_DESCRIPTION="${ZANE_PROJECT_DESCRIPTION:-}"
ENVIRONMENT_NAME="production"
REPOSITORY_URL="${ZANE_REPOSITORY_URL:-}"
BRANCH_NAME="${ZANE_BRANCH_NAME:-}"
GIT_APP_ID="${ZANE_GIT_APP_ID:-}"
PUBLIC_DOMAIN="${ZANE_PUBLIC_DOMAIN:-}"
PUBLIC_URL_AFFIX="${ZANE_PUBLIC_URL_AFFIX:--zane}"

MINIO_FILE_URL_OVERRIDE="${ZANE_PUBLIC_MINIO_FILE_URL:-}"
STORE_CORS_OVERRIDE="${ZANE_STORE_CORS:-}"
ADMIN_CORS_OVERRIDE="${ZANE_ADMIN_CORS:-}"
AUTH_CORS_OVERRIDE="${ZANE_AUTH_CORS:-}"

OPERATOR_UPSTREAM_ZANE_BASE_URL="${ZANE_OPERATOR_UPSTREAM_ZANE_BASE_URL:-}"
OPERATOR_UPSTREAM_ZANE_CONNECT_BASE_URL="${ZANE_OPERATOR_UPSTREAM_ZANE_CONNECT_BASE_URL:-}"
OPERATOR_UPSTREAM_ZANE_CONNECT_HOST_HEADER="${ZANE_OPERATOR_UPSTREAM_ZANE_CONNECT_HOST_HEADER:-}"
OPERATOR_UPSTREAM_ZANE_USERNAME="${ZANE_OPERATOR_UPSTREAM_ZANE_USERNAME:-}"
OPERATOR_UPSTREAM_ZANE_PASSWORD="${ZANE_OPERATOR_UPSTREAM_ZANE_PASSWORD:-}"
ZANE_ROOT_DOMAIN=""
ZANE_APP_DOMAIN=""

COOKIE_JAR=""
CSRF_TOKEN=""
ASSUME_YES="false"
INSPECT_JSON_FILE=""
PLAN_JSON_FILE=""

setup::usage() {
  cat <<'EOF'
Usage:
  scripts/dev/setup-zane-project.sh [options]

Creates or reuses a Zane project, creates the required Git-backed services, and
upserts the shared/service environment contract used by the deployed stack.

Options:
  --env-file PATH                Source local values from PATH (default: .env.zane)
  --zane-base-url URL            Zane base URL used by this setup script
  --zane-username USER           Zane username used by this setup script
  --zane-password PASS           Zane password used by this setup script
  --project-slug SLUG            Canonical Zane project slug (required; no default)
  --project-description TEXT     Project description when creating the project
  --repository-url URL           Git repository URL (default: origin remote as https)
  --branch NAME                  Git branch to configure (default: current checked-out branch, fallback: master)
  --git-app-id ID                Optional Zane git app id for private repositories
  --public-domain DOMAIN         Public root domain for managed service URLs
                                 (default: auto-discovered from Zane API settings)
  --public-url-affix SUFFIX      Service URL suffix between service slug and domain
                                 (default: -zane)
  --minio-file-url URL           Public MinIO file URL override
  --store-cors VALUE             STORE_CORS override
  --admin-cors VALUE             ADMIN_CORS override
  --auth-cors VALUE              AUTH_CORS override
  --operator-upstream-zane-base-url URL
                                 Upstream Zane URL for the deployed zane-operator
  --operator-upstream-zane-connect-base-url URL
                                 Optional container-reachable upstream Zane URL for the deployed zane-operator
  --operator-upstream-zane-connect-host-header VALUE
                                 Optional Host header override used with the connect base URL
  --operator-upstream-zane-username USER
                                 Upstream Zane username for the deployed zane-operator
  --operator-upstream-zane-password PASS
                                 Upstream Zane password for the deployed zane-operator
  --yes                          Skip the interactive confirmation prompt
  --help                         Show this help

Notes:
  - The helper manages public routes for medusa-be, n1, medusa-meilisearch, and zane-operator.
  - The default branch is the current checked-out branch. Use --branch to target a different branch explicitly.
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
      --operator-upstream-zane-connect-base-url)
        OPERATOR_UPSTREAM_ZANE_CONNECT_BASE_URL="$2"
        shift 2
        ;;
      --operator-upstream-zane-connect-host-header)
        OPERATOR_UPSTREAM_ZANE_CONNECT_HOST_HEADER="$2"
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
      --yes)
        ASSUME_YES="true"
        shift
        ;;
      --help)
        setup::usage
        exit 0
        ;;
      *)
        common::die "Unknown argument: $1"
        ;;
    esac
  done
}

setup::normalize_base_url() {
  ZANE_BASE_URL="${ZANE_BASE_URL:-${DC_ZANE_OPERATOR_ZANE_BASE_URL:-http://localhost}}"
  ZANE_BASE_URL="${ZANE_BASE_URL%/}"
  ZANE_USERNAME="${ZANE_USERNAME:-${DC_ZANE_OPERATOR_ZANE_USERNAME:-}}"
  ZANE_PASSWORD="${ZANE_PASSWORD:-${DC_ZANE_OPERATOR_ZANE_PASSWORD:-}}"

  OPERATOR_UPSTREAM_ZANE_BASE_URL="${OPERATOR_UPSTREAM_ZANE_BASE_URL:-${DC_ZANE_OPERATOR_ZANE_BASE_URL:-}}"
  OPERATOR_UPSTREAM_ZANE_CONNECT_BASE_URL="${OPERATOR_UPSTREAM_ZANE_CONNECT_BASE_URL:-${DC_ZANE_OPERATOR_ZANE_CONNECT_BASE_URL:-}}"
  OPERATOR_UPSTREAM_ZANE_CONNECT_HOST_HEADER="${OPERATOR_UPSTREAM_ZANE_CONNECT_HOST_HEADER:-${DC_ZANE_OPERATOR_ZANE_CONNECT_HOST_HEADER:-}}"
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

setup::derive_repository_url() {
  local remote_url

  [[ -n "$REPOSITORY_URL" ]] && return

  remote_url="$(git -C "$REPO_ROOT" remote get-url origin 2>/dev/null || true)"
  [[ -n "$remote_url" ]] || common::die "Unable to determine repository URL from origin."

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
      common::die "Unsupported git remote for bootstrap: $remote_url"
      ;;
  esac
}

setup::derive_branch_name() {
  if [[ -n "$BRANCH_NAME" ]]; then
    return
  fi

  BRANCH_NAME="$(git -C "$REPO_ROOT" branch --show-current 2>/dev/null || true)"
  [[ -n "$BRANCH_NAME" ]] || BRANCH_NAME="master"
}

setup::require_tools() {
  common::require_command curl
  common::require_command git
  common::require_command jq
  common::require_command mktemp
}

setup::require_bootstrap_inputs() {
  PROJECT_SLUG="${PROJECT_SLUG:-${ZANE_PROJECT_SLUG:-}}"
  PROJECT_DESCRIPTION="${PROJECT_DESCRIPTION:-${ZANE_PROJECT_DESCRIPTION:-}}"
  common::require_env PROJECT_SLUG "ZANE project slug"
  if [[ -z "$PROJECT_DESCRIPTION" ]]; then
    PROJECT_DESCRIPTION="${PROJECT_SLUG} local bootstrap"
  fi
}

setup::resolve_ctl_plan() {
  local phase="$1"
  local services=("${@:2}")
  local ctl_args=()

  INSPECT_JSON_FILE="$(mktemp)"
  PLAN_JSON_FILE="$(mktemp)"

  zane::bootstrap_zane_project_inspect_json "${services[@]}" >"$INSPECT_JSON_FILE"

  ctl_args=(
    bootstrap zane-project plan
    --project-slug "$PROJECT_SLUG"
    --project-description "$PROJECT_DESCRIPTION"
    --environment-name "$ENVIRONMENT_NAME"
    --inspect-json "$INSPECT_JSON_FILE"
    --phase "$phase"
    --repository-url "$REPOSITORY_URL"
    --branch "$BRANCH_NAME"
    --public-url-affix "$PUBLIC_URL_AFFIX"
    --stack-manifest-path "$REPO_ROOT/apps/new-engine-ctl/config/stack-manifest.yaml"
  )
  [[ -n "$GIT_APP_ID" ]] && ctl_args+=(--git-app-id "$GIT_APP_ID")
  [[ -n "$PUBLIC_DOMAIN" ]] && ctl_args+=(--public-domain "$PUBLIC_DOMAIN")
  [[ -n "$MINIO_FILE_URL_OVERRIDE" ]] && ctl_args+=(--minio-file-url "$MINIO_FILE_URL_OVERRIDE")
  [[ -n "$STORE_CORS_OVERRIDE" ]] && ctl_args+=(--store-cors "$STORE_CORS_OVERRIDE")
  [[ -n "$ADMIN_CORS_OVERRIDE" ]] && ctl_args+=(--admin-cors "$ADMIN_CORS_OVERRIDE")
  [[ -n "$AUTH_CORS_OVERRIDE" ]] && ctl_args+=(--auth-cors "$AUTH_CORS_OVERRIDE")
  [[ -n "$OPERATOR_UPSTREAM_ZANE_BASE_URL" ]] && ctl_args+=(--operator-upstream-zane-base-url "$OPERATOR_UPSTREAM_ZANE_BASE_URL")
  [[ -n "$OPERATOR_UPSTREAM_ZANE_CONNECT_BASE_URL" ]] && ctl_args+=(--operator-upstream-zane-connect-base-url "$OPERATOR_UPSTREAM_ZANE_CONNECT_BASE_URL")
  [[ -n "$OPERATOR_UPSTREAM_ZANE_CONNECT_HOST_HEADER" ]] && ctl_args+=(--operator-upstream-zane-connect-host-header "$OPERATOR_UPSTREAM_ZANE_CONNECT_HOST_HEADER")
  [[ -n "$OPERATOR_UPSTREAM_ZANE_USERNAME" ]] && ctl_args+=(--operator-upstream-zane-username "$OPERATOR_UPSTREAM_ZANE_USERNAME")
  [[ -n "$OPERATOR_UPSTREAM_ZANE_PASSWORD" ]] && ctl_args+=(--operator-upstream-zane-password "$OPERATOR_UPSTREAM_ZANE_PASSWORD")

  dev::run_ctl "${ctl_args[@]}" >"$PLAN_JSON_FILE"
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
  [[ -n "$PUBLIC_DOMAIN" ]] || common::die "Unable to determine public root domain from Zane. Pass --public-domain."

  if [[ -z "$OPERATOR_UPSTREAM_ZANE_BASE_URL" ]] || setup::is_loopback_url "$OPERATOR_UPSTREAM_ZANE_BASE_URL"; then
    [[ -n "$ZANE_APP_DOMAIN" ]] || common::die "Unable to determine Zane app domain from Zane settings."
    OPERATOR_UPSTREAM_ZANE_BASE_URL="https://${ZANE_APP_DOMAIN}"
  fi

  # Local Zane-on-Docker needs a container-reachable upstream path; the public
  # sslip host resolves to loopback from inside the deployed operator container.
  if [[ -z "$OPERATOR_UPSTREAM_ZANE_CONNECT_BASE_URL" ]] && [[ "$ZANE_ROOT_DOMAIN" == "127-0-0-1.sslip.io" ]]; then
    OPERATOR_UPSTREAM_ZANE_CONNECT_BASE_URL="http://zane-app"
  fi

  if [[ -z "$OPERATOR_UPSTREAM_ZANE_CONNECT_HOST_HEADER" ]] && [[ -n "$OPERATOR_UPSTREAM_ZANE_CONNECT_BASE_URL" ]] && [[ -n "$ZANE_APP_DOMAIN" ]]; then
    OPERATOR_UPSTREAM_ZANE_CONNECT_HOST_HEADER="$ZANE_APP_DOMAIN"
  fi
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
        common::die "Service ${service_slug} has pending volume changes that differ from the desired spec."
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
  local pending_urls_reset="false"

  if [[ "$(jq 'length' <<<"$desired_json")" == "0" ]]; then
    return 0
  fi

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

    desired_compact="$(
      jq -cS '
        {
          domain,
          base_path,
          strip_prefix,
          redirect_to: (.redirect_to // null),
          associated_port: (.associated_port // null)
        }
      ' <<<"$desired_row"
    )"
    if [[ -n "$current_row" && "$current_row" != "null" ]]; then
      current_compact="$(
        jq -cS '
          {
            domain,
            base_path,
            strip_prefix,
            redirect_to: (.redirect_to // null),
            associated_port: (.associated_port // null)
          }
        ' <<<"$current_row"
      )"
      if [[ "$current_compact" == "$desired_compact" ]]; then
        continue
      fi
    fi

    if [[ "$pending_urls_reset" != "true" ]]; then
      setup::cancel_pending_changes_for_field "$service_slug" "$service_json" "urls"
      service_json="$(zane::get_service "$service_slug")"
      effective_json="$(setup::effective_urls_json "$service_json")"
      pending_urls_reset="true"

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

      if [[ -n "$current_row" && "$current_row" != "null" ]]; then
        current_compact="$(
          jq -cS '
            {
              domain,
              base_path,
              strip_prefix,
              redirect_to: (.redirect_to // null),
              associated_port: (.associated_port // null)
            }
          ' <<<"$current_row"
        )"
        if [[ "$current_compact" == "$desired_compact" ]]; then
          continue
        fi
      fi
    fi

    if [[ -n "$current_row" && "$current_row" != "null" ]]; then
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

setup::confirm_execution() {
  local summary

  summary="$(cat <<EOF
About to sync the canonical Zane project on the deployed stack:
  zane_base_url: ${ZANE_BASE_URL}
  project_slug: ${PROJECT_SLUG}
  environment_name: ${ENVIRONMENT_NAME}
  repository: ${REPOSITORY_URL}
  branch: ${BRANCH_NAME}
  public_domain: ${PUBLIC_DOMAIN:-<auto-discover>}
EOF
)"
  dev::confirm_or_die "sync ${PROJECT_SLUG}/${ENVIRONMENT_NAME}" "$summary"
}

setup::print_plan_summary() {
  jq '{phase, status, blocking_reasons, warnings}' <"$PLAN_JSON_FILE" >&2
}

setup::cleanup() {
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
}

setup::apply_service_from_plan() {
  local service_plan_json="$1"
  local service_slug service_json service_type spec_json

  service_slug="$(jq -r '.service_slug' <<<"$service_plan_json")"
  if ! service_json="$(zane::get_service "$service_slug")"; then
    zane::create_git_service \
      "$service_slug" \
      "$(jq -r '.desired_builder.dockerfile_path' <<<"$service_plan_json")" \
      "$(jq -r '.desired_builder.build_context_dir' <<<"$service_plan_json")"
    service_json="$(zane::get_service "$service_slug")"
  fi

  service_type="$(jq -r '.type' <<<"$service_json")"
  [[ "$service_type" == "GIT_REPOSITORY" ]] || common::die "Service ${service_slug} already exists but is not a Git service."

  REPOSITORY_URL="$(jq -r '.desired_git_source.repository_url' <<<"$service_plan_json")"
  BRANCH_NAME="$(jq -r '.desired_git_source.branch_name' <<<"$service_plan_json")"
  GIT_APP_ID="$(jq -r '.desired_git_source.git_app_id // empty' <<<"$service_plan_json")"
  spec_json="$(jq -c '{dockerfile_path: .desired_builder.dockerfile_path, build_context_dir: .desired_builder.build_context_dir}' <<<"$service_plan_json")"

  setup::ensure_service_source_and_builder "$service_slug" "$service_json" "$spec_json"
  service_json="$(zane::get_service "$service_slug")"
  setup::ensure_service_command "$service_slug" "$service_json" "$(jq -r '.desired_command' <<<"$service_plan_json")"
  service_json="$(zane::get_service "$service_slug")"
  setup::ensure_service_volumes "$service_slug" "$service_json" "$(jq -c '.desired_volumes' <<<"$service_plan_json")"
  service_json="$(zane::get_service "$service_slug")"
  setup::ensure_service_urls "$service_slug" "$service_json" "$(jq -c '.desired_urls' <<<"$service_plan_json")"
  service_json="$(zane::get_service "$service_slug")"
  setup::ensure_service_healthcheck "$service_slug" "$service_json" "$(jq -c '.desired_healthcheck' <<<"$service_plan_json")"
  service_json="$(zane::get_service "$service_slug")"
  setup::ensure_service_resource_limits "$service_slug" "$service_json" "$(jq -c '.desired_resource_limits' <<<"$service_plan_json")"
}

setup::upsert_shared_envs_from_plan() {
  local plan_json="$1"
  local cleanup_key

  while IFS=$'\t' read -r key value; do
    zane::ensure_shared_env_var "$key" "$value"
  done < <(jq -r '.shared_env | to_entries[] | [.key, .value] | @tsv' <<<"$plan_json")

  while IFS= read -r cleanup_key; do
    [[ -n "$cleanup_key" ]] || continue
    zane::delete_shared_env_var "$cleanup_key"
  done < <(jq -r '.shared_env_cleanup_keys[]' <<<"$plan_json")
}

setup::upsert_service_envs_from_plan() {
  local service_plan_json="$1"
  local service_slug service_json

  service_slug="$(jq -r '.service_slug' <<<"$service_plan_json")"
  service_json="$(zane::get_service "$service_slug")"
  setup::ensure_service_envs \
    "$service_slug" \
    "$service_json" \
    "$(jq -c '.desired_env' <<<"$service_plan_json")" \
    "$(jq -c '.cleanup_env_keys' <<<"$service_plan_json")"
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
  local service_plan

  setup::parse_args "$@"
  dev::load_env_file "$ENV_FILE" required
  setup::normalize_base_url
  setup::derive_repository_url
  setup::derive_branch_name
  setup::require_tools
  setup::require_bootstrap_inputs
  common::configure_curl_ca_bundle_from_local_caddy "$ZANE_BASE_URL"
  trap setup::cleanup EXIT

  common::require_env ZANE_USERNAME "Zane username"
  common::require_env ZANE_PASSWORD "Zane password"

  setup::confirm_execution

  echo "Logging into Zane at ${ZANE_BASE_URL}..."
  zane::login
  setup::capture_zane_settings
  setup::resolve_ctl_plan services "${services[@]}"
  if [[ "$(jq -r '.warnings | length' <"$PLAN_JSON_FILE")" != "0" ]]; then
    setup::print_plan_summary
  fi
  if [[ "$(jq -r '.status' <"$PLAN_JSON_FILE")" != "ready" ]]; then
    setup::print_plan_summary
    common::die "CTL bootstrap zane-project services plan is blocked."
  fi

  if [[ "$(jq -r '.ensure_project' <"$PLAN_JSON_FILE")" == "true" ]]; then
    echo "Ensuring project ${PROJECT_SLUG}..."
    zane::ensure_project
  fi
  zane::api GET "projects/${PROJECT_SLUG}/environment-details/${ENVIRONMENT_NAME}/" >/dev/null

  while IFS= read -r service_plan; do
    setup::apply_service_from_plan "$service_plan"
  done < <(jq -c '.services[]' <"$PLAN_JSON_FILE")

  rm -f "$INSPECT_JSON_FILE" "$PLAN_JSON_FILE"
  INSPECT_JSON_FILE=""
  PLAN_JSON_FILE=""

  setup::resolve_ctl_plan env "${services[@]}"
  if [[ "$(jq -r '.warnings | length' <"$PLAN_JSON_FILE")" != "0" ]]; then
    setup::print_plan_summary
  fi
  if [[ "$(jq -r '.status' <"$PLAN_JSON_FILE")" != "ready" ]]; then
    setup::print_plan_summary
    common::die "CTL bootstrap zane-project env plan is blocked."
  fi

  setup::upsert_shared_envs_from_plan "$(cat "$PLAN_JSON_FILE")"
  while IFS= read -r service_plan; do
    setup::upsert_service_envs_from_plan "$service_plan"
  done < <(jq -c '.services[]' <"$PLAN_JSON_FILE")

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
