#!/usr/bin/env bash
set -euo pipefail

command -v jq >/dev/null 2>&1 || {
  echo "jq is required for scripts/ci/redeploy-preview-services.sh" >&2
  exit 1
}

pr_number=""
commit_sha=""
services_csv=""
repository_url=""
webhook_url=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --pr-number)
      pr_number="${2:-}"
      shift 2
      ;;
    --commit-sha)
      commit_sha="${2:-}"
      shift 2
      ;;
    --services-csv)
      services_csv="${2:-}"
      shift 2
      ;;
    --repository-url)
      repository_url="${2:-}"
      shift 2
      ;;
    --webhook-url)
      webhook_url="${2:-}"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$pr_number" || -z "$repository_url" ]]; then
  echo "Usage: $0 --pr-number <number> --repository-url <url> [--commit-sha <sha>] [--services-csv <a,b>] [--webhook-url <url>]" >&2
  exit 1
fi

if [[ -z "$webhook_url" ]]; then
  webhook_url="${ZANE_PROJECT_DEPLOY_WEBHOOK_URL:-}"
fi
if [[ -z "$webhook_url" ]]; then
  echo "Project deploy webhook URL is required (use --webhook-url or ZANE_PROJECT_DEPLOY_WEBHOOK_URL)" >&2
  exit 1
fi

if [[ -z "$services_csv" ]]; then
  echo "No services requested for preview redeploy; exiting."
  if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
    {
      echo "status=skipped"
      echo "http_code=0"
      echo "matched_env_count=0"
      echo "redeploy_count=0"
      echo "failed_count=0"
    } >> "$GITHUB_OUTPUT"
  fi
  exit 0
fi

services_json='[]'
requested_count=0
IFS=',' read -r -a services <<< "$services_csv"
for service in "${services[@]}"; do
  if [[ -z "$service" ]]; then
    continue
  fi
  requested_count=$((requested_count + 1))
  services_json="$(jq -c --arg service "$service" '. + [$service]' <<<"$services_json")"
done

if (( requested_count == 0 )); then
  echo "No valid services parsed from --services-csv=${services_csv}" >&2
  exit 1
fi

services_env_overrides_json="${ZANE_PROJECT_SERVICES_ENV_OVERRIDES_JSON:-{}}"
if ! printf '%s' "$services_env_overrides_json" | jq -e . >/dev/null 2>&1; then
  echo "ZANE_PROJECT_SERVICES_ENV_OVERRIDES_JSON must be valid JSON." >&2
  exit 1
fi

services_settings_overrides_json="${ZANE_PROJECT_SERVICES_SETTINGS_OVERRIDES_JSON:-{}}"
if ! printf '%s' "$services_settings_overrides_json" | jq -e . >/dev/null 2>&1; then
  echo "ZANE_PROJECT_SERVICES_SETTINGS_OVERRIDES_JSON must be valid JSON." >&2
  exit 1
fi

payload="$(jq -c -n \
  --argjson pr_number "$pr_number" \
  --arg repository_url "$repository_url" \
  --arg commit_sha "$commit_sha" \
  --argjson services "$services_json" \
  --argjson services_env_overrides "$services_env_overrides_json" \
  --argjson services_settings_overrides "$services_settings_overrides_json" \
  '{pr_number: $pr_number, repository_url: $repository_url, services: $services, cleanup_queue: true, services_env_overrides: $services_env_overrides, services_settings_overrides: $services_settings_overrides}
   + (if $commit_sha != "" then {commit_sha: $commit_sha} else {} end)')"

tmp_body="$(mktemp)"
trap 'rm -f "$tmp_body"' EXIT

http_code="$(curl --silent --show-error \
  --retry 3 --retry-all-errors --retry-delay 2 \
  -o "$tmp_body" -w '%{http_code}' \
  -X PUT "$webhook_url" \
  -H 'Content-Type: application/json' \
  -d "$payload")"

body="$(cat "$tmp_body")"
status="failed"
matched_env_count="0"
redeploy_count="0"
failed_count="0"

if [[ "$http_code" == "200" || "$http_code" == "202" ]]; then
  status="accepted"
  matched_env_count="1"
  redeploy_count="${requested_count}"
elif [[ "$http_code" == "404" ]]; then
  status="not_found"
else
  echo "Project preview redeploy failed with HTTP ${http_code}" >&2
  if [[ -n "$body" ]]; then
    echo "$body" >&2
  fi
  failed_count="1"
fi

echo "status=${status}"
echo "http_code=${http_code}"
echo "matched_env_count=${matched_env_count}"
echo "redeploy_count=${redeploy_count}"
echo "failed_count=${failed_count}"

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  {
    echo "status=${status}"
    echo "http_code=${http_code}"
    echo "matched_env_count=${matched_env_count}"
    echo "redeploy_count=${redeploy_count}"
    echo "failed_count=${failed_count}"
  } >> "$GITHUB_OUTPUT"
fi

if [[ "$status" == "failed" ]]; then
  exit 1
fi
