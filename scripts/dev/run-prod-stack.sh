#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
PROJECT_NAME="${PROJECT_NAME:-new-engine}"
NO_CACHE="false"

usage() {
  cat <<'EOF'
Usage:
  scripts/dev/run-prod-stack.sh [--no-cache]

Options:
  --no-cache  Build the production images without Docker layer cache
  --help      Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-cache)
      NO_CACHE="true"
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      usage >&2
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

compose_dev=(docker compose -f "$REPO_ROOT/docker-compose.yaml" -p "$PROJECT_NAME")
compose_prod=(docker compose -f "$REPO_ROOT/docker-compose.yaml" -f "$REPO_ROOT/docker-compose.prod.yaml" -p "$PROJECT_NAME")
build_flags=()
if [[ "$NO_CACHE" == "true" ]]; then
  build_flags+=(--no-cache)
fi

wait_for_health() {
  local service_name="$1"
  local timeout_seconds="${2:-300}"
  local container_id status last_status=""

  container_id="$("${compose_prod[@]}" ps -q "$service_name")"
  if [[ -z "$container_id" ]]; then
    echo "Could not resolve a running container for ${service_name}." >&2
    exit 1
  fi

  echo "Waiting for ${service_name} to become healthy..."
  while (( timeout_seconds > 0 )); do
    status="$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}starting{{end}}' "$container_id" 2>/dev/null || echo missing)"
    if [[ "$status" == "healthy" ]]; then
      echo "${service_name} is healthy."
      return 0
    fi
    if [[ "$status" != "$last_status" ]]; then
      echo "${service_name}: ${status}" >&2
      last_status="$status"
    fi
    sleep 2
    timeout_seconds=$((timeout_seconds - 2))
  done

  echo "Timed out waiting for ${service_name} health." >&2
  docker logs --tail=120 "$container_id" >&2
  exit 1
}

cd "$REPO_ROOT"
"${compose_prod[@]}" down || true
docker rmi "${PROJECT_NAME}-medusa-be" "${PROJECT_NAME}-payload" "${PROJECT_NAME}-herbatika" || true

"${compose_prod[@]}" up -d medusa-db
wait_for_health medusa-db
"${compose_prod[@]}" up -d medusa-valkey medusa-minio medusa-meilisearch
wait_for_health medusa-valkey
wait_for_health medusa-minio
wait_for_health medusa-meilisearch

"${compose_prod[@]}" build "${build_flags[@]}" payload
"${compose_prod[@]}" up -d payload
wait_for_health payload

"${compose_prod[@]}" build "${build_flags[@]}" medusa-be
"${compose_prod[@]}" up -d medusa-be
wait_for_health medusa-be

# N1 production build is disabled while the local prod flow is pointed at Herbatika.
# "${compose_dev[@]}" run --rm --no-deps \
#   -e COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
#   -e CI=1 \
#   -e MEDUSA_BACKEND_URL_INTERNAL=http://medusa-be:9000 \
#   n1 sh -lc '[ -d node_modules ] && [ -d apps/n1/node_modules ] || pnpm install --frozen-lockfile --prefer-offline --filter=n1...; pnpm --filter n1 run generate:categories'
# "${compose_prod[@]}" build "${build_flags[@]}" n1

"${compose_prod[@]}" build "${build_flags[@]}" herbatika
"${compose_prod[@]}" up -d herbatika
