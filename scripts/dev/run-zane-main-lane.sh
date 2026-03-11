#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"
STACK_MANIFEST_HELPER="${ROOT_DIR}/scripts/lib/stack-manifest.sh"

# shellcheck source=scripts/ci/lib.sh
source "${ROOT_DIR}/scripts/ci/lib.sh"

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
  --operator-base-url <url>     deployed zane-operator public URL override
  --operator-api-token <token>  deployed zane-operator API token override
  --meili-url <url>             deployed Meilisearch public URL override
  --meili-master-key <key>      Meilisearch master key override
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
      --operator-base-url)
        ZANE_OPERATOR_BASE_URL="$2"
        shift 2
        ;;
      --operator-api-token)
        ZANE_OPERATOR_API_TOKEN="$2"
        shift 2
        ;;
      --meili-url)
        MEILISEARCH_URL="$2"
        shift 2
        ;;
      --meili-master-key)
        MEILISEARCH_MASTER_KEY="$2"
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
        ci::die "Unknown argument: $1"
        ;;
    esac
  done
}

load_env_file() {
  [[ -f "$ENV_FILE" ]] || ci::die "Env file not found: $ENV_FILE"

  set +u
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
  set -u
}

require_tools() {
  ci::require_command bash
  ci::require_command git
  ci::require_command jq
  ci::require_command yq
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

  [[ -n "$ZANE_BASE_URL" ]] || ci::die "Unable to derive public domain without --zane-base-url or DC_ZANE_OPERATOR_ZANE_BASE_URL."
  host="${ZANE_BASE_URL#http://}"
  host="${host#https://}"
  host="${host%%/*}"
  host="${host%%:*}"

  if [[ "$host" == zane.* ]]; then
    PUBLIC_DOMAIN="${host#zane.}"
    return
  fi

  ci::die "Unable to derive public domain from ${ZANE_BASE_URL}. Pass --public-domain explicitly."
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

validate_explicit_services() {
  local services_csv="$1"
  local -A allowed=()
  local invalid=()
  local service_id

  while IFS= read -r service_id; do
    [[ -n "$service_id" ]] || continue
    allowed["$service_id"]=true
  done < <(bash "$STACK_MANIFEST_HELPER" ci-zane-lane-service-ids --lane main)

  while IFS= read -r service_id; do
    [[ -n "$service_id" ]] || continue
    if [[ "${allowed[$service_id]:-false}" != "true" ]]; then
      invalid+=("$service_id")
    fi
  done < <(tr ',' '\n' <<<"$services_csv")

  if [[ "${#invalid[@]}" -gt 0 ]]; then
    ci::die "Explicit services are not deployable on the main lane: $(IFS=,; echo "${invalid[*]}")"
  fi
}

resolve_scope() {
  local scope_json

  SERVICES_CSV="$(normalize_csv "$SERVICES_CSV")"
  if [[ -n "$SERVICES_CSV" ]]; then
    validate_explicit_services "$SERVICES_CSV"
    jq -cn \
      --arg services_csv "$SERVICES_CSV" \
      '{
        mode: "explicit",
        base_sha: null,
        head_sha: null,
        projects_csv: "",
        services_csv: $services_csv,
        nx_status: "explicit"
      }'
    return
  fi

  [[ -n "$BASE_SHA" ]] || BASE_SHA="$(default_base_sha)"
  scope_json="$(
    BASE_SHA="$BASE_SHA" \
    HEAD_SHA="$HEAD_SHA" \
    bash "${ROOT_DIR}/scripts/ci/resolve-affected-services.sh"
  )"
  SERVICES_CSV="$(jq -r '.services_csv' <<<"$scope_json")"
  printf '%s\n' "$scope_json"
}

resolve_prepare() {
  local prepare_json

  prepare_json="$(
    bash "${ROOT_DIR}/scripts/ci/resolve-prepare-needs.sh" --lane main --services-csv "$SERVICES_CSV"
  )"
  printf '%s\n' "$prepare_json"
}

run_prepare_stage() {
  local requires_meili_keys="$1"
  local provision_output
  local backend_key=""
  local frontend_key=""
  local frontend_env_var=""
  local backend_created="false"
  local backend_updated="false"
  local frontend_created="false"
  local frontend_updated="false"

  (
    export REQUIRES_MEILI_KEYS="$requires_meili_keys"
    export MEILISEARCH_URL="$MEILISEARCH_URL"
    export MEILISEARCH_MASTER_KEY="$MEILISEARCH_MASTER_KEY"
    bash "${ROOT_DIR}/scripts/ci/check-workflow-inputs.sh" main-prepare
  ) >/dev/null

  if [[ "$requires_meili_keys" == "true" ]]; then
    provision_output="$(
      MEILISEARCH_URL="$MEILISEARCH_URL" \
      MEILISEARCH_MASTER_KEY="$MEILISEARCH_MASTER_KEY" \
      bash "${ROOT_DIR}/scripts/ci/provision-meili-keys.sh"
    )"

    backend_key="$(sed -n 's/^DC_MEILISEARCH_BACKEND_API_KEY=//p' <<<"$provision_output" | tail -n1)"
    frontend_key="$(sed -n 's/^DC_N1_NEXT_PUBLIC_MEILISEARCH_API_KEY=//p' <<<"$provision_output" | tail -n1)"
    frontend_env_var="$(sed -n 's/^frontend_env_var=//p' <<<"$provision_output" | tail -n1)"
    backend_created="$(sed -n 's/^backend_created=//p' <<<"$provision_output" | tail -n1)"
    backend_updated="$(sed -n 's/^backend_updated=//p' <<<"$provision_output" | tail -n1)"
    frontend_created="$(sed -n 's/^frontend_created=//p' <<<"$provision_output" | tail -n1)"
    frontend_updated="$(sed -n 's/^frontend_updated=//p' <<<"$provision_output" | tail -n1)"

    [[ -n "$backend_key" ]] || ci::die "Failed to parse backend Meili key from provision output."
    [[ -n "$frontend_key" ]] || ci::die "Failed to parse frontend Meili key from provision output."
    [[ -n "$frontend_env_var" ]] || ci::die "Failed to parse frontend Meili env var from provision output."

    (
      export MEILISEARCH_URL="$MEILISEARCH_URL"
      export MEILISEARCH_MASTER_KEY="$MEILISEARCH_MASTER_KEY"
      export MEILISEARCH_BACKEND_API_KEY="$backend_key"
      export NEXT_PUBLIC_MEILISEARCH_API_KEY="$frontend_key"
      bash "${ROOT_DIR}/scripts/ci/verify-meili-keys.sh"
    ) >/dev/null
  fi

  jq -cn \
    --argjson requires_meili_keys "$(jq -n --arg value "$requires_meili_keys" '$value == "true"')" \
    --arg meili_url "${MEILISEARCH_URL%/}" \
    --arg frontend_env_var "$frontend_env_var" \
    --argjson backend_created "$(jq -n --arg value "$backend_created" '$value == "true"')" \
    --argjson backend_updated "$(jq -n --arg value "$backend_updated" '$value == "true"')" \
    --argjson frontend_created "$(jq -n --arg value "$frontend_created" '$value == "true"')" \
    --argjson frontend_updated "$(jq -n --arg value "$frontend_updated" '$value == "true"')" \
    '{
      requires_meili_keys: $requires_meili_keys,
      meili_url: $meili_url,
      frontend_env_var: $frontend_env_var,
      backend_created: $backend_created,
      backend_updated: $backend_updated,
      frontend_created: $frontend_created,
      frontend_updated: $frontend_updated
    }'
}

run_deploy_stage() {
  local deploy_json

  (
    export ZANE_OPERATOR_BASE_URL="$ZANE_OPERATOR_BASE_URL"
    export ZANE_OPERATOR_API_TOKEN="$ZANE_OPERATOR_API_TOKEN"
    export ZANE_CANONICAL_PROJECT_SLUG="$PROJECT_SLUG"
    export ZANE_PRODUCTION_ENVIRONMENT_NAME="$ENVIRONMENT_NAME"
    bash "${ROOT_DIR}/scripts/ci/check-workflow-inputs.sh" main-deploy
  ) >/dev/null

  deploy_json="$(
    bash "${ROOT_DIR}/scripts/ci/zane-deploy.sh" run-main \
      --project-slug "$PROJECT_SLUG" \
      --environment-name "$ENVIRONMENT_NAME" \
      --services-csv "$SERVICES_CSV" \
      --meili-url "$MEILISEARCH_URL" \
      --meili-master-key "$MEILISEARCH_MASTER_KEY" \
      --base-url "$ZANE_OPERATOR_BASE_URL" \
      --api-token "$ZANE_OPERATOR_API_TOKEN"
  )"
  printf '%s\n' "$deploy_json"
}

run_verify_stage() {
  local deploy_json="$1"
  local verify_json

  (
    export ZANE_OPERATOR_BASE_URL="$ZANE_OPERATOR_BASE_URL"
    export ZANE_OPERATOR_API_TOKEN="$ZANE_OPERATOR_API_TOKEN"
    export ZANE_CANONICAL_PROJECT_SLUG="$PROJECT_SLUG"
    export ZANE_PRODUCTION_ENVIRONMENT_NAME="$ENVIRONMENT_NAME"
    bash "${ROOT_DIR}/scripts/ci/check-workflow-inputs.sh" main-verify
  ) >/dev/null

  verify_json="$(
    bash "${ROOT_DIR}/scripts/ci/zane-deploy.sh" verify \
      --lane main \
      --project-slug "$PROJECT_SLUG" \
      --environment-name "$(jq -r '.environment_name' <<<"$deploy_json")" \
      --requested-services-csv "$(jq -r '.requested_services_csv' <<<"$deploy_json")" \
      --deploy-services-csv "$(jq -r '.deploy_services_csv' <<<"$deploy_json")" \
      --triggered-services-csv "$(jq -r '.triggered_services_csv' <<<"$deploy_json")" \
      --base-url "$ZANE_OPERATOR_BASE_URL" \
      --api-token "$ZANE_OPERATOR_API_TOKEN"
  )"
  printf '%s\n' "$verify_json"
}

main() {
  local scope_json
  local prepare_needs_json
  local prepare_json
  local deploy_json
  local verify_json='{}'
  local requires_meili_keys

  parse_args "$@"
  load_env_file
  require_tools
  derive_defaults

  scope_json="$(resolve_scope)"
  SERVICES_CSV="$(jq -r '.services_csv' <<<"$scope_json")"

  if [[ -z "$SERVICES_CSV" ]]; then
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

  prepare_needs_json="$(resolve_prepare)"
  requires_meili_keys="$(jq -r '.requires_meili_keys' <<<"$prepare_needs_json")"
  prepare_json="$(run_prepare_stage "$requires_meili_keys")"
  if ! deploy_json="$(run_deploy_stage)"; then
    exit 1
  fi

  if [[ "$SKIP_VERIFY" == "false" ]]; then
    if ! verify_json="$(run_verify_stage "$deploy_json")"; then
      exit 1
    fi
  fi

  jq -cn \
    --arg project_slug "$PROJECT_SLUG" \
    --arg environment_name "$ENVIRONMENT_NAME" \
    --arg operator_base_url "$ZANE_OPERATOR_BASE_URL" \
    --arg meili_url "$MEILISEARCH_URL" \
    --argjson scope "$scope_json" \
    --argjson prepare_needs "$prepare_needs_json" \
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
      prepare: $prepare,
      deploy: $deploy,
      verify: $verify,
      skipped_verify: $skipped_verify
    }'
}

main "$@"
