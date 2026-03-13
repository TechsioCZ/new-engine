#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=scripts/dev/lib/common.sh
source "${ROOT_DIR}/scripts/dev/lib/common.sh"

usage() {
  cat <<'EOF'
Usage: scripts/dev/verify-meili-keys.sh [options]

Thin helper that checks provided key values against the active CLI-managed Meilisearch contract.

Options:
  --meili-url <url>             Meilisearch base URL
  --master-key <key>            Meilisearch master key
  --backend-key <key>           Backend key value to verify
  --frontend-key <key>          Frontend key value to verify
  --wait-seconds <n>            Health wait timeout (default: 60)
  --timeout-seconds <n>         Request timeout (default: 20)
  --retry-count <n>             Retry count (default: 3)
  --retry-delay-seconds <n>     Retry delay (default: 2)
  --dry-run                     Skip network calls and emit deterministic output
  -h, --help                    Show this help

Env fallbacks:
  MEILISEARCH_URL
  MEILISEARCH_MASTER_KEY or DC_MEILISEARCH_MASTER_KEY
  MEILISEARCH_BACKEND_API_KEY or DC_MEILISEARCH_BACKEND_API_KEY
  NEXT_PUBLIC_MEILISEARCH_API_KEY or DC_N1_NEXT_PUBLIC_MEILISEARCH_API_KEY
EOF
}

common::require_command bash
common::require_command awk
common::require_command sed

meili_url="${MEILISEARCH_URL:-http://127.0.0.1:7700}"
master_key="${MEILISEARCH_MASTER_KEY:-${DC_MEILISEARCH_MASTER_KEY:-}}"
backend_key="${MEILISEARCH_BACKEND_API_KEY:-${DC_MEILISEARCH_BACKEND_API_KEY:-}}"
frontend_key="${NEXT_PUBLIC_MEILISEARCH_API_KEY:-${DC_N1_NEXT_PUBLIC_MEILISEARCH_API_KEY:-}}"
wait_seconds="60"
timeout_seconds="20"
retry_count="3"
retry_delay_seconds="2"
dry_run="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --meili-url)
      meili_url="${2:-}"
      shift 2
      ;;
    --master-key)
      master_key="${2:-}"
      shift 2
      ;;
    --backend-key)
      backend_key="${2:-}"
      shift 2
      ;;
    --frontend-key)
      frontend_key="${2:-}"
      shift 2
      ;;
    --wait-seconds)
      wait_seconds="${2:-}"
      shift 2
      ;;
    --timeout-seconds)
      timeout_seconds="${2:-}"
      shift 2
      ;;
    --retry-count)
      retry_count="${2:-}"
      shift 2
      ;;
    --retry-delay-seconds)
      retry_delay_seconds="${2:-}"
      shift 2
      ;;
    --dry-run)
      dry_run="true"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      usage >&2
      common::die "Unknown argument: $1"
      ;;
  esac
done

[[ -n "$meili_url" ]] || common::die "Meilisearch URL is required."
[[ -n "$master_key" ]] || common::die "Meilisearch master key is required."
[[ -n "$backend_key" ]] || common::die "Backend key is required."
[[ -n "$frontend_key" ]] || common::die "Frontend key is required."

provision_args=(
  --meili-url "$meili_url"
  --master-key "$master_key"
  --wait-seconds "$wait_seconds"
  --timeout-seconds "$timeout_seconds"
  --retry-count "$retry_count"
  --retry-delay-seconds "$retry_delay_seconds"
)

if [[ "$dry_run" == "true" ]]; then
  provision_args+=(--dry-run)
fi

provision_output="$(bash "$ROOT_DIR/scripts/dev/provision-meili-keys.sh" "${provision_args[@]}")"

read_output_value() {
  local output="$1"
  local key="$2"

  printf '%s\n' "$output" | awk -F= -v expected_key="$key" '$1 == expected_key {print substr($0, length($1) + 2)}' | tail -n1
}

backend_env_var="$(read_output_value "$provision_output" "backend_env_var")"
frontend_env_var="$(read_output_value "$provision_output" "frontend_env_var")"
actual_backend_key="$(read_output_value "$provision_output" "$backend_env_var")"
actual_frontend_key="$(read_output_value "$provision_output" "$frontend_env_var")"
backend_uid="$(printf '%s\n' "$provision_output" | sed -n 's/^backend_uid=//p' | tail -n1)"
frontend_uid="$(printf '%s\n' "$provision_output" | sed -n 's/^frontend_uid=//p' | tail -n1)"
meili_url_out="$(printf '%s\n' "$provision_output" | sed -n 's/^meili_url=//p' | tail -n1)"

[[ -n "$backend_env_var" ]] || common::die "Provision helper did not emit backend env var metadata."
[[ -n "$frontend_env_var" ]] || common::die "Provision helper did not emit frontend env var metadata."
[[ "$actual_backend_key" == "$backend_key" ]] || common::die "Provided backend key does not match the active CLI-managed contract."
[[ "$actual_frontend_key" == "$frontend_key" ]] || common::die "Provided frontend key does not match the active CLI-managed contract."

printf 'meili_url=%s\n' "$meili_url_out"
printf 'backend_uid=%s\n' "$backend_uid"
printf 'frontend_uid=%s\n' "$frontend_uid"
printf 'result=ok\n'
