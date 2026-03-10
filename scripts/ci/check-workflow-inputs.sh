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
  preview-teardown

Behavior:
  - fails fast when required workflow env vars are missing
  - masks secret env values in GitHub Actions logs before downstream steps run
EOF
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

    if [[ "${REQUIRES_MEILI_KEYS:-false}" == "true" ]]; then
      ci::require_env MEILISEARCH_URL "Meilisearch base URL"
      ci::require_env MEILISEARCH_MASTER_KEY "Meilisearch master key"
      ci::mask_env_if_present MEILISEARCH_URL
      ci::mask_env_if_present MEILISEARCH_MASTER_KEY
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
  preview-teardown)
    ci::require_env ZANE_OPERATOR_BASE_URL "preview DB operator base URL"
    ci::require_env ZANE_OPERATOR_API_TOKEN "preview DB operator API token"
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
