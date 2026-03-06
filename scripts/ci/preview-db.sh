#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <ensure|delete> <pr_number>" >&2
  exit 1
fi

command -v jq >/dev/null 2>&1 || {
  echo "jq is required for scripts/ci/preview-db.sh" >&2
  exit 1
}

action="$1"
pr_number="$2"

if [[ "$action" != "ensure" && "$action" != "delete" ]]; then
  echo "Unsupported action: $action" >&2
  exit 1
fi

if [[ -z "${ZANE_OPERATOR_BASE_URL:-}" ]]; then
  echo "ZANE_OPERATOR_BASE_URL is required" >&2
  exit 1
fi
if [[ -z "${ZANE_OPERATOR_API_TOKEN:-}" ]]; then
  echo "ZANE_OPERATOR_API_TOKEN is required" >&2
  exit 1
fi

base_url="${ZANE_OPERATOR_BASE_URL%/}"

tmp_body="$(mktemp)"
trap 'rm -f "$tmp_body"' EXIT

if [[ "$action" == "ensure" ]]; then
  http_code="$(curl --silent --show-error \
    --retry 3 --retry-all-errors --retry-delay 2 \
    -o "$tmp_body" -w '%{http_code}' \
    -X POST "${base_url}/v1/preview-db/ensure" \
    -H "Authorization: Bearer ${ZANE_OPERATOR_API_TOKEN}" \
    -H 'Content-Type: application/json' \
    -d "{\"pr_number\":${pr_number}}")"
else
  http_code="$(curl --silent --show-error \
    --retry 3 --retry-all-errors --retry-delay 2 \
    -o "$tmp_body" -w '%{http_code}' \
    -X DELETE "${base_url}/v1/preview-db/${pr_number}" \
    -H "Authorization: Bearer ${ZANE_OPERATOR_API_TOKEN}")"
fi

body="$(cat "$tmp_body")"

if (( http_code < 200 || http_code >= 300 )); then
  echo "zane-operator ${action} failed with HTTP ${http_code}" >&2
  if [[ -n "$body" ]]; then
    echo "$body" >&2
  fi
  exit 1
fi

if [[ "$action" == "ensure" ]]; then
  created="$(printf '%s' "$body" | jq -r '.created // false')"
  db_name="$(printf '%s' "$body" | jq -r '.db_name // empty')"
  app_user="$(printf '%s' "$body" | jq -r '.app_user // empty')"
  app_password="$(printf '%s' "$body" | jq -r '.app_password // empty')"

  if [[ -z "$db_name" || -z "$app_user" || -z "$app_password" ]]; then
    echo "Unexpected ensure response, missing required fields" >&2
    echo "$body" >&2
    exit 1
  fi

  echo "::add-mask::${app_password}"

  echo "action=ensure"
  echo "http_code=${http_code}"
  echo "created=${created}"
  echo "db_name=${db_name}"
  echo "app_user=${app_user}"

  if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
    {
      echo "action=ensure"
      echo "http_code=${http_code}"
      echo "created=${created}"
      echo "db_name=${db_name}"
      echo "app_user=${app_user}"
      echo "app_password=${app_password}"
    } >> "$GITHUB_OUTPUT"
  fi

  printf '{"created":%s,"db_name":"%s","app_user":"%s"}\n' "$created" "$db_name" "$app_user"
  exit 0
fi

status_value="$(printf '%s' "$body" | jq -r '.status // "ok"')"
db_name_value="$(printf '%s' "$body" | jq -r '.db_name // empty')"
app_user_value="$(printf '%s' "$body" | jq -r '.app_user // empty')"

echo "action=delete"
echo "http_code=${http_code}"
echo "status=${status_value}"
echo "db_name=${db_name_value}"

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  {
    echo "action=delete"
    echo "http_code=${http_code}"
    echo "status=${status_value}"
    echo "db_name=${db_name_value}"
    echo "app_user=${app_user_value}"
  } >> "$GITHUB_OUTPUT"
fi

printf '{"status":"%s","db_name":"%s","app_user":"%s"}\n' "$status_value" "$db_name_value" "$app_user_value"
