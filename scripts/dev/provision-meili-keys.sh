#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=scripts/dev/lib/common.sh
source "${ROOT_DIR}/scripts/dev/lib/common.sh"

usage() {
  cat <<'EOF'
Usage: scripts/dev/provision-meili-keys.sh [options]

Thin helper around `apps/new-engine-ctl prepare --lane main --requires-meili-keys`.

Options:
  --meili-url <url>             Meilisearch base URL
  --master-key <key>            Meilisearch master key
  --wait-seconds <n>            Health wait timeout (default: 60)
  --timeout-seconds <n>         Request timeout (default: 20)
  --retry-count <n>             Retry count (default: 3)
  --retry-delay-seconds <n>     Retry delay (default: 2)
  --dry-run                     Skip network calls and emit deterministic output
  -h, --help                    Show this help

Env fallbacks:
  MEILISEARCH_URL
  MEILISEARCH_MASTER_KEY or DC_MEILISEARCH_MASTER_KEY
EOF
}

common::require_command pnpm
common::require_command jq
common::require_command node
common::require_command sed

meili_url="${MEILISEARCH_URL:-http://127.0.0.1:7700}"
master_key="${MEILISEARCH_MASTER_KEY:-${DC_MEILISEARCH_MASTER_KEY:-}}"
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
[[ "$wait_seconds" =~ ^[0-9]+$ ]] || common::die "--wait-seconds must be an integer."
[[ "$timeout_seconds" =~ ^[0-9]+$ ]] || common::die "--timeout-seconds must be an integer."
[[ "$retry_count" =~ ^[0-9]+$ ]] || common::die "--retry-count must be an integer."
[[ "$retry_delay_seconds" =~ ^[0-9]+$ ]] || common::die "--retry-delay-seconds must be an integer."

temp_output="$(mktemp)"
trap 'rm -f "$temp_output"' EXIT
caller_github_output="${GITHUB_OUTPUT:-}"

prepare_args=(
  --lane main
  --requires-meili-keys
  --meili-url "$meili_url"
  --meili-master-key "$master_key"
  --meili-wait-seconds "$wait_seconds"
  --timeout-seconds "$timeout_seconds"
  --retry-count "$retry_count"
  --retry-delay-seconds "$retry_delay_seconds"
)

if [[ "$dry_run" == "true" ]]; then
  prepare_args+=(--dry-run)
fi

(
  cd "$ROOT_DIR/apps/new-engine-ctl"
  pnpm run build >/dev/null
)

prepare_json="$(
  cd "$ROOT_DIR" &&
    GITHUB_OUTPUT="$temp_output" \
    node apps/new-engine-ctl/dist/cli.js prepare "${prepare_args[@]}"
)"

if [[ -n "$caller_github_output" ]]; then
  cat "$temp_output" >>"$caller_github_output"
fi

read_output() {
  local key="$1"
  sed -n "s/^${key}=//p" "$temp_output" | tail -n1
}

backend_key="$(read_output meili_backend_key)"
frontend_key="$(read_output meili_frontend_key)"
backend_env_var="$(read_output meili_backend_env_var)"
frontend_env_var="$(read_output meili_frontend_env_var)"
backend_uid="$(read_output meili_backend_uid)"
frontend_uid="$(read_output meili_frontend_uid)"
backend_created="$(read_output meili_backend_created)"
frontend_created="$(read_output meili_frontend_created)"
backend_updated="$(read_output meili_backend_updated)"
frontend_updated="$(read_output meili_frontend_updated)"

[[ -n "$backend_key" ]] || common::die "Failed to resolve backend key from CLI prepare outputs."
[[ -n "$frontend_key" ]] || common::die "Failed to resolve frontend key from CLI prepare outputs."

printf '%s\n' "$prepare_json" | jq -e . >/dev/null 2>&1 || common::die "CLI prepare did not return valid JSON."
meili_url_json="$(printf '%s\n' "$prepare_json" | jq -r '.meili_url // empty')"

printf 'meili_url=%s\n' "$meili_url_json"
printf 'backend_env_var=%s\n' "$backend_env_var"
printf 'frontend_env_var=%s\n' "$frontend_env_var"
printf 'backend_uid=%s\n' "$backend_uid"
printf 'frontend_uid=%s\n' "$frontend_uid"
printf 'backend_created=%s\n' "$backend_created"
printf 'frontend_created=%s\n' "$frontend_created"
printf 'backend_updated=%s\n' "$backend_updated"
printf 'frontend_updated=%s\n' "$frontend_updated"
printf '%s=%s\n' "$backend_env_var" "$backend_key"
printf '%s=%s\n' "$frontend_env_var" "$frontend_key"
