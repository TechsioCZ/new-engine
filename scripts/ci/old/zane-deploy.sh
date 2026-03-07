#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <preview|main> [options]" >&2
  exit 1
fi

command -v jq >/dev/null 2>&1 || {
  echo "jq is required for scripts/ci/zane-deploy.sh" >&2
  exit 1
}

mode="$1"
shift

webhook_url=""
pr_number=""
repository_url=""
commit_sha=""
commit_message=""
new_image=""
cleanup_queue="true"
kind="git"
env_pairs=()
service_env_pairs=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --webhook-url)
      webhook_url="${2:-}"
      shift 2
      ;;
    --pr-number)
      pr_number="${2:-}"
      shift 2
      ;;
    --repository-url)
      repository_url="${2:-}"
      shift 2
      ;;
    --commit-sha)
      commit_sha="${2:-}"
      shift 2
      ;;
    --commit-message)
      commit_message="${2:-}"
      shift 2
      ;;
    --new-image)
      new_image="${2:-}"
      shift 2
      ;;
    --cleanup-queue)
      cleanup_queue="${2:-}"
      shift 2
      ;;
    --kind)
      kind="${2:-}"
      shift 2
      ;;
    --env)
      env_pairs+=("${2:-}")
      shift 2
      ;;
    --service-env)
      service_env_pairs+=("${2:-}")
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ "$mode" != "preview" && "$mode" != "main" ]]; then
  echo "Unsupported mode: $mode" >&2
  exit 1
fi

if [[ -z "$webhook_url" ]]; then
  if [[ "$mode" == "preview" ]]; then
    webhook_url="${ZANE_PREVIEW_WEBHOOK_URL:-}"
  else
    webhook_url="${ZANE_MAIN_WEBHOOK_URL:-}"
  fi
fi

if [[ -z "$webhook_url" ]]; then
  echo "Webhook URL is required (use --webhook-url or ZANE_PREVIEW_WEBHOOK_URL/ZANE_MAIN_WEBHOOK_URL)" >&2
  exit 1
fi

method="POST"
payload="{}"

if [[ "$mode" == "preview" ]]; then
  if [[ -z "$pr_number" ]]; then
    echo "--pr-number is required for preview mode" >&2
    exit 1
  fi
  if [[ -z "$repository_url" ]]; then
    echo "--repository-url is required for preview mode" >&2
    exit 1
  fi

  preview_default_service="${ZANE_PREVIEW_DEFAULT_SERVICE_SLUG:-medusa-be}"
  for pair in "${env_pairs[@]}"; do
    service_env_pairs+=("${preview_default_service}:${pair}")
  done

  services_env_overrides='{}'
  for pair in "${service_env_pairs[@]}"; do
    if [[ "$pair" != *:*=* ]]; then
      echo "Invalid --service-env value, expected service:key=value but got: $pair" >&2
      exit 1
    fi

    service_slug="${pair%%:*}"
    key_value="${pair#*:}"
    key="${key_value%%=*}"
    value="${key_value#*=}"

    if [[ -z "$service_slug" || -z "$key" ]]; then
      echo "Invalid --service-env value, empty service or key in: $pair" >&2
      exit 1
    fi

    services_env_overrides="$(jq -c \
      --arg service "$service_slug" \
      --arg key "$key" \
      --arg value "$value" \
      '.[$service] = ((.[$service] // []) + [{"key": $key, "value": $value}])' \
      <<<"$services_env_overrides")"
  done

  services_settings_overrides="${ZANE_PREVIEW_SERVICES_SETTINGS_OVERRIDES_JSON:-{}}"
  if ! printf '%s' "$services_settings_overrides" | jq -e . >/dev/null 2>&1; then
    echo "ZANE_PREVIEW_SERVICES_SETTINGS_OVERRIDES_JSON must be valid JSON." >&2
    exit 1
  fi

  payload="$(jq -c -n \
    --argjson pr_number "$pr_number" \
    --arg repository_url "$repository_url" \
    --arg commit_sha "$commit_sha" \
    --argjson services_env_overrides "$services_env_overrides" \
    --argjson services_settings_overrides "$services_settings_overrides" \
    '{pr_number: $pr_number, repository_url: $repository_url, services_env_overrides: $services_env_overrides, services_settings_overrides: $services_settings_overrides}
      + (if $commit_sha != "" then {commit_sha: $commit_sha} else {} end)')"
else
  method="PUT"
  if [[ "$kind" != "git" && "$kind" != "docker" ]]; then
    echo "Invalid --kind value: $kind (expected git or docker)" >&2
    exit 1
  fi

  cleanup_json="true"
  if [[ "$cleanup_queue" == "false" || "$cleanup_queue" == "0" ]]; then
    cleanup_json="false"
  fi

  if [[ "$kind" == "git" ]]; then
    payload="$(jq -c -n \
      --arg commit_sha "$commit_sha" \
      --argjson cleanup_queue "$cleanup_json" \
      '{cleanup_queue: $cleanup_queue} + (if $commit_sha != "" then {commit_sha: $commit_sha} else {} end)')"
  else
    payload="$(jq -c -n \
      --arg commit_message "$commit_message" \
      --arg new_image "$new_image" \
      --argjson cleanup_queue "$cleanup_json" \
      '{cleanup_queue: $cleanup_queue}
       + (if $commit_message != "" then {commit_message: $commit_message} else {} end)
       + (if $new_image != "" then {new_image: $new_image} else {} end)')"
  fi
fi

tmp_body="$(mktemp)"
trap 'rm -f "$tmp_body"' EXIT

http_code="$(curl --silent --show-error \
  --retry 3 --retry-all-errors --retry-delay 2 \
  -o "$tmp_body" -w '%{http_code}' \
  -X "$method" "$webhook_url" \
  -H 'Content-Type: application/json' \
  -d "$payload")"

response_body="$(cat "$tmp_body")"

if (( http_code < 200 || http_code >= 300 )); then
  echo "Zane deploy webhook failed in ${mode} mode with HTTP ${http_code}" >&2
  if [[ -n "$response_body" ]]; then
    echo "$response_body" >&2
  fi
  exit 1
fi

echo "mode=${mode}"
echo "kind=${kind}"
echo "http_code=${http_code}"
if [[ "$mode" == "preview" ]]; then
  echo "pr_number=${pr_number}"
fi
