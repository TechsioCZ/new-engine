#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=scripts/ci/lib.sh
source "${ROOT_DIR}/scripts/ci/lib.sh"

usage() {
  cat <<'EOF'
Usage:
  scripts/ci/check-workflow-inputs.sh <mode>

Modes:
  preview-prepare
  main-prepare
  preview-deploy
  main-deploy
  preview-verify
  main-verify
  preview-teardown

Behavior:
  - fails fast when required workflow env vars are missing
  - masks secret env values in GitHub Actions logs before downstream steps run
EOF
}

require_zane_project_slug() {
  ci::require_env ZANE_CANONICAL_PROJECT_SLUG "canonical Zane project slug"
  ci::mask_env_if_present ZANE_CANONICAL_PROJECT_SLUG
}

mode="${1:-}"
[[ -n "$mode" ]] || {
  usage >&2
  exit 1
}

case "$mode" in
  preview-prepare)
    if [[ "${REQUIRES_PREVIEW_DB:-false}" == "true" ]]; then
      ci::require_env ZANE_OPERATOR_BASE_URL "preview DB operator base URL"
      ci::require_env ZANE_OPERATOR_API_TOKEN "preview DB operator API token"
      ci::mask_env_if_present ZANE_OPERATOR_BASE_URL
      ci::mask_env_if_present ZANE_OPERATOR_API_TOKEN
    fi
    ;;
  main-prepare)
    if [[ "${REQUIRES_MEILI_KEYS:-false}" == "true" ]]; then
      ci::require_env MEILISEARCH_URL "Meilisearch base URL"
      ci::require_env MEILISEARCH_MASTER_KEY "Meilisearch master key"
      ci::mask_env_if_present MEILISEARCH_URL
      ci::mask_env_if_present MEILISEARCH_MASTER_KEY
    fi
    ;;
  preview-deploy|preview-verify)
    ci::require_env ZANE_OPERATOR_BASE_URL "Zane operator base URL"
    ci::require_env ZANE_OPERATOR_API_TOKEN "Zane operator API token"
    require_zane_project_slug
    ci::mask_env_if_present ZANE_OPERATOR_BASE_URL
    ci::mask_env_if_present ZANE_OPERATOR_API_TOKEN
    ci::mask_env_if_present PREVIEW_DB_PASSWORD
    ci::mask_env_if_present PREVIEW_RANDOM_ONCE_SECRETS_JSON
    ci::mask_env_if_present MEILI_BACKEND_KEY
    ci::mask_env_if_present MEILI_FRONTEND_KEY
    ;;
  main-deploy|main-verify)
    ci::require_env ZANE_OPERATOR_BASE_URL "Zane operator base URL"
    ci::require_env ZANE_OPERATOR_API_TOKEN "Zane operator API token"
    require_zane_project_slug
    ci::require_env ZANE_PRODUCTION_ENVIRONMENT_NAME "production Zane environment name"
    ci::mask_env_if_present ZANE_OPERATOR_BASE_URL
    ci::mask_env_if_present ZANE_OPERATOR_API_TOKEN
    ci::mask_env_if_present ZANE_PRODUCTION_ENVIRONMENT_NAME
    ci::mask_env_if_present MEILI_BACKEND_KEY
    ci::mask_env_if_present MEILI_FRONTEND_KEY
    ci::mask_env_if_present MEILISEARCH_URL
    ci::mask_env_if_present MEILISEARCH_MASTER_KEY
    ;;
  preview-teardown)
    ci::require_env ZANE_OPERATOR_BASE_URL "preview DB operator base URL"
    ci::require_env ZANE_OPERATOR_API_TOKEN "preview DB operator API token"
    require_zane_project_slug
    ci::mask_env_if_present ZANE_OPERATOR_BASE_URL
    ci::mask_env_if_present ZANE_OPERATOR_API_TOKEN
    ;;
  -h|--help|help)
    usage
    exit 0
    ;;
  *)
    usage >&2
    ci::die "Unknown mode: ${mode}"
    ;;
esac

echo "result=ok"
