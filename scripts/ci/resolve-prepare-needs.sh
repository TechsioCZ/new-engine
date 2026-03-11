#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STACK_MANIFEST_PATH="${STACK_MANIFEST_PATH:-${ROOT_DIR}/config/stack-manifest.yaml}"
# shellcheck source=scripts/ci/lib.sh
source "${ROOT_DIR}/scripts/ci/lib.sh"
# shellcheck source=scripts/lib/stack-manifest.sh
source "${ROOT_DIR}/scripts/lib/stack-manifest.sh"

usage() {
  cat <<'EOF'
Usage:
  scripts/ci/resolve-prepare-needs.sh --lane <preview|main> --services-csv <csv>

Outputs:
  - should_prepare
  - requires_preview_db
  - requires_meili_keys
  - preview_db_service_ids
  - meili_key_service_ids

Behavior:
  - Resolves prepare-stage requirements from config/stack-manifest.yaml
  - Writes outputs to $GITHUB_OUTPUT when available
  - Prints a compact JSON summary to stdout
EOF
}

services_csv=""
lane="preview"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --lane)
      lane="${2-}"
      shift 2
      ;;
    --services-csv)
      services_csv="${2-}"
      shift 2
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

MANIFEST_PATH="$STACK_MANIFEST_PATH"
manifest_exists
manifest_require_parser

case "$lane" in
  preview|main) ;;
  *)
    ci::die "Lane must be preview or main."
    ;;
esac

preview_db_service_ids=""
meili_key_service_ids=""

contains_service() {
  local needle="$1"
  local haystack_csv="$2"

  [[ -n "$needle" ]] || return 1
  [[ -n "$haystack_csv" ]] || return 1

  case ",${haystack_csv}," in
    *,"${needle}",*)
      return 0
      ;;
  esac

  return 1
}

while IFS= read -r service_id; do
  [[ -n "$service_id" ]] || continue
  if contains_service "$service_id" "$services_csv"; then
    if [[ -n "$preview_db_service_ids" ]]; then
      preview_db_service_ids+=",${service_id}"
    else
      preview_db_service_ids="${service_id}"
    fi
  fi
done < <(ci_prepare_service_ids preview_db)

if [[ "$lane" == "main" ]]; then
  preview_db_service_ids=""
fi

while IFS= read -r service_id; do
  [[ -n "$service_id" ]] || continue
  if contains_service "$service_id" "$services_csv"; then
    if [[ -n "$meili_key_service_ids" ]]; then
      meili_key_service_ids+=",${service_id}"
    else
      meili_key_service_ids="${service_id}"
    fi
  fi
done < <(ci_prepare_service_ids meili_keys)

requires_preview_db="false"
requires_meili_keys="false"

[[ -n "$preview_db_service_ids" ]] && requires_preview_db="true"
[[ -n "$meili_key_service_ids" ]] && requires_meili_keys="true"

should_prepare="false"
if [[ "$requires_preview_db" == "true" || "$requires_meili_keys" == "true" ]]; then
  should_prepare="true"
fi

ci::gha_output should_prepare "$should_prepare"
ci::gha_output requires_preview_db "$requires_preview_db"
ci::gha_output requires_meili_keys "$requires_meili_keys"
ci::gha_output preview_db_service_ids "$preview_db_service_ids"
ci::gha_output meili_key_service_ids "$meili_key_service_ids"

jq -cn \
  --arg services_csv "$services_csv" \
  --arg should_prepare "$should_prepare" \
  --arg requires_preview_db "$requires_preview_db" \
  --arg requires_meili_keys "$requires_meili_keys" \
  --arg preview_db_service_ids "$preview_db_service_ids" \
  --arg meili_key_service_ids "$meili_key_service_ids" \
  '{
    services_csv: $services_csv,
    should_prepare: ($should_prepare == "true"),
    requires_preview_db: ($requires_preview_db == "true"),
    requires_meili_keys: ($requires_meili_keys == "true"),
    preview_db_service_ids: ($preview_db_service_ids | if . == "" then [] else split(",") end),
    meili_key_service_ids: ($meili_key_service_ids | if . == "" then [] else split(",") end)
  }'
