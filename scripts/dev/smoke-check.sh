#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=scripts/dev/lib/common.sh
source "${ROOT_DIR}/scripts/dev/lib/common.sh"

usage() {
  cat <<'EOF'
Usage:
  scripts/dev/smoke-check.sh --url <url> [options]

Options:
  --url <url>             target URL to probe
  --retries <count>       number of attempts before failure (default: 10)
  --delay <seconds>       sleep between attempts (default: 5)
  --timeout <seconds>     per-request timeout (default: 10)
  --expect-status <code>  expected HTTP status code (default: 200)
  -h, --help              Show this help

Behavior:
  - Writes attempts/status/url to $GITHUB_OUTPUT when available
  - Prints a compact JSON success summary to stdout
EOF
}

common::require_command curl
common::require_command jq

url=""
retries=10
delay_seconds=5
timeout_seconds=10
expect_status=200

while [[ $# -gt 0 ]]; do
  case "$1" in
    --url)
      url="${2-}"
      shift 2
      ;;
    --retries)
      retries="${2-}"
      shift 2
      ;;
    --delay)
      delay_seconds="${2-}"
      shift 2
      ;;
    --timeout)
      timeout_seconds="${2-}"
      shift 2
      ;;
    --expect-status)
      expect_status="${2-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      usage
      common::die "Unknown argument: $1"
      ;;
  esac
done

[[ -n "$url" ]] || common::die "Target URL is required (use --url)."
[[ "$retries" =~ ^[0-9]+$ ]] || common::die "--retries must be an integer."
[[ "$delay_seconds" =~ ^[0-9]+$ ]] || common::die "--delay must be an integer."
[[ "$timeout_seconds" =~ ^[0-9]+$ ]] || common::die "--timeout must be an integer."
[[ "$expect_status" =~ ^[0-9]+$ ]] || common::die "--expect-status must be an integer."

attempt=1
last_status="000"

while (( attempt <= retries )); do
  set +e
  last_status="$(
    curl \
      --silent \
      --show-error \
      --output /dev/null \
      --write-out '%{http_code}' \
      --connect-timeout "$timeout_seconds" \
      --max-time "$timeout_seconds" \
      "$url"
  )"
  curl_status=$?
  set -e

  if [[ "$curl_status" -eq 0 && "$last_status" == "$expect_status" ]]; then
    common::gha_output url "$url"
    common::gha_output attempts "$attempt"
    common::gha_output status "$last_status"
    jq -cn \
      --arg url "$url" \
      --argjson attempts "$attempt" \
      --arg status "$last_status" \
      '{url:$url, attempts:$attempts, status:$status}'
    exit 0
  fi

  if (( attempt < retries )); then
    sleep "$delay_seconds"
  fi

  attempt=$((attempt + 1))
done

common::gha_output url "$url"
common::gha_output attempts "$retries"
common::gha_output status "$last_status"
common::die "Smoke check failed for ${url}: expected HTTP ${expect_status}, last status ${last_status} after ${retries} attempts."
