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

NEW_IMAGE="postgres:18.1-alpine"
PG18_DATA_RELATIVE_PATH="18/docker"
OLD_CONTAINER_NAME="pg18-verify-old-$$"

CHECK_ONLY=0
ASSUME_YES=0

log() {
  printf "[pg18-finalize] %s\n" "$*"
}

die() {
  printf "[pg18-finalize] ERROR: %s\n" "$*" >&2
  exit 1
}

cleanup() {
  docker rm -f "$OLD_CONTAINER_NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

contains() {
  local needle="$1"
  shift
  local item
  for item in "$@"; do
    if [[ "$item" == "$needle" ]]; then
      return 0
    fi
  done
  return 1
}

wait_for_ready() {
  local container="$1"
  local user="$2"
  local db="$3"
  local retries=60
  until docker exec "$container" pg_isready -U "$user" -d "$db" >/dev/null 2>&1; do
    if ! docker inspect "$container" >/dev/null 2>&1; then
      die "Container '${container}' no longer exists while waiting for readiness."
    fi
    local running
    running="$(docker inspect "$container" --format '{{.State.Running}}' 2>/dev/null || true)"
    if [[ "$running" != "true" ]]; then
      docker logs "$container" >&2 || true
      die "Container '${container}' exited before becoming ready."
    fi
    retries=$((retries - 1))
    if [[ "$retries" -le 0 ]]; then
      docker logs "$container" >&2 || true
      die "Timed out waiting for ${container} to become ready."
    fi
    sleep 2
  done
}

read_old_major() {
  docker run --rm \
    -v "$OLD_DATA_DIR:/var/lib/postgresql/data:ro" \
    "$NEW_IMAGE" \
    sh -lc 'cat /var/lib/postgresql/data/PG_VERSION 2>/dev/null || true' \
    | tr -d '[:space:]' | cut -d. -f1
}

read_new_major_from_dir() {
  docker run --rm \
    -v "$NEW_DATA_DIR:/var/lib/postgresql:ro" \
    "$NEW_IMAGE" \
    sh -lc "cat /var/lib/postgresql/${PG18_DATA_RELATIVE_PATH}/PG_VERSION 2>/dev/null || true" \
    | tr -d '[:space:]' | cut -d. -f1
}

run_psql_list_dbs() {
  local container="$1"
  local user="$2"
  local db="$3"
  docker exec "$container" psql -U "$user" -d "$db" -Atc "SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY 1;" | sed '/^$/d'
}

run_psql_list_roles() {
  local container="$1"
  local user="$2"
  local db="$3"
  docker exec "$container" psql -U "$user" -d "$db" -Atc "SELECT rolname FROM pg_roles ORDER BY 1;" | sed '/^$/d'
}

non_system_object_count() {
  local container="$1"
  local user="$2"
  local db="$3"
  docker exec "$container" psql -U "$user" -d "$db" -Atc "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relkind IN ('r','p','v','m','S','f') AND n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%';"
}

table_signature_hash() {
  local container="$1"
  local user="$2"
  local db="$3"
  docker exec "$container" psql -U "$user" -d "$db" -Atc "
SELECT schemaname || '|' || tablename
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY schemaname, tablename;
" | sha256sum | awk '{print $1}'
}

column_signature_hash() {
  local container="$1"
  local user="$2"
  local db="$3"
  docker exec "$container" psql -U "$user" -d "$db" -Atc "
SELECT table_schema || '|' || table_name || '|' || column_name || '|' || udt_name || '|' || is_nullable
FROM information_schema.columns
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY table_schema, table_name, column_name;
" | sha256sum | awk '{print $1}'
}

sequence_values_hash() {
  local container="$1"
  local user="$2"
  local db="$3"
  docker exec "$container" psql -U "$user" -d "$db" -Atc "
SELECT schemaname || '|' || sequencename || '|' || COALESCE(last_value::text, '')
FROM pg_sequences
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY schemaname, sequencename;
" | sha256sum | awk '{print $1}'
}

list_user_tables() {
  local container="$1"
  local user="$2"
  local db="$3"
  docker exec "$container" psql -U "$user" -d "$db" -Atc "
SELECT schemaname || '|' || tablename
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY schemaname, tablename;
"
}

table_row_count() {
  local container="$1"
  local user="$2"
  local db="$3"
  local schema="$4"
  local table="$5"
  local esc_schema="${schema//\"/\"\"}"
  local esc_table="${table//\"/\"\"}"
  docker exec "$container" psql -U "$user" -d "$db" -Atc "SELECT count(*) FROM \"${esc_schema}\".\"${esc_table}\";"
}

for arg in "$@"; do
  case "$arg" in
    --check-only)
      CHECK_ONLY=1
      ;;
    --yes|-y)
      ASSUME_YES=1
      ;;
    *)
      die "Unknown argument: $arg. Supported: --check-only, --yes"
      ;;
  esac
done

command -v docker >/dev/null 2>&1 || die "Required command not found: docker"
[[ -f "$COMPOSE_FILE" ]] || die "Compose file not found: $COMPOSE_FILE"
[[ -d "$NEW_DATA_DIR" ]] || die "New data dir not found: $NEW_DATA_DIR"

new_major="$(read_new_major_from_dir)"
[[ "$new_major" == "18" ]] || die "New data dir is not PostgreSQL 18 cluster: $NEW_DATA_DIR"

new_container_id="$(docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" ps -q medusa-db || true)"
[[ -n "$new_container_id" ]] || die "medusa-db container not found for compose project '$PROJECT_NAME'. Run 'make dev' first."

running_state="$(docker inspect "$new_container_id" --format '{{.State.Running}}')"
[[ "$running_state" == "true" ]] || die "medusa-db container is not running."

live_image="$(docker inspect "$new_container_id" --format '{{.Config.Image}}')"
if [[ "$live_image" != "$NEW_IMAGE" ]]; then
  die "medusa-db image is '$live_image', expected '$NEW_IMAGE'."
fi

expected_mount="$(cd "$ROOT_DIR" && pwd)/.docker_data/db18"
live_mount="$(docker inspect "$new_container_id" --format '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql"}}{{.Source}}{{end}}{{end}}')"
[[ "$live_mount" == "$expected_mount" ]] || die "medusa-db mount is '$live_mount', expected '$expected_mount'."

live_pgdata="$(docker inspect "$new_container_id" --format '{{range .Config.Env}}{{println .}}{{end}}' | sed -n 's/^PGDATA=//p')"
[[ "$live_pgdata" == "/var/lib/postgresql/18/docker" ]] || die "medusa-db PGDATA is '$live_pgdata', expected '/var/lib/postgresql/18/docker'."

mapfile -t new_dbs < <(run_psql_list_dbs "$new_container_id" "$POSTGRES_USER" "postgres")
mapfile -t new_roles < <(run_psql_list_roles "$new_container_id" "$POSTGRES_USER" "postgres")

reference_user="$POSTGRES_USER"
reference_db="postgres"
reference_source="old data directory"
started_from_old_data=0

if [[ -d "$OLD_DATA_DIR" ]]; then
  old_major="$(read_old_major)"
  if [[ -n "$old_major" && "$old_major" =~ ^[0-9]+$ ]] && (( old_major < 18 )); then
    if [[ "$old_major" == "17" ]]; then
      old_image="postgres:17.6-alpine"
    else
      old_image="postgres:${old_major}-alpine"
    fi
    log "Starting temporary old cluster from $OLD_DATA_DIR using $old_image for verification."
    docker run -d \
      --name "$OLD_CONTAINER_NAME" \
      -e POSTGRES_USER="$POSTGRES_USER" \
      -e POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
      -e POSTGRES_DB="postgres" \
      -v "$OLD_DATA_DIR:/var/lib/postgresql/data:ro" \
      "$old_image" \
      postgres -cshared_preload_libraries=pg_stat_statements >/dev/null

    ready=0
    for _ in $(seq 1 20); do
      if docker exec "$OLD_CONTAINER_NAME" pg_isready -U "$POSTGRES_USER" -d postgres >/dev/null 2>&1; then
        ready=1
        break
      fi
      running="$(docker inspect "$OLD_CONTAINER_NAME" --format '{{.State.Running}}' 2>/dev/null || true)"
      [[ "$running" == "true" ]] || break
      sleep 1
    done

    if (( ready == 1 )); then
      started_from_old_data=1
    else
      log "Old data directory could not be started cleanly; falling back to logical backup verification."
      docker logs "$OLD_CONTAINER_NAME" >&2 || true
      docker rm -f "$OLD_CONTAINER_NAME" >/dev/null 2>&1 || true
    fi
  fi
fi

if (( started_from_old_data == 0 )); then
  latest_backup="$(ls -1t "$BACKUP_DIR"/pg_dumpall_*.sql 2>/dev/null | head -1 || true)"
  [[ -n "$latest_backup" ]] || die "Could not start old data dir and no logical backup found in $BACKUP_DIR."

  reference_source="logical backup: $latest_backup"
  reference_user="verify_loader"
  reference_db="verify_loader"

  log "Starting temporary reference cluster and restoring $latest_backup for verification."
  docker run -d \
    --name "$OLD_CONTAINER_NAME" \
    -e POSTGRES_USER="$reference_user" \
    -e POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
    -e POSTGRES_DB="$reference_db" \
    "$NEW_IMAGE" \
    postgres -cshared_preload_libraries=pg_stat_statements >/dev/null

  wait_for_ready "$OLD_CONTAINER_NAME" "$reference_user" "$reference_db"
  docker exec -i "$OLD_CONTAINER_NAME" psql -q -v ON_ERROR_STOP=1 -U "$reference_user" -d "$reference_db" < "$latest_backup" >/dev/null
fi

mapfile -t old_dbs < <(run_psql_list_dbs "$OLD_CONTAINER_NAME" "$reference_user" "$reference_db")
mapfile -t old_roles < <(run_psql_list_roles "$OLD_CONTAINER_NAME" "$reference_user" "$reference_db")

if [[ "$reference_user" == "verify_loader" ]]; then
  filtered_old_dbs=()
  for db in "${old_dbs[@]}"; do
    if [[ "$db" != "$reference_db" ]]; then
      filtered_old_dbs+=("$db")
    fi
  done
  old_dbs=("${filtered_old_dbs[@]}")

  filtered_old_roles=()
  for role in "${old_roles[@]}"; do
    if [[ "$role" != "$reference_user" ]]; then
      filtered_old_roles+=("$role")
    fi
  done
  old_roles=("${filtered_old_roles[@]}")
fi

for db in "${old_dbs[@]}"; do
  contains "$db" "${new_dbs[@]}" || die "Database '$db' exists in old cluster but not in new cluster."
done

for role in "${old_roles[@]}"; do
  contains "$role" "${new_roles[@]}" || die "Role '$role' exists in old cluster but not in new cluster."
done

for db in "${old_dbs[@]}"; do
  old_count="$(non_system_object_count "$OLD_CONTAINER_NAME" "$reference_user" "$db")"
  new_count="$(non_system_object_count "$new_container_id" "$POSTGRES_USER" "$db")"
  [[ "$old_count" == "$new_count" ]] || die "Object count mismatch for database '$db' (old=$old_count new=$new_count)."

  old_table_hash="$(table_signature_hash "$OLD_CONTAINER_NAME" "$reference_user" "$db")"
  new_table_hash="$(table_signature_hash "$new_container_id" "$POSTGRES_USER" "$db")"
  [[ "$old_table_hash" == "$new_table_hash" ]] || die "Table-set mismatch for database '$db'."

  old_column_hash="$(column_signature_hash "$OLD_CONTAINER_NAME" "$reference_user" "$db")"
  new_column_hash="$(column_signature_hash "$new_container_id" "$POSTGRES_USER" "$db")"
  [[ "$old_column_hash" == "$new_column_hash" ]] || die "Column-signature mismatch for database '$db'."

  old_sequence_hash="$(sequence_values_hash "$OLD_CONTAINER_NAME" "$reference_user" "$db")"
  new_sequence_hash="$(sequence_values_hash "$new_container_id" "$POSTGRES_USER" "$db")"
  [[ "$old_sequence_hash" == "$new_sequence_hash" ]] || die "Sequence value mismatch for database '$db'."

  while IFS='|' read -r schema table; do
    old_rows="$(table_row_count "$OLD_CONTAINER_NAME" "$reference_user" "$db" "$schema" "$table")"
    new_rows="$(table_row_count "$new_container_id" "$POSTGRES_USER" "$db" "$schema" "$table")"
    [[ "$old_rows" == "$new_rows" ]] || die "Row-count mismatch for ${db}.${schema}.${table} (old=$old_rows new=$new_rows)."
  done < <(list_user_tables "$OLD_CONTAINER_NAME" "$reference_user" "$db")
done

log "Verification passed: old cluster structure and row counts match new cluster for all old databases (source: $reference_source)."

if (( CHECK_ONLY == 1 )); then
  log "Check-only mode enabled; skipping cleanup."
  exit 0
fi

if (( ASSUME_YES == 0 )); then
  printf "Verification passed. Remove old data '%s' and backup dir '%s'? [y/N] " "$OLD_DATA_DIR" "$BACKUP_DIR"
  read -r answer
  if [[ "$answer" != "y" && "$answer" != "Y" ]]; then
    die "Cleanup cancelled by user."
  fi
fi

log "Dropping temporary bootstrap database/role if present (pg18_migrator)."
docker exec "$new_container_id" psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'pg18_migrator';" >/dev/null
docker exec "$new_container_id" psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS pg18_migrator;" >/dev/null
role_oid="$(docker exec "$new_container_id" psql -U "$POSTGRES_USER" -d postgres -Atc "SELECT oid FROM pg_roles WHERE rolname = 'pg18_migrator';" | tr -d '[:space:]')"
if [[ -n "$role_oid" ]]; then
  if [[ "$role_oid" =~ ^[0-9]+$ ]] && (( role_oid >= 16384 )); then
    docker exec "$new_container_id" psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 -c "DROP ROLE IF EXISTS pg18_migrator;" >/dev/null
  else
    log "Skipping role drop for pg18_migrator (bootstrap/system role oid=$role_oid)."
  fi
fi

log "Stopping temporary verification container."
docker rm -f "$OLD_CONTAINER_NAME" >/dev/null 2>&1 || true

log "Removing old data directory and migration backups."
docker run --rm --user 0:0 \
  -v "$ROOT_DIR/.docker_data:/data" \
  "$NEW_IMAGE" \
  sh -lc 'rm -rf /data/db /data/backups/postgres18-migration'

log "Finalization complete. Only PostgreSQL 18 state remains in ./.docker_data/db18."
