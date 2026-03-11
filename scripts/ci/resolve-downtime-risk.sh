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
  scripts/ci/resolve-downtime-risk.sh --lane <preview|main> --services-csv <csv>

Outputs:
  - requires_downtime_approval
  - downtime_service_ids

Behavior:
  - Resolves one-shot downtime approval risk from config/stack-manifest.yaml
  - Writes outputs to $GITHUB_OUTPUT when available
  - Prints a compact JSON summary to stdout
EOF
}

services_csv=""
lane="main"

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

downtime_service_ids=""

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
    if [[ -n "$downtime_service_ids" ]]; then
      downtime_service_ids+=",${service_id}"
    else
      downtime_service_ids="${service_id}"
    fi
  fi
done < <(ci_zane_downtime_risk_service_ids "$lane")

requires_downtime_approval="false"
[[ -n "$downtime_service_ids" ]] && requires_downtime_approval="true"

ci::gha_output requires_downtime_approval "$requires_downtime_approval"
ci::gha_output downtime_service_ids "$downtime_service_ids"

jq -cn \
  --arg lane "$lane" \
  --arg services_csv "$services_csv" \
  --arg requires_downtime_approval "$requires_downtime_approval" \
  --arg downtime_service_ids "$downtime_service_ids" \
  '{
    lane: $lane,
    services_csv: $services_csv,
    requires_downtime_approval: ($requires_downtime_approval == "true"),
    downtime_service_ids: ($downtime_service_ids | if . == "" then [] else split(",") end)
  }'
