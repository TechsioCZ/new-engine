#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT_DIR/docker-compose.yaml}"
PROJECT_NAME="${COMPOSE_PROJECT_NAME:-new-engine}"

OLD_DATA_DIR="${OLD_DATA_DIR:-$ROOT_DIR/.docker_data/db}"
NEW_DATA_DIR="${NEW_DATA_DIR:-$ROOT_DIR/.docker_data/db18}"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/.docker_data/backups/postgres18-migration}"

POSTGRES_USER="${POSTGRES_USER:-root}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-root}"
POSTGRES_DB="${POSTGRES_DB:-medusa}"

NEW_IMAGE="postgres:18.1-alpine"
NEW_PGDATA="/var/lib/postgresql/18/docker"
OLD_PORT="${OLD_PORT:-55432}"
NEW_PORT="${NEW_PORT:-55433}"

log() {
  printf "[pg18-migrate] %s\n" "$*"
}

die() {
  printf "[pg18-migrate] ERROR: %s\n" "$*" >&2
  exit 1
}

container_exists() {
  docker inspect "$1" >/dev/null 2>&1
}

stop_and_remove_container() {
  local name="$1"
  if container_exists "$name"; then
    docker stop -t 60 "$name" >/dev/null 2>&1 || true
    docker rm "$name" >/dev/null 2>&1 || true
  fi
}

wait_for_ready() {
  local container="$1"
  local user="$2"
  local db="$3"
  local retries=60
  until docker exec "$container" pg_isready -U "$user" -d "$db" >/dev/null 2>&1; do
    retries=$((retries - 1))
    if [[ "$retries" -le 0 ]]; then
      docker logs "$container" >&2 || true
      die "Timed out waiting for ${container} to become ready."
    fi
    sleep 2
  done
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Required command not found: $1"
}

require_cmd docker

[[ -f "$COMPOSE_FILE" ]] || die "Compose file not found: $COMPOSE_FILE"
[[ -d "$OLD_DATA_DIR" ]] || die "Old data dir not found: $OLD_DATA_DIR"
old_major="$(
  docker run --rm \
    -v "$OLD_DATA_DIR:/var/lib/postgresql/data:ro" \
    "$NEW_IMAGE" \
    sh -lc 'cat /var/lib/postgresql/data/PG_VERSION 2>/dev/null || true' \
    | tr -d '[:space:]' | cut -d. -f1
)"
[[ -n "$old_major" ]] || die "Could not determine old PostgreSQL major from $OLD_DATA_DIR/PG_VERSION"
[[ "$old_major" =~ ^[0-9]+$ ]] || die "Unexpected PostgreSQL major version: $old_major"
(( old_major < 18 )) || die "Old cluster major is $old_major; this migration script is for upgrading from <18."

if [[ "$old_major" == "17" ]]; then
  OLD_IMAGE="${OLD_IMAGE:-postgres:17.6-alpine}"
else
  OLD_IMAGE="${OLD_IMAGE:-postgres:${old_major}-alpine}"
fi

mkdir -p "$BACKUP_DIR"
mkdir -p "$NEW_DATA_DIR"

if docker run --rm -v "$NEW_DATA_DIR:/target" "$NEW_IMAGE" sh -lc '[ -e /target/PG_VERSION ] || [ -e /target/18/docker/PG_VERSION ]'; then
  die "New data dir already appears initialized: $NEW_DATA_DIR"
fi

timestamp="$(date +%Y%m%d-%H%M%S)"
sql_backup="$BACKUP_DIR/pg_dumpall_${timestamp}.sql"
physical_backup="$BACKUP_DIR/old_data_dir_${timestamp}.tar.gz"
old_container="pg18-migrate-old-${timestamp}"
new_container="pg18-migrate-new-${timestamp}"
BOOTSTRAP_USER="pg18_migrator"
BOOTSTRAP_DB="pg18_migrator"

cleanup() {
  stop_and_remove_container "$old_container"
  stop_and_remove_container "$new_container"
}
trap cleanup EXIT

log "Stopping compose postgres service (if running) for a consistent backup."
docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" stop -t 60 medusa-db >/dev/null 2>&1 || true

log "Creating physical backup: $physical_backup"
docker run --rm \
  -v "$OLD_DATA_DIR:/source:ro" \
  "$NEW_IMAGE" \
  sh -lc "tar -C /source -czf - ." > "$physical_backup"

log "Starting temporary old cluster container ($OLD_IMAGE)."
docker run -d \
  --name "$old_container" \
  -e POSTGRES_USER="$POSTGRES_USER" \
  -e POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
  -e POSTGRES_DB="$POSTGRES_DB" \
  -v "$OLD_DATA_DIR:/var/lib/postgresql/data" \
  -p "127.0.0.1:${OLD_PORT}:5432" \
  "$OLD_IMAGE" \
  postgres -cshared_preload_libraries=pg_stat_statements >/dev/null

wait_for_ready "$old_container" "$POSTGRES_USER" "postgres"

log "Creating logical backup (pg_dumpall): $sql_backup"
docker exec "$old_container" pg_dumpall -U "$POSTGRES_USER" > "$sql_backup"

log "Stopping temporary old cluster."
stop_and_remove_container "$old_container"

log "Starting temporary new cluster container ($NEW_IMAGE)."
docker run -d \
  --name "$new_container" \
  -e POSTGRES_USER="$BOOTSTRAP_USER" \
  -e POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
  -e POSTGRES_DB="$BOOTSTRAP_DB" \
  -e PGDATA="$NEW_PGDATA" \
  -v "$NEW_DATA_DIR:/var/lib/postgresql" \
  -p "127.0.0.1:${NEW_PORT}:5432" \
  "$NEW_IMAGE" \
  postgres -cshared_preload_libraries=pg_stat_statements >/dev/null

wait_for_ready "$new_container" "$BOOTSTRAP_USER" "$BOOTSTRAP_DB"

log "Restoring logical backup into PostgreSQL 18 cluster."
docker exec -i "$new_container" psql -v ON_ERROR_STOP=1 -U "$BOOTSTRAP_USER" -d "$BOOTSTRAP_DB" < "$sql_backup"

log "Verifying migrated databases:"
docker exec "$new_container" psql -U "$BOOTSTRAP_USER" -d "$BOOTSTRAP_DB" -Atc "SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname;"

log "Stopping temporary new cluster."
stop_and_remove_container "$new_container"

log "Migration completed successfully."
log "Backups:"
log "  - Logical dump:  $sql_backup"
log "  - Physical dir:  $physical_backup"
log "Next step: Start stack with: make dev"
