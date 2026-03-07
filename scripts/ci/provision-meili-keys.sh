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

create_key() {
  local url="$1"
  local master_key="$2"
  local uid="$3"
  local description="$4"
  local actions_json="$5"
  local indexes_json="$6"

  local payload
  payload="$(jq -cn \
    --arg uid "$uid" \
    --arg description "$description" \
    --argjson actions "$actions_json" \
    --argjson indexes "$indexes_json" \
    '{uid: $uid, description: $description, actions: $actions, indexes: $indexes, expiresAt: null}')"

  curl --silent --show-error --fail \
    --retry 3 --retry-all-errors --retry-delay 2 \
    -X POST "${url%/}/keys" \
    -H "Authorization: Bearer ${master_key}" \
    -H "Content-Type: application/json" \
    -d "$payload"
}

update_key() {
  local url="$1"
  local master_key="$2"
  local uid="$3"
  local description="$4"
  local actions_json="$5"
  local indexes_json="$6"

  local payload
  payload="$(jq -cn \
    --arg description "$description" \
    --argjson actions "$actions_json" \
    --argjson indexes "$indexes_json" \
    '{description: $description, actions: $actions, indexes: $indexes, expiresAt: null}')"

  curl --silent --show-error --fail \
    --retry 3 --retry-all-errors --retry-delay 2 \
    -X PATCH "${url%/}/keys/${uid}" \
    -H "Authorization: Bearer ${master_key}" \
    -H "Content-Type: application/json" \
    -d "$payload"
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
Usage: scripts/ci/provision-meili-keys.sh [options]

Options:
  --meili-url <url>                    Meilisearch base URL
  --master-key <key>                   Meilisearch master key
  --wait-seconds <n>                   Health wait timeout (default: 60)
  --help                               Show this help

Env fallbacks:
  MEILISEARCH_URL
  MEILISEARCH_MASTER_KEY or DC_MEILISEARCH_MASTER_KEY
USAGE
}

require_cmd curl
require_cmd jq

MEILI_URL="${MEILISEARCH_URL:-http://127.0.0.1:7700}"
MASTER_KEY="${MEILISEARCH_MASTER_KEY:-${DC_MEILISEARCH_MASTER_KEY:-}}"
WAIT_SECONDS="60"

# Project-level fixed key contract. Keep these hardcoded to avoid CI drift.
BACKEND_ENV_VAR="DC_MEILISEARCH_BACKEND_API_KEY"
FRONTEND_ENV_VAR="DC_N1_NEXT_PUBLIC_MEILISEARCH_API_KEY"

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
  echo "Missing Meilisearch master key. Set --master-key or MEILISEARCH_MASTER_KEY/DC_MEILISEARCH_MASTER_KEY." >&2
  exit 1
fi

wait_for_health "$MEILI_URL" "$WAIT_SECONDS"

backend_key_obj="$(get_key_by_uid "$MEILI_URL" "$MASTER_KEY" "$BACKEND_UID")"
frontend_key_obj="$(get_key_by_uid "$MEILI_URL" "$MASTER_KEY" "$FRONTEND_UID")"

if [[ -z "$backend_key_obj" ]]; then
  backend_key_obj="$(create_key "$MEILI_URL" "$MASTER_KEY" "$BACKEND_UID" "$BACKEND_DESCRIPTION" "$BACKEND_ACTIONS_JSON" "$BACKEND_INDEXES_JSON")"
  backend_created="true"
  backend_updated="false"
else
  backend_created="false"
  if key_matches_policy "$backend_key_obj" "$BACKEND_UID" "$BACKEND_DESCRIPTION" "$BACKEND_ACTIONS_JSON" "$BACKEND_INDEXES_JSON"; then
    backend_updated="false"
  else
    backend_key_obj="$(update_key "$MEILI_URL" "$MASTER_KEY" "$BACKEND_UID" "$BACKEND_DESCRIPTION" "$BACKEND_ACTIONS_JSON" "$BACKEND_INDEXES_JSON")"
    backend_updated="true"
  fi
fi

if [[ -z "$frontend_key_obj" ]]; then
  frontend_key_obj="$(create_key "$MEILI_URL" "$MASTER_KEY" "$FRONTEND_UID" "$FRONTEND_DESCRIPTION" "$FRONTEND_ACTIONS_JSON" "$FRONTEND_INDEXES_JSON")"
  frontend_created="true"
  frontend_updated="false"
else
  frontend_created="false"
  if key_matches_policy "$frontend_key_obj" "$FRONTEND_UID" "$FRONTEND_DESCRIPTION" "$FRONTEND_ACTIONS_JSON" "$FRONTEND_INDEXES_JSON"; then
    frontend_updated="false"
  else
    frontend_key_obj="$(update_key "$MEILI_URL" "$MASTER_KEY" "$FRONTEND_UID" "$FRONTEND_DESCRIPTION" "$FRONTEND_ACTIONS_JSON" "$FRONTEND_INDEXES_JSON")"
    frontend_updated="true"
  fi
fi

backend_key="$(jq -r '.key // empty' <<<"$backend_key_obj")"
frontend_key="$(jq -r '.key // empty' <<<"$frontend_key_obj")"
backend_uid="$(jq -r '.uid // empty' <<<"$backend_key_obj")"
frontend_uid="$(jq -r '.uid // empty' <<<"$frontend_key_obj")"

if [[ -z "$backend_key" || -z "$frontend_key" ]]; then
  echo "Failed to resolve Meilisearch key values from API response." >&2
  exit 1
fi

if [[ "${GITHUB_ACTIONS:-}" == "true" ]]; then
  echo "::add-mask::${backend_key}"
  echo "::add-mask::${frontend_key}"
fi

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  {
    echo "backend_key=${backend_key}"
    echo "frontend_key=${frontend_key}"
    echo "backend_uid=${backend_uid}"
    echo "frontend_uid=${frontend_uid}"
    echo "backend_created=${backend_created}"
    echo "frontend_created=${frontend_created}"
    echo "backend_updated=${backend_updated}"
    echo "frontend_updated=${frontend_updated}"
    echo "backend_env_var=${BACKEND_ENV_VAR}"
    echo "frontend_env_var=${FRONTEND_ENV_VAR}"
  } >>"$GITHUB_OUTPUT"
fi

backend_actions_csv="$(jq -r 'join(",")' <<<"$BACKEND_ACTIONS_JSON")"
frontend_actions_csv="$(jq -r 'join(",")' <<<"$FRONTEND_ACTIONS_JSON")"
backend_indexes_csv="$(jq -r 'join(",")' <<<"$BACKEND_INDEXES_JSON")"
frontend_indexes_csv="$(jq -r 'join(",")' <<<"$FRONTEND_INDEXES_JSON")"

echo "meili_url=${MEILI_URL%/}"
echo "backend_env_var=${BACKEND_ENV_VAR}"
echo "frontend_env_var=${FRONTEND_ENV_VAR}"
echo "backend_uid=${backend_uid}"
echo "frontend_uid=${frontend_uid}"
echo "backend_description=${BACKEND_DESCRIPTION}"
echo "frontend_description=${FRONTEND_DESCRIPTION}"
echo "backend_created=${backend_created}"
echo "frontend_created=${frontend_created}"
echo "backend_updated=${backend_updated}"
echo "frontend_updated=${frontend_updated}"
echo "backend_policy_actions=${backend_actions_csv}"
echo "backend_policy_indexes=${backend_indexes_csv}"
echo "frontend_policy_actions=${frontend_actions_csv}"
echo "frontend_policy_indexes=${frontend_indexes_csv}"
echo "${BACKEND_ENV_VAR}=${backend_key}"
echo "${FRONTEND_ENV_VAR}=${frontend_key}"
