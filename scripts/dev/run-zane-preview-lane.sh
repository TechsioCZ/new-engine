#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env.zane"

# shellcheck source=scripts/dev/lib/common.sh
source "${ROOT_DIR}/scripts/dev/lib/common.sh"

PROJECT_SLUG=""
PRODUCTION_ENVIRONMENT_NAME="production"
PUBLIC_DOMAIN=""
PUBLIC_URL_AFFIX="-zane"
PR_NUMBER=""
SERVICES_CSV=""
TARGET_COMMIT_SHA=""
ZANE_BASE_URL=""
ZANE_OPERATOR_BASE_URL=""
ZANE_OPERATOR_API_TOKEN=""
SKIP_VERIFY="false"

usage() {
  cat <<'EOF'
Usage:
  scripts/dev/run-zane-preview-lane.sh [options]

Simulates the active CI preview lane locally against a deployed Zane target:
  scope -> preview-commit-state -> prepare -> deploy-preview -> verify

Options:
  --env-file <path>              source local defaults from file (default: .env.zane)
  --pr-number <n>                preview PR number to create or reuse
  --services-csv <csv>           explicit affected services for preview validation
  --target-commit-sha <sha>      target commit SHA (default: current HEAD)
  --project-slug <slug>          canonical Zane project slug (required; no default)
  --production-env <name>        source production environment name (default: production)
  --public-domain <domain>       public root domain for derived service URLs
  --public-url-affix <suffix>    service URL affix (default: -zane)
  --zane-base-url <url>          upstream Zane base URL used for domain derivation
  --operator-base-url <url>      deployed zane-operator base URL override
  --operator-api-token <token>   deployed zane-operator API token override
  --skip-verify                  skip the final verify stage
  -h, --help                     show this help

Notes:
  - Local defaults are sourced from .env.zane.
  - This helper stays thin: repo policy remains owned by apps/new-engine-ctl.
  - Pass explicit services, for example: --services-csv medusa-be,n1
EOF
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --env-file)
        ENV_FILE="$2"
        shift 2
        ;;
      --pr-number)
        PR_NUMBER="$2"
        shift 2
        ;;
      --services-csv)
        SERVICES_CSV="$2"
        shift 2
        ;;
      --target-commit-sha)
        TARGET_COMMIT_SHA="$2"
        shift 2
        ;;
      --project-slug)
        PROJECT_SLUG="$2"
        shift 2
        ;;
      --production-env)
        PRODUCTION_ENVIRONMENT_NAME="$2"
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
      --zane-base-url)
        ZANE_BASE_URL="$2"
        shift 2
        ;;
      --operator-base-url)
        ZANE_OPERATOR_BASE_URL="$2"
        shift 2
        ;;
      --operator-api-token)
        ZANE_OPERATOR_API_TOKEN="$2"
        shift 2
        ;;
      --skip-verify)
        SKIP_VERIFY="true"
        shift
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        common::die "Unknown argument: $1"
        ;;
    esac
  done
}

load_env_file() {
  [[ -f "$ENV_FILE" ]] || common::die "Env file not found: $ENV_FILE"

  set +u
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
  set -u
}

require_tools() {
  common::require_command docker
  common::require_command git
  common::require_command jq
  common::require_command node
  common::require_command pnpm
  common::require_command sed
}

ensure_ctl_built() {
  local build_output

  common::stage "Build"
  common::step "Building new-engine-ctl CLI..."
  (
    cd "$ROOT_DIR/apps/new-engine-ctl"
    if ! build_output="$(pnpm run build 2>&1)"; then
      printf '%s\n' "$build_output" >&2
      return 1
    fi
  ) || common::die "Failed to build new-engine-ctl CLI."
}

derive_public_domain() {
  local host

  if [[ -n "$PUBLIC_DOMAIN" ]]; then
    return
  fi

  [[ -n "$ZANE_BASE_URL" ]] || common::die "Unable to derive public domain without --zane-base-url or DC_ZANE_OPERATOR_ZANE_BASE_URL."
  host="${ZANE_BASE_URL#http://}"
  host="${host#https://}"
  host="${host%%/*}"
  host="${host%%:*}"

  if [[ "$host" == zane.* ]]; then
    PUBLIC_DOMAIN="${host#zane.}"
    return
  fi

  common::die "Unable to derive public domain from ${ZANE_BASE_URL}. Pass --public-domain explicitly."
}

derive_defaults() {
  ZANE_BASE_URL="${ZANE_BASE_URL:-${ZANEOPS_URL:-${DC_ZANE_OPERATOR_ZANE_BASE_URL:-}}}"
  ZANE_OPERATOR_API_TOKEN="${ZANE_OPERATOR_API_TOKEN:-${DC_ZANE_OPERATOR_API_AUTH_TOKEN:-}}"
  PROJECT_SLUG="${PROJECT_SLUG:-${ZANE_PROJECT_SLUG:-}}"
  PRODUCTION_ENVIRONMENT_NAME="${PRODUCTION_ENVIRONMENT_NAME:-${ZANE_ENVIRONMENT_NAME:-${ZANE_PRODUCTION_ENVIRONMENT_NAME:-production}}}"

  [[ -n "$PROJECT_SLUG" ]] || common::die "Unable to resolve project slug. Pass --project-slug or export ZANE_PROJECT_SLUG."

  derive_public_domain

  if [[ -z "$ZANE_OPERATOR_BASE_URL" ]]; then
    ZANE_OPERATOR_BASE_URL="https://${PROJECT_SLUG}-zane-operator${PUBLIC_URL_AFFIX}.${PUBLIC_DOMAIN}"
  fi

  if [[ -z "$TARGET_COMMIT_SHA" ]]; then
    TARGET_COMMIT_SHA="$(git -C "$ROOT_DIR" rev-parse HEAD)"
  else
    TARGET_COMMIT_SHA="$(git -C "$ROOT_DIR" rev-parse "$TARGET_COMMIT_SHA")"
  fi
}

read_output_value() {
  local key="$1"
  local file="$2"
  sed -n "s/^${key}=//p" "$file" | tail -n1
}

run_scope_stage() {
  local scope_json

  common::stage "Scope"
  common::step "Resolving preview scope from explicit services..."
  SERVICES_CSV="$(common::normalize_csv "$SERVICES_CSV")"

  if ! scope_json="$(
    node "${ROOT_DIR}/apps/new-engine-ctl/dist/cli.js" scope \
      --lane preview \
      --services-csv "$SERVICES_CSV"
  )"; then
    return 1
  fi

  SERVICES_CSV="$(jq -r '.services_csv' <<<"$scope_json")"
  common::success "Scope resolved: ${SERVICES_CSV:-<none>}."
  printf '%s\n' "$scope_json"
}

run_preview_commit_state_stage() {
  local commit_state_json

  common::stage "Preview State"
  common::step "Reading preview commit metadata..."

  if ! commit_state_json="$(
    node "${ROOT_DIR}/apps/new-engine-ctl/dist/cli.js" preview-commit-state \
      --project-slug "$PROJECT_SLUG" \
      --pr-number "$PR_NUMBER" \
      --base-url "$ZANE_OPERATOR_BASE_URL" \
      --api-token "$ZANE_OPERATOR_API_TOKEN"
  )"; then
    return 1
  fi

  common::success "Preview environment state read."
  printf '%s\n' "$commit_state_json"
}

run_prepare_stage() {
  local scope_json="$1"
  local prepare_json
  local output_file
  local requires_preview_db
  local prepare_args=()

  common::stage "Prepare"
  common::step "Running preview prepare stage..."
  requires_preview_db="$(jq -r '.requires_preview_db' <<<"$scope_json")"

  (
    export REQUIRES_PREVIEW_DB="$requires_preview_db"
    export ZANE_OPERATOR_BASE_URL="$ZANE_OPERATOR_BASE_URL"
    export ZANE_OPERATOR_API_TOKEN="$ZANE_OPERATOR_API_TOKEN"
    node "${ROOT_DIR}/apps/new-engine-ctl/dist/cli.js" check-workflow-inputs --mode preview-prepare
  ) >/dev/null

  output_file="$(mktemp)"
  trap 'rm -f "$output_file"' RETURN

  prepare_args=(
    --lane preview
    --project-slug "$PROJECT_SLUG"
    --pr-number "$PR_NUMBER"
    --base-url "$ZANE_OPERATOR_BASE_URL"
    --api-token "$ZANE_OPERATOR_API_TOKEN"
  )
  if [[ "$requires_preview_db" == "true" ]]; then
    prepare_args+=(--requires-preview-db)
  fi

  if ! prepare_json="$(
    GITHUB_OUTPUT="$output_file" \
    node "${ROOT_DIR}/apps/new-engine-ctl/dist/cli.js" prepare "${prepare_args[@]}"
  )"; then
    return 1
  fi

  jq -cn \
    --argjson response "$prepare_json" \
    --arg preview_db_name "$(read_output_value preview_db_name "$output_file")" \
    --arg preview_db_user "$(read_output_value preview_db_user "$output_file")" \
    --arg preview_db_password "$(read_output_value preview_db_password "$output_file")" \
    '($response + {
      preview_db_name: $preview_db_name,
      preview_db_user: $preview_db_user,
      preview_db_password: $preview_db_password
    })'
}

run_deploy_stage() {
  local prepare_json="$1"
  local deploy_json
  local output_file
  local status=0

  common::stage "Deploy"
  common::step "Running preview deploy stage..."

  (
    export ZANE_OPERATOR_BASE_URL="$ZANE_OPERATOR_BASE_URL"
    export ZANE_OPERATOR_API_TOKEN="$ZANE_OPERATOR_API_TOKEN"
    export ZANE_PROJECT_SLUG="$PROJECT_SLUG"
    export ZANE_PRODUCTION_ENVIRONMENT_NAME="$PRODUCTION_ENVIRONMENT_NAME"
    export PREVIEW_DB_PASSWORD="$(jq -r '.preview_db_password // ""' <<<"$prepare_json")"
    node "${ROOT_DIR}/apps/new-engine-ctl/dist/cli.js" check-workflow-inputs --mode preview-deploy
  ) >/dev/null

  output_file="$(mktemp)"
  trap 'rm -f "$output_file"' RETURN

  set +e
  deploy_json="$(
    GITHUB_OUTPUT="$output_file" \
    node "${ROOT_DIR}/apps/new-engine-ctl/dist/cli.js" deploy-preview \
      --project-slug "$PROJECT_SLUG" \
      --pr-number "$PR_NUMBER" \
      --target-commit-sha "$TARGET_COMMIT_SHA" \
      --services-csv "$SERVICES_CSV" \
      --source-environment-name "$PRODUCTION_ENVIRONMENT_NAME" \
      --preview-db-name "$(jq -r '.preview_db_name // ""' <<<"$prepare_json")" \
      --preview-db-user "$(jq -r '.preview_db_user // ""' <<<"$prepare_json")" \
      --preview-db-password "$(jq -r '.preview_db_password // ""' <<<"$prepare_json")" \
      --base-url "$ZANE_OPERATOR_BASE_URL" \
      --api-token "$ZANE_OPERATOR_API_TOKEN"
  )"
  status=$?
  set -e
  if [[ "$status" -ne 0 ]]; then
    if [[ "$status" -eq 130 ]]; then
      common::interrupt "Preview deploy interrupted; current stage deployments were canceled."
    fi
    return "$status"
  fi

  jq -cn \
    --argjson response "$deploy_json" \
    --arg meili_backend_key "$(read_output_value meili_backend_key "$output_file")" \
    --arg meili_frontend_key "$(read_output_value meili_frontend_key "$output_file")" \
    --arg meili_frontend_env_var "$(read_output_value meili_frontend_env_var "$output_file")" \
    --arg preview_random_once_secrets_json "$(read_output_value preview_random_once_secrets_json "$output_file")" \
    --arg deployments_json "$(read_output_value deployments_json "$output_file")" \
    '($response + {
      meili_backend_key: $meili_backend_key,
      meili_frontend_key: $meili_frontend_key,
      meili_frontend_env_var: $meili_frontend_env_var,
      preview_random_once_secrets_json: $preview_random_once_secrets_json,
      deployments_json: $deployments_json
    })'
}

run_verify_stage() {
  local prepare_json="$1"
  local deploy_json="$2"
  local verify_json
  local status=0

  common::stage "Verify"
  common::step "Running preview verify stage..."

  (
    export ZANE_OPERATOR_BASE_URL="$ZANE_OPERATOR_BASE_URL"
    export ZANE_OPERATOR_API_TOKEN="$ZANE_OPERATOR_API_TOKEN"
    export ZANE_PROJECT_SLUG="$PROJECT_SLUG"
    export PREVIEW_DB_PASSWORD="$(jq -r '.preview_db_password // ""' <<<"$prepare_json")"
    export PREVIEW_RANDOM_ONCE_SECRETS_JSON="$(jq -r '.preview_random_once_secrets_json // ""' <<<"$deploy_json")"
    export MEILI_BACKEND_KEY="$(jq -r '.meili_backend_key // ""' <<<"$deploy_json")"
    export MEILI_FRONTEND_KEY="$(jq -r '.meili_frontend_key // ""' <<<"$deploy_json")"
    node "${ROOT_DIR}/apps/new-engine-ctl/dist/cli.js" check-workflow-inputs --mode preview-verify
  ) >/dev/null

  set +e
  verify_json="$(
    node "${ROOT_DIR}/apps/new-engine-ctl/dist/cli.js" verify \
      --lane preview \
      --project-slug "$PROJECT_SLUG" \
      --environment-name "$(jq -r '.environment_name' <<<"$deploy_json")" \
      --requested-services-csv "$(jq -r '.requested_services_csv' <<<"$deploy_json")" \
      --deploy-services-csv "$(jq -r '.deploy_services_csv' <<<"$deploy_json")" \
      --triggered-services-csv "$(jq -r '.triggered_services_csv' <<<"$deploy_json")" \
      --preview-cloned-service-ids-csv "$(jq -r '.preview_cloned_service_ids_csv' <<<"$deploy_json")" \
      --preview-excluded-service-ids-csv "$(jq -r '.preview_excluded_service_ids_csv' <<<"$deploy_json")" \
      --deployments-json-inline "$(jq -r '.deployments_json // "{\"services\":[]}"' <<<"$deploy_json")" \
      --preview-db-name "$(jq -r '.preview_db_name // ""' <<<"$prepare_json")" \
      --preview-db-user "$(jq -r '.preview_db_user // ""' <<<"$prepare_json")" \
      --preview-db-password "$(jq -r '.preview_db_password // ""' <<<"$prepare_json")" \
      --preview-random-once-secrets-json "$(jq -r '.preview_random_once_secrets_json // ""' <<<"$deploy_json")" \
      --meili-backend-key "$(jq -r '.meili_backend_key // ""' <<<"$deploy_json")" \
      --meili-frontend-key "$(jq -r '.meili_frontend_key // ""' <<<"$deploy_json")" \
      --meili-frontend-env-var "$(jq -r '.meili_frontend_env_var // ""' <<<"$deploy_json")" \
      --base-url "$ZANE_OPERATOR_BASE_URL" \
      --api-token "$ZANE_OPERATOR_API_TOKEN"
  )"
  status=$?
  set -e
  if [[ "$status" -ne 0 ]]; then
    if [[ "$status" -eq 130 ]]; then
      common::interrupt "Preview verify interrupted."
    fi
    return "$status"
  fi

  printf '%s\n' "$verify_json"
}

main() {
  local scope_json
  local preview_commit_state_json
  local prepare_json
  local deploy_json
  local verify_json='{}'

  parse_args "$@"
  load_env_file
  require_tools
  ensure_ctl_built
  derive_defaults

  [[ "$PR_NUMBER" =~ ^[0-9]+$ ]] || common::die "--pr-number must be a positive integer."
  [[ -n "$SERVICES_CSV" ]] || common::die "--services-csv is required."
  [[ -n "$ZANE_OPERATOR_API_TOKEN" ]] || common::die "Unable to resolve ZANE operator API token from ${ENV_FILE}."

  common::configure_node_extra_ca_certs_from_local_caddy "$ZANE_OPERATOR_BASE_URL"
  trap 'common::cleanup_node_extra_ca_certs_temp' EXIT

  common::step "Using operator URL: ${ZANE_OPERATOR_BASE_URL}"
  common::step "Using production source environment: ${PRODUCTION_ENVIRONMENT_NAME}"
  common::step "Using preview target commit: ${TARGET_COMMIT_SHA}"

  scope_json="$(run_scope_stage)" || common::die "Preview scope stage failed."
  if [[ -z "$(jq -r '.services_csv' <<<"$scope_json")" ]]; then
    common::success "No preview services selected. Skipping preview lane."
    jq -cn \
      --arg project_slug "$PROJECT_SLUG" \
      --arg production_environment_name "$PRODUCTION_ENVIRONMENT_NAME" \
      --arg operator_base_url "$ZANE_OPERATOR_BASE_URL" \
      --arg pr_number "$PR_NUMBER" \
      --argjson scope "$scope_json" \
      '{
        project_slug: $project_slug,
        production_environment_name: $production_environment_name,
        operator_base_url: $operator_base_url,
        pr_number: ($pr_number | tonumber),
        scope: $scope,
        skipped: true,
        reason: "no_selected_services"
      }'
    return 0
  fi

  preview_commit_state_json="$(run_preview_commit_state_stage)" || common::die "Preview commit-state stage failed."
  prepare_json="$(run_prepare_stage "$scope_json")" || common::die "Preview prepare stage failed."
  deploy_json="$(run_deploy_stage "$prepare_json")" || common::die "Preview deploy stage failed. See the deployment error above for the failing service or deployment."

  if [[ "$SKIP_VERIFY" == "false" ]]; then
    verify_json="$(run_verify_stage "$prepare_json" "$deploy_json")" || common::die "Preview verify stage failed. See the verification error above."
  else
    common::step "Skipping preview verify stage by request."
  fi

  common::success "Preview lane completed successfully."
  jq -cn \
    --arg project_slug "$PROJECT_SLUG" \
    --arg production_environment_name "$PRODUCTION_ENVIRONMENT_NAME" \
    --arg operator_base_url "$ZANE_OPERATOR_BASE_URL" \
    --arg pr_number "$PR_NUMBER" \
    --arg target_commit_sha "$TARGET_COMMIT_SHA" \
    --argjson scope "$scope_json" \
    --argjson preview_commit_state "$preview_commit_state_json" \
    --argjson prepare "$prepare_json" \
    --argjson deploy "$deploy_json" \
    --argjson verify "$verify_json" \
    --argjson skipped_verify "$(jq -n --arg value "$SKIP_VERIFY" '$value == "true"')" \
    '{
      project_slug: $project_slug,
      production_environment_name: $production_environment_name,
      operator_base_url: $operator_base_url,
      pr_number: ($pr_number | tonumber),
      target_commit_sha: $target_commit_sha,
      scope: $scope,
      preview_commit_state: $preview_commit_state,
      prepare: $prepare,
      deploy: $deploy,
      verify: $verify,
      skipped_verify: $skipped_verify
    }'
}

main "$@"
