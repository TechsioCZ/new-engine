#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"

# shellcheck source=scripts/dev/lib/common.sh
source "${ROOT_DIR}/scripts/dev/lib/common.sh"

PROJECT_SLUG="new-engine"
ENVIRONMENT_NAME="production"
PUBLIC_DOMAIN=""
PUBLIC_URL_AFFIX="-zane"
SERVICES_CSV=""
BASE_SHA=""
HEAD_SHA="HEAD"
ZANE_BASE_URL=""
ZANE_OPERATOR_BASE_URL=""
ZANE_OPERATOR_API_TOKEN=""
MEILISEARCH_URL=""
MEILISEARCH_MASTER_KEY=""
SKIP_VERIFY="false"
APPROVE_DOWNTIME_RISK="false"

usage() {
  cat <<'EOF'
Usage:
  scripts/dev/run-zane-main-lane.sh [options]

Simulates the active CI main lane locally in the same stage order:
  scope -> prepare -> deploy -> verify

Options:
  --env-file <path>             source local defaults from file (default: .env)
  --services-csv <csv>          explicit affected services; skips git scope resolution
  --base-sha <sha>              base revision for scope resolution (default: HEAD^ or repo root)
  --head-sha <sha>              head revision for scope resolution (default: HEAD)
  --project-slug <slug>         canonical Zane project slug (default: new-engine)
  --environment-name <name>     main environment name (default: production)
  --public-domain <domain>      public root domain for derived service URLs
  --public-url-affix <suffix>   service URL affix (default: -zane)
  --zane-base-url <url>         upstream Zane base URL used for domain derivation
  --operator-api-token <token>  deployed zane-operator API token override
  --meili-master-key <key>      Meilisearch master key override
  --approve-downtime-risk       allow local run to continue when downtime-risk services are in scope
  --skip-verify                 skip the final verify stage
  -h, --help                    show this help

Notes:
  - Local defaults are sourced from .env, but test-specific overrides should be passed explicitly.
  - Derived service URLs follow the same route contract used by setup-zane-project.sh.
EOF
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --env-file)
        ENV_FILE="$2"
        shift 2
        ;;
      --services-csv)
        SERVICES_CSV="$2"
        shift 2
        ;;
      --base-sha)
        BASE_SHA="$2"
        shift 2
        ;;
      --head-sha)
        HEAD_SHA="$2"
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
      --operator-api-token)
        ZANE_OPERATOR_API_TOKEN="$2"
        shift 2
        ;;
      --meili-master-key)
        MEILISEARCH_MASTER_KEY="$2"
        shift 2
        ;;
      --approve-downtime-risk)
        APPROVE_DOWNTIME_RISK="true"
        shift
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
  common::require_command bash
  common::require_command git
  common::require_command jq
  common::require_command node
  common::require_command pnpm
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

normalize_csv() {
  jq -rRn --arg value "${1:-}" '
    $value
    | split(",")
    | map(gsub("^\\s+|\\s+$"; "") | select(length > 0))
    | unique
    | join(",")
  '
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
  ZANE_BASE_URL="${ZANE_BASE_URL:-${DC_ZANE_OPERATOR_ZANE_BASE_URL:-}}"
  ZANE_OPERATOR_API_TOKEN="${ZANE_OPERATOR_API_TOKEN:-${DC_ZANE_OPERATOR_API_AUTH_TOKEN:-}}"
  MEILISEARCH_MASTER_KEY="${MEILISEARCH_MASTER_KEY:-${DC_MEILISEARCH_MASTER_KEY:-}}"

  derive_public_domain

  if [[ -z "$ZANE_OPERATOR_BASE_URL" ]]; then
    ZANE_OPERATOR_BASE_URL="https://${PROJECT_SLUG}-zane-operator${PUBLIC_URL_AFFIX}.${PUBLIC_DOMAIN}"
  fi
  if [[ -z "$MEILISEARCH_URL" ]]; then
    MEILISEARCH_URL="https://${PROJECT_SLUG}-medusa-meilisearch${PUBLIC_URL_AFFIX}.${PUBLIC_DOMAIN}"
  fi
}

default_base_sha() {
  local base_sha

  base_sha="$(git -C "$ROOT_DIR" rev-parse HEAD^ 2>/dev/null || true)"
  if [[ -z "$base_sha" ]]; then
    base_sha="$(git -C "$ROOT_DIR" rev-list --max-parents=0 HEAD)"
  fi
  printf '%s\n' "$base_sha"
}

resolve_scope() {
  local scope_json

  common::stage "Scope"
  common::step "Resolving affected services for the main lane..."
  SERVICES_CSV="$(normalize_csv "$SERVICES_CSV")"
  if [[ -n "$SERVICES_CSV" ]]; then
    scope_json="$(
      node "${ROOT_DIR}/apps/new-engine-ctl/dist/cli.js" scope \
        --lane main \
        --services-csv "$SERVICES_CSV"
    )"
    SERVICES_CSV="$(jq -r '.services_csv' <<<"$scope_json")"
    common::success "Scope resolved from explicit services: ${SERVICES_CSV:-<none>}."
    printf '%s\n' "$scope_json"
    return
  fi

  [[ -n "$BASE_SHA" ]] || BASE_SHA="$(default_base_sha)"
  scope_json="$(
    node "${ROOT_DIR}/apps/new-engine-ctl/dist/cli.js" scope \
      --lane main \
      --base-sha "$BASE_SHA" \
      --head-sha "$HEAD_SHA"
  )"
  SERVICES_CSV="$(jq -r '.services_csv' <<<"$scope_json")"
  common::success "Scope resolved from git diff: ${SERVICES_CSV:-<none>}."
  printf '%s\n' "$scope_json"
}

run_deploy_stage() {
  local requires_meili_keys="$1"
  local deploy_json
  local git_commit_sha
  local output_file
  local backend_key=""
  local frontend_key=""
  local frontend_env_var=""
  local backend_created="false"
  local backend_updated="false"
  local frontend_created="false"
  local frontend_updated="false"
  local keys_reconciled="false"
  local meili_verified="false"

  common::stage "Deploy"
  common::step "Running main deploy stage..."
  if [[ "$HEAD_SHA" == "HEAD" ]]; then
    git_commit_sha="HEAD"
    common::step "Local deploy target commit: HEAD (branch-head mode)."
  else
    git_commit_sha="$(git -C "$ROOT_DIR" rev-parse "$HEAD_SHA")"
    common::step "Local deploy target commit: ${git_commit_sha}."
  fi

  (
    export REQUIRES_MEILI_KEYS="$requires_meili_keys"
    export ZANE_OPERATOR_BASE_URL="$ZANE_OPERATOR_BASE_URL"
    export ZANE_OPERATOR_API_TOKEN="$ZANE_OPERATOR_API_TOKEN"
    export ZANE_CANONICAL_PROJECT_SLUG="$PROJECT_SLUG"
    export ZANE_PRODUCTION_ENVIRONMENT_NAME="$ENVIRONMENT_NAME"
    export MEILISEARCH_URL="$MEILISEARCH_URL"
    export MEILISEARCH_MASTER_KEY="$MEILISEARCH_MASTER_KEY"
    node "${ROOT_DIR}/apps/new-engine-ctl/dist/cli.js" check-workflow-inputs --mode main-deploy
  ) >/dev/null

  if [[ "$requires_meili_keys" == "true" ]]; then
    common::step "Main deploy will reconcile Meili API credentials when the source service is healthy."
  else
    common::step "Main deploy does not need Meili API credential reconciliation for this scope."
  fi

  output_file="$(mktemp)"
  trap 'rm -f "$output_file"' RETURN

  if ! deploy_json="$(
    GITHUB_OUTPUT="$output_file" \
    MEILISEARCH_URL="$MEILISEARCH_URL" \
    MEILISEARCH_MASTER_KEY="$MEILISEARCH_MASTER_KEY" \
    node "${ROOT_DIR}/apps/new-engine-ctl/dist/cli.js" deploy-main \
      --project-slug "$PROJECT_SLUG" \
      --environment-name "$ENVIRONMENT_NAME" \
      --services-csv "$SERVICES_CSV" \
      --git-commit-sha "$git_commit_sha" \
      --meili-url "$MEILISEARCH_URL" \
      --meili-master-key "$MEILISEARCH_MASTER_KEY" \
      --base-url "$ZANE_OPERATOR_BASE_URL" \
      --api-token "$ZANE_OPERATOR_API_TOKEN"
  )"; then
    return 1
  fi

  backend_key="$(sed -n 's/^meili_backend_key=//p' "$output_file" | tail -n1)"
  frontend_key="$(sed -n 's/^meili_frontend_key=//p' "$output_file" | tail -n1)"
  frontend_env_var="$(sed -n 's/^meili_frontend_env_var=//p' "$output_file" | tail -n1)"
  backend_created="$(sed -n 's/^meili_backend_created=//p' "$output_file" | tail -n1)"
  backend_updated="$(sed -n 's/^meili_backend_updated=//p' "$output_file" | tail -n1)"
  frontend_created="$(sed -n 's/^meili_frontend_created=//p' "$output_file" | tail -n1)"
  frontend_updated="$(sed -n 's/^meili_frontend_updated=//p' "$output_file" | tail -n1)"
  keys_reconciled="$(sed -n 's/^meili_keys_reconciled=//p' "$output_file" | tail -n1)"
  meili_verified="$(sed -n 's/^meili_verified=//p' "$output_file" | tail -n1)"

  jq -cn \
    --argjson response "$deploy_json" \
    --arg meili_backend_key "$backend_key" \
    --arg meili_frontend_key "$frontend_key" \
    --arg meili_frontend_env_var "$frontend_env_var" \
    --argjson meili_backend_created "$(jq -n --arg value "${backend_created:-false}" '$value == "true"')" \
    --argjson meili_backend_updated "$(jq -n --arg value "${backend_updated:-false}" '$value == "true"')" \
    --argjson meili_frontend_created "$(jq -n --arg value "${frontend_created:-false}" '$value == "true"')" \
    --argjson meili_frontend_updated "$(jq -n --arg value "${frontend_updated:-false}" '$value == "true"')" \
    --argjson meili_keys_reconciled "$(jq -n --arg value "${keys_reconciled:-false}" '$value == "true"')" \
    --argjson meili_verified "$(jq -n --arg value "${meili_verified:-false}" '$value == "true"')" \
    '($response + {
      meili_backend_key: $meili_backend_key,
      meili_frontend_key: $meili_frontend_key,
      meili_frontend_env_var: $meili_frontend_env_var,
      meili_backend_created: $meili_backend_created,
      meili_backend_updated: $meili_backend_updated,
      meili_frontend_created: $meili_frontend_created,
      meili_frontend_updated: $meili_frontend_updated,
      meili_keys_reconciled: $meili_keys_reconciled,
      meili_verified: $meili_verified
    })'
}

run_verify_stage() {
  local deploy_json="$1"
  local verify_json
  local deployments_json_inline

  common::stage "Verify"
  common::step "Running main verify stage..."
  jq -e . >/dev/null <<<"$deploy_json" || common::die "Deploy stage did not return valid JSON."
  deployments_json_inline="$(jq -c '{services: (.deployments // [])}' <<<"$deploy_json")"

  (
    export ZANE_OPERATOR_BASE_URL="$ZANE_OPERATOR_BASE_URL"
    export ZANE_OPERATOR_API_TOKEN="$ZANE_OPERATOR_API_TOKEN"
    export ZANE_CANONICAL_PROJECT_SLUG="$PROJECT_SLUG"
    export ZANE_PRODUCTION_ENVIRONMENT_NAME="$ENVIRONMENT_NAME"
    node "${ROOT_DIR}/apps/new-engine-ctl/dist/cli.js" check-workflow-inputs --mode main-verify
  ) >/dev/null

  if ! verify_json="$(
    node "${ROOT_DIR}/apps/new-engine-ctl/dist/cli.js" verify \
      --lane main \
      --project-slug "$PROJECT_SLUG" \
      --environment-name "$(jq -r '.environment_name' <<<"$deploy_json")" \
      --requested-services-csv "$(jq -r '.requested_services_csv' <<<"$deploy_json")" \
      --deploy-services-csv "$(jq -r '.deploy_services_csv' <<<"$deploy_json")" \
      --triggered-services-csv "$(jq -r '.triggered_services_csv' <<<"$deploy_json")" \
      --deployments-json-inline "$deployments_json_inline" \
      --meili-backend-key "$(jq -r '.meili_backend_key // ""' <<<"$deploy_json")" \
      --meili-frontend-key "$(jq -r '.meili_frontend_key // ""' <<<"$deploy_json")" \
      --meili-frontend-env-var "$(jq -r '.meili_frontend_env_var // ""' <<<"$deploy_json")" \
      --base-url "$ZANE_OPERATOR_BASE_URL" \
      --api-token "$ZANE_OPERATOR_API_TOKEN"
  )"; then
    return 1
  fi
  printf '%s\n' "$verify_json"
}

main() {
  local scope_json
  local prepare_needs_json
  local downtime_json
  local prepare_json='{"skipped":true,"reason":"main_prepare_not_used"}'
  local deploy_json
  local verify_json='{}'
  local requires_meili_keys

  parse_args "$@"
  load_env_file
  require_tools
  ensure_ctl_built
  derive_defaults
  common::configure_node_extra_ca_certs_from_local_caddy "$ZANE_OPERATOR_BASE_URL" "$MEILISEARCH_URL"
  trap 'common::cleanup_node_extra_ca_certs_temp' EXIT

  scope_json="$(resolve_scope)"
  SERVICES_CSV="$(jq -r '.services_csv' <<<"$scope_json")"
  common::step "Using operator URL: ${ZANE_OPERATOR_BASE_URL}"
  common::step "Using Meilisearch URL: ${MEILISEARCH_URL}"

  if [[ -z "$SERVICES_CSV" ]]; then
    common::success "No affected services detected. Skipping main lane."
    jq -cn \
      --arg project_slug "$PROJECT_SLUG" \
      --arg environment_name "$ENVIRONMENT_NAME" \
      --arg operator_base_url "$ZANE_OPERATOR_BASE_URL" \
      --arg meili_url "$MEILISEARCH_URL" \
      --argjson scope "$scope_json" \
      '{
        project_slug: $project_slug,
        environment_name: $environment_name,
        operator_base_url: $operator_base_url,
        meili_url: $meili_url,
        scope: $scope,
        skipped: true,
        reason: "no_affected_services"
      }'
    return 0
  fi

  prepare_needs_json="$(jq -c '{
    services_csv,
    should_prepare,
    requires_preview_db,
    requires_meili_keys,
    preview_db_service_ids: (if .preview_db_service_ids == "" then [] else (.preview_db_service_ids | split(",")) end),
    meili_key_service_ids: (if .meili_key_service_ids == "" then [] else (.meili_key_service_ids | split(",")) end)
  }' <<<"$scope_json")"
  jq -e . >/dev/null <<<"$prepare_needs_json" || common::die "Prepare-needs stage did not return valid JSON."
  downtime_json="$(jq -c '{
    lane,
    services_csv,
    requires_downtime_approval,
    downtime_service_ids: (if .downtime_service_ids == "" then [] else (.downtime_service_ids | split(",")) end)
  }' <<<"$scope_json")"
  jq -e . >/dev/null <<<"$downtime_json" || common::die "Downtime-risk stage did not return valid JSON."
  if [[ "$(jq -r '.requires_downtime_approval' <<<"$downtime_json")" == "true" && "$APPROVE_DOWNTIME_RISK" != "true" ]]; then
    common::die "Main deploy includes downtime-risk services: $(jq -r '.downtime_service_ids | join(\",\")' <<<"$downtime_json"). Re-run with --approve-downtime-risk once you are ready to accept downtime."
  fi
  requires_meili_keys="$(jq -r '.requires_meili_keys' <<<"$prepare_needs_json")"
  common::stage "Prepare"
  common::step "Skipping main prepare stage: main lane has no active shared-resource prepare work."
  if ! deploy_json="$(run_deploy_stage "$requires_meili_keys")"; then
    common::die "Main deploy stage failed. See the deployment error above for the failing stage and deployment hash."
  fi
  jq -e . >/dev/null <<<"$deploy_json" || common::die "Deploy stage did not return valid JSON."

  if [[ "$SKIP_VERIFY" == "false" ]]; then
    if ! verify_json="$(run_verify_stage "$deploy_json")"; then
      common::die "Main verify stage failed. See the verification error above."
    fi
    jq -e . >/dev/null <<<"$verify_json" || common::die "Verify stage did not return valid JSON."
  else
    common::step "Skipping main verify stage by request."
  fi

  common::success "Main lane completed successfully."
  jq -cn \
    --arg project_slug "$PROJECT_SLUG" \
    --arg environment_name "$ENVIRONMENT_NAME" \
    --arg operator_base_url "$ZANE_OPERATOR_BASE_URL" \
    --arg meili_url "$MEILISEARCH_URL" \
    --argjson scope "$scope_json" \
    --argjson prepare_needs "$prepare_needs_json" \
    --argjson downtime_risk "$downtime_json" \
    --argjson prepare "$prepare_json" \
    --argjson deploy "$deploy_json" \
    --argjson verify "$verify_json" \
    --argjson skipped_verify "$(jq -n --arg value "$SKIP_VERIFY" '$value == "true"')" \
    '{
      project_slug: $project_slug,
      environment_name: $environment_name,
      operator_base_url: $operator_base_url,
      meili_url: $meili_url,
      scope: $scope,
      prepare_needs: $prepare_needs,
      downtime_risk: $downtime_risk,
      prepare: $prepare,
      deploy: $deploy,
      verify: $verify,
      skipped_verify: $skipped_verify
    }'
}

main "$@"
