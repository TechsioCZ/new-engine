#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=scripts/ci/lib.sh
source "${ROOT_DIR}/scripts/ci/lib.sh"

usage() {
  cat <<'EOF'
Usage:
  scripts/ci/preview-db.sh ensure <pr-number> [options]
  scripts/ci/preview-db.sh delete <pr-number> [options]

Options:
  --base-url <url>       zane-operator base URL (default: $ZANE_OPERATOR_BASE_URL)
  --api-token <token>    zane-operator bearer token (default: $ZANE_OPERATOR_API_TOKEN)
  --timeout <seconds>    request timeout per attempt (default: 20)
  --retries <count>      curl retry count for transport errors (default: 3)
  --retry-delay <secs>   delay between curl retries (default: 2)
  -h, --help             Show this help

Behavior:
  - Writes structured outputs to $GITHUB_OUTPUT when available
  - Prints a compact redacted JSON response body to stdout on success
EOF
}

ci::require_command curl
ci::require_command jq

if [[ $# -lt 2 ]]; then
  usage
  exit 1
fi

operation="$1"
shift

case "$operation" in
  ensure|delete)
    ;;
  -h|--help)
    usage
    exit 0
    ;;
  *)
    usage
    ci::die "Unsupported operation: $operation"
    ;;
esac

pr_number="$1"
shift

if [[ ! "$pr_number" =~ ^[0-9]+$ ]]; then
  ci::die "PR number must be numeric."
fi

base_url="${ZANE_OPERATOR_BASE_URL:-}"
api_token="${ZANE_OPERATOR_API_TOKEN:-}"
timeout_seconds="${PREVIEW_DB_TIMEOUT_SECONDS:-20}"
retry_count="${PREVIEW_DB_RETRY_COUNT:-3}"
retry_delay="${PREVIEW_DB_RETRY_DELAY_SECONDS:-2}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base-url)
      base_url="${2-}"
      shift 2
      ;;
    --api-token)
      api_token="${2-}"
      shift 2
      ;;
    --timeout)
      timeout_seconds="${2-}"
      shift 2
      ;;
    --retries)
      retry_count="${2-}"
      shift 2
      ;;
    --retry-delay)
      retry_delay="${2-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      usage
      ci::die "Unknown argument: $1"
      ;;
  esac
done

[[ -n "$base_url" ]] || ci::die "zane-operator base URL is required (use --base-url or ZANE_OPERATOR_BASE_URL)."
[[ -n "$api_token" ]] || ci::die "zane-operator API token is required (use --api-token or ZANE_OPERATOR_API_TOKEN)."
[[ "$timeout_seconds" =~ ^[0-9]+$ ]] || ci::die "--timeout must be an integer."
[[ "$retry_count" =~ ^[0-9]+$ ]] || ci::die "--retries must be an integer."
[[ "$retry_delay" =~ ^[0-9]+$ ]] || ci::die "--retry-delay must be an integer."

base_url="${base_url%/}"
tmp_body="$(mktemp)"
trap 'rm -f "$tmp_body"' EXIT

endpoint=""
method=""
payload=""

if [[ "$operation" == "ensure" ]]; then
  endpoint="${base_url}/v1/preview-db/ensure"
  method="POST"
  payload="$(jq -cn --argjson pr_number "$pr_number" '{pr_number:$pr_number}')"
else
  endpoint="${base_url}/v1/preview-db/${pr_number}"
  method="DELETE"
fi

curl_args=(
  --silent
  --show-error
  --output "$tmp_body"
  --write-out '%{http_code}'
  --retry "$retry_count"
  --retry-all-errors
  --retry-delay "$retry_delay"
  --connect-timeout "$timeout_seconds"
  --max-time "$timeout_seconds"
  -H "Authorization: Bearer ${api_token}"
  -H 'Accept: application/json'
  -X "$method"
)

if [[ "$operation" == "ensure" ]]; then
  curl_args+=(-H 'Content-Type: application/json' --data "$payload")
fi

http_code="$(curl "${curl_args[@]}" "$endpoint")" || {
  status=$?
  ci::die "zane-operator ${operation} request failed before receiving a successful HTTP response (curl exit ${status})."
}

if ! jq -e . >/dev/null 2>&1 <"$tmp_body"; then
  ci::die "zane-operator returned non-JSON response (HTTP ${http_code})."
fi

body_json="$(jq -c . <"$tmp_body")"
safe_body_json="$(jq -c 'if has("app_password") then .app_password = "***redacted***" else . end' <"$tmp_body")"

ci::gha_output http_code "$http_code"
ci::gha_output operation "$operation"

if [[ "$http_code" -lt 200 || "$http_code" -ge 300 ]]; then
  status_value="$(jq -r '.error // .status // "http_error"' <"$tmp_body")"
  ci::gha_output status "$status_value"
  ci::die "zane-operator ${operation} returned HTTP ${http_code}: ${safe_body_json}"
fi

if [[ "$operation" == "ensure" ]]; then
  app_password="$(jq -r '.app_password // empty' <"$tmp_body")"
  ci::gha_mask "$app_password"
  ci::gha_output created "$(jq -r '.created // false' <"$tmp_body")"
  ci::gha_output db_name "$(jq -r '.db_name // empty' <"$tmp_body")"
  ci::gha_output app_user "$(jq -r '.app_user // empty' <"$tmp_body")"
  ci::gha_output app_password "$app_password"
else
  ci::gha_output deleted "$(jq -r '.deleted // false' <"$tmp_body")"
  ci::gha_output db_name "$(jq -r '.db_name // empty' <"$tmp_body")"
  ci::gha_output app_user "$(jq -r '.app_user // empty' <"$tmp_body")"
  ci::gha_output role_deleted "$(jq -r '.role_deleted // false' <"$tmp_body")"
  ci::gha_output dev_grants_cleaned "$(jq -r '.dev_grants_cleaned // false' <"$tmp_body")"
  ci::gha_output noop "$(jq -r '.noop // false' <"$tmp_body")"
  ci::gha_output noop_reason "$(jq -r '.noop_reason // empty' <"$tmp_body")"
fi

ci::gha_output status "success"

printf '%s\n' "$safe_body_json"
