#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=scripts/ci/lib.sh
source "${ROOT_DIR}/scripts/ci/lib.sh"

usage() {
  cat <<'EOF'
Usage:
  scripts/ci/preview-environment.sh delete <pr-number> [options]

Options:
  --project-slug <slug>   Zane canonical project slug (default: $ZANE_CANONICAL_PROJECT_SLUG)
  --base-url <url>        zane-operator base URL (default: $ZANE_OPERATOR_BASE_URL)
  --api-token <token>     zane-operator bearer token (default: $ZANE_OPERATOR_API_TOKEN)
  --env-prefix <prefix>   preview environment name prefix (default: $ZANE_PREVIEW_ENV_PREFIX or pr-)
  --timeout <seconds>     request timeout per attempt (default: 20)
  --retries <count>       curl retry count for transport errors (default: 3)
  --retry-delay <secs>    delay between curl retries (default: 2)
  -h, --help              Show this help

Behavior:
  - Derives preview environment name from PR number in CI script space
  - Writes structured outputs to $GITHUB_OUTPUT when available
  - Prints a compact JSON response body to stdout on success
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
  delete)
    ;;
  -h|--help)
    usage
    exit 0
    ;;
  *)
    usage >&2
    ci::die "Unsupported operation: $operation"
    ;;
esac

pr_number="$1"
shift

if [[ ! "$pr_number" =~ ^[0-9]+$ ]]; then
  ci::die "PR number must be numeric."
fi

project_slug="${ZANE_CANONICAL_PROJECT_SLUG:-}"
base_url="${ZANE_OPERATOR_BASE_URL:-}"
api_token="${ZANE_OPERATOR_API_TOKEN:-}"
env_prefix="${ZANE_PREVIEW_ENV_PREFIX:-pr-}"
timeout_seconds="${PREVIEW_ENV_TIMEOUT_SECONDS:-20}"
retry_count="${PREVIEW_ENV_RETRY_COUNT:-3}"
retry_delay="${PREVIEW_ENV_RETRY_DELAY_SECONDS:-2}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-slug)
      project_slug="${2-}"
      shift 2
      ;;
    --base-url)
      base_url="${2-}"
      shift 2
      ;;
    --api-token)
      api_token="${2-}"
      shift 2
      ;;
    --env-prefix)
      env_prefix="${2-}"
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

[[ -n "$project_slug" ]] || ci::die "canonical project slug is required (use --project-slug or ZANE_CANONICAL_PROJECT_SLUG)."
[[ -n "$base_url" ]] || ci::die "zane-operator base URL is required (use --base-url or ZANE_OPERATOR_BASE_URL)."
[[ -n "$api_token" ]] || ci::die "zane-operator API token is required (use --api-token or ZANE_OPERATOR_API_TOKEN)."
[[ "$timeout_seconds" =~ ^[0-9]+$ ]] || ci::die "--timeout must be an integer."
[[ "$retry_count" =~ ^[0-9]+$ ]] || ci::die "--retries must be an integer."
[[ "$retry_delay" =~ ^[0-9]+$ ]] || ci::die "--retry-delay must be an integer."

environment_name="${env_prefix}${pr_number}"
base_url="${base_url%/}"
tmp_body="$(mktemp)"
trap 'rm -f "$tmp_body"' EXIT

payload="$(jq -cn \
  --arg project_slug "$project_slug" \
  --arg environment_name "$environment_name" \
  '{project_slug:$project_slug, environment_name:$environment_name}')"

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
  -H 'Content-Type: application/json'
  -X POST
  --data "$payload"
)

http_code="$(curl "${curl_args[@]}" "${base_url}/v1/zane/environments/archive")" || {
  status=$?
  ci::die "zane-operator environment teardown request failed before receiving a successful HTTP response (curl exit ${status})."
}

if ! jq -e . >/dev/null 2>&1 <"$tmp_body"; then
  ci::die "zane-operator returned non-JSON response (HTTP ${http_code})."
fi

body_json="$(jq -c . <"$tmp_body")"

ci::gha_output http_code "$http_code"
ci::gha_output operation "$operation"

if [[ "$http_code" -lt 200 || "$http_code" -ge 300 ]]; then
  status_value="$(jq -r '.error // .status // "http_error"' <"$tmp_body")"
  ci::gha_output status "$status_value"
  ci::die "zane-operator environment teardown returned HTTP ${http_code}: ${body_json}"
fi

ci::gha_output deleted "$(jq -r '.deleted // false' <"$tmp_body")"
ci::gha_output environment_name "$(jq -r '.environment_name // empty' <"$tmp_body")"
ci::gha_output noop "$(jq -r '.noop // false' <"$tmp_body")"
ci::gha_output noop_reason "$(jq -r '.noop_reason // empty' <"$tmp_body")"
ci::gha_output status "success"

printf '%s\n' "$body_json"
