#!/usr/bin/env bash
set -euo pipefail

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "$1 is required" >&2
    exit 1
  fi
}

wait_for_health() {
  local url="$1"
  local wait_seconds="$2"
  local started_at now
  started_at="$(date +%s)"

  while true; do
    if curl --silent --show-error --fail --max-time 5 "${url%/}/health" >/dev/null; then
      return 0
    fi

    now="$(date +%s)"
    if (( now - started_at >= wait_seconds )); then
      echo "Timed out waiting for Meilisearch health at ${url%/}/health" >&2
      return 1
    fi
    sleep 2
  done
}

get_key_by_uid() {
  local url="$1"
  local master_key="$2"
  local uid="$3"
  local tmp_body
  local http_code

  tmp_body="$(mktemp)"
  http_code="$(curl --silent --show-error \
    --retry 3 --retry-all-errors --retry-delay 2 \
    -o "$tmp_body" -w '%{http_code}' \
    -H "Authorization: Bearer ${master_key}" \
    "${url%/}/keys/${uid}")"

  if [[ "$http_code" == "200" ]]; then
    cat "$tmp_body"
    rm -f "$tmp_body"
    return 0
  fi

  if [[ "$http_code" == "404" ]]; then
    rm -f "$tmp_body"
    return 0
  fi

  echo "Failed to read key uid=${uid}; HTTP ${http_code}" >&2
  cat "$tmp_body" >&2 || true
  rm -f "$tmp_body"
  return 1
}

key_matches_policy() {
  local key_obj="$1"
  local uid="$2"
  local description="$3"
  local actions_json="$4"
  local indexes_json="$5"

  jq -e \
    --arg uid "$uid" \
    --arg description "$description" \
    --argjson actions "$actions_json" \
    --argjson indexes "$indexes_json" \
    '
      (.uid == $uid)
      and (.description == $description)
      and ((.actions | sort) == ($actions | sort))
      and ((.indexes | sort) == ($indexes | sort))
    ' <<<"$key_obj" >/dev/null
}

print_usage() {
  cat <<'USAGE'
Usage: scripts/ci/verify-meili-keys.sh [options]

Options:
  --meili-url <url>                    Meilisearch base URL
  --master-key <key>                   Meilisearch master key (required for key inspection)
  --backend-key <key>                  Backend key value
  --frontend-key <key>                 Frontend key value
  --wait-seconds <n>                   Health wait timeout (default: 60)
  --help                               Show this help

Env fallbacks:
  MEILISEARCH_URL
  MEILISEARCH_MASTER_KEY or DC_MEILISEARCH_MASTER_KEY
  MEILISEARCH_BACKEND_API_KEY or DC_MEILISEARCH_BACKEND_API_KEY
  NEXT_PUBLIC_MEILISEARCH_API_KEY or DC_N1_NEXT_PUBLIC_MEILISEARCH_API_KEY
USAGE
}

require_cmd curl
require_cmd jq

MEILI_URL="${MEILISEARCH_URL:-http://127.0.0.1:7700}"
MASTER_KEY="${MEILISEARCH_MASTER_KEY:-${DC_MEILISEARCH_MASTER_KEY:-}}"
BACKEND_KEY="${MEILISEARCH_BACKEND_API_KEY:-${DC_MEILISEARCH_BACKEND_API_KEY:-}}"
FRONTEND_KEY="${NEXT_PUBLIC_MEILISEARCH_API_KEY:-${DC_N1_NEXT_PUBLIC_MEILISEARCH_API_KEY:-}}"
WAIT_SECONDS="60"

# Project-level fixed key contract. Keep these hardcoded to avoid CI drift.
BACKEND_UID="2f2e1f59-7b5a-4f2f-9f28-7a9137f7e6c1"
FRONTEND_UID="3a6b6d2c-1e2f-4b8c-8d4f-0f7c2b9a1d55"

BACKEND_DESCRIPTION="backend-medusa"
FRONTEND_DESCRIPTION="frontend-medusa"

BACKEND_ACTIONS_JSON='["search","documents.add","documents.delete","indexes.get","indexes.create","settings.update"]'
FRONTEND_ACTIONS_JSON='["search"]'

BACKEND_INDEXES_JSON='["products","categories","producers"]'
FRONTEND_INDEXES_JSON='["products","categories","producers"]'

while [[ $# -gt 0 ]]; do
  case "$1" in
    --meili-url)
      MEILI_URL="${2:-}"
      shift 2
      ;;
    --master-key)
      MASTER_KEY="${2:-}"
      shift 2
      ;;
    --backend-key)
      BACKEND_KEY="${2:-}"
      shift 2
      ;;
    --frontend-key)
      FRONTEND_KEY="${2:-}"
      shift 2
      ;;
    --wait-seconds)
      WAIT_SECONDS="${2:-}"
      shift 2
      ;;
    --help)
      print_usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      print_usage >&2
      exit 1
      ;;
  esac
done

if [[ -z "$MASTER_KEY" ]]; then
  echo "Missing Meilisearch master key." >&2
  exit 1
fi
if [[ -z "$BACKEND_KEY" ]]; then
  echo "Missing backend key (MEILISEARCH_BACKEND_API_KEY/DC_MEILISEARCH_BACKEND_API_KEY)." >&2
  exit 1
fi
if [[ -z "$FRONTEND_KEY" ]]; then
  echo "Missing frontend key (NEXT_PUBLIC_MEILISEARCH_API_KEY/DC_N1_NEXT_PUBLIC_MEILISEARCH_API_KEY)." >&2
  exit 1
fi
if [[ "$BACKEND_KEY" == "$MASTER_KEY" ]]; then
  echo "Backend key equals master key. This violates scoped-key policy." >&2
  exit 1
fi
if [[ "$FRONTEND_KEY" == "$MASTER_KEY" ]]; then
  echo "Frontend key equals master key. This violates scoped-key policy." >&2
  exit 1
fi
if [[ "$FRONTEND_KEY" == "$BACKEND_KEY" ]]; then
  echo "Frontend key equals backend key. Frontend must use dedicated read-only key." >&2
  exit 1
fi

wait_for_health "$MEILI_URL" "$WAIT_SECONDS"

backend_obj="$(get_key_by_uid "$MEILI_URL" "$MASTER_KEY" "$BACKEND_UID")"
frontend_obj="$(get_key_by_uid "$MEILI_URL" "$MASTER_KEY" "$FRONTEND_UID")"

if [[ -z "$backend_obj" ]]; then
  echo "Backend key with expected uid=${BACKEND_UID} not found in Meilisearch." >&2
  exit 1
fi
if [[ -z "$frontend_obj" ]]; then
  echo "Frontend key with expected uid=${FRONTEND_UID} not found in Meilisearch." >&2
  exit 1
fi

if ! key_matches_policy "$backend_obj" "$BACKEND_UID" "$BACKEND_DESCRIPTION" "$BACKEND_ACTIONS_JSON" "$BACKEND_INDEXES_JSON"; then
  echo "Backend key uid=${BACKEND_UID} does not match expected fixed policy." >&2
  exit 1
fi
if ! key_matches_policy "$frontend_obj" "$FRONTEND_UID" "$FRONTEND_DESCRIPTION" "$FRONTEND_ACTIONS_JSON" "$FRONTEND_INDEXES_JSON"; then
  echo "Frontend key uid=${FRONTEND_UID} does not match expected fixed policy." >&2
  exit 1
fi

actual_backend_key="$(jq -r '.key // empty' <<<"$backend_obj")"
actual_frontend_key="$(jq -r '.key // empty' <<<"$frontend_obj")"
if [[ -z "$actual_backend_key" || -z "$actual_frontend_key" ]]; then
  echo "Key value missing in Meilisearch API response." >&2
  exit 1
fi
if [[ "$actual_backend_key" != "$BACKEND_KEY" ]]; then
  echo "Provided backend key does not match key stored under uid=${BACKEND_UID}." >&2
  exit 1
fi
if [[ "$actual_frontend_key" != "$FRONTEND_KEY" ]]; then
  echo "Provided frontend key does not match key stored under uid=${FRONTEND_UID}." >&2
  exit 1
fi

backend_actions_csv="$(jq -r 'join(",")' <<<"$BACKEND_ACTIONS_JSON")"
frontend_actions_csv="$(jq -r 'join(",")' <<<"$FRONTEND_ACTIONS_JSON")"
backend_indexes_csv="$(jq -r 'join(",")' <<<"$BACKEND_INDEXES_JSON")"
frontend_indexes_csv="$(jq -r 'join(",")' <<<"$FRONTEND_INDEXES_JSON")"

echo "meili_url=${MEILI_URL%/}"
echo "backend_uid=${BACKEND_UID}"
echo "frontend_uid=${FRONTEND_UID}"
echo "backend_description=${BACKEND_DESCRIPTION}"
echo "frontend_description=${FRONTEND_DESCRIPTION}"
echo "backend_policy_actions=${backend_actions_csv}"
echo "backend_policy_indexes=${backend_indexes_csv}"
echo "frontend_policy_actions=${frontend_actions_csv}"
echo "frontend_policy_indexes=${frontend_indexes_csv}"
echo "result=ok"
