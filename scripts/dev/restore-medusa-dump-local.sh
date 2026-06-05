#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=scripts/dev/lib/common.sh
source "${ROOT_DIR}/scripts/dev/lib/common.sh"

PROJECT_NAME="${PROJECT_NAME:-new-engine}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yaml}"
TARGET_DB="${TARGET_DB:-medusa}"
DUMP_FILE=""
ASSUME_YES="false"
START_AFTER_RESTORE="true"

usage() {
  cat <<'EOF'
Usage:
  scripts/dev/restore-medusa-dump-local.sh --dump-file PATH --yes [options]

Restores a pg_dump custom-format dump into the local docker-compose Medusa
Postgres service. The current local Medusa DB is renamed to a timestamped backup
database, then the restored staging DB is renamed to the target DB.

Options:
  --dump-file PATH       Required path to a pg_dump --format=custom file.
  --target-db NAME       Target local database name (default: medusa).
  --project-name NAME    Docker compose project name (default: new-engine).
  --compose-file PATH    Compose file (default: docker-compose.yaml).
  --no-start             Do not start medusa-be/payload after restore.
  --yes                  Required confirmation for destructive local restore.
  -h, --help             Show this help.

The script stops only local compose app containers before swapping databases.
EOF
}

require_safe_identifier() {
  local value="$1"
  local label="$2"

  if [[ ! "$value" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
    common::die "${label} must be a safe PostgreSQL identifier."
  fi
}

compose() {
  docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" "$@"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dump-file)
      DUMP_FILE="${2-}"
      shift 2
      ;;
    --target-db)
      TARGET_DB="${2-}"
      shift 2
      ;;
    --project-name)
      PROJECT_NAME="${2-}"
      shift 2
      ;;
    --compose-file)
      COMPOSE_FILE="${2-}"
      shift 2
      ;;
    --no-start)
      START_AFTER_RESTORE="false"
      shift
      ;;
    --yes)
      ASSUME_YES="true"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      usage >&2
      common::die "Unknown argument: $1"
      ;;
  esac
done

common::require_command docker
common::require_command date

[[ -n "$DUMP_FILE" ]] || {
  usage >&2
  common::die "--dump-file is required."
}
[[ -f "$DUMP_FILE" ]] || common::die "Dump file does not exist: $DUMP_FILE"
[[ "$ASSUME_YES" == "true" ]] || common::die "Pass --yes to confirm local DB restore."

require_safe_identifier "$TARGET_DB" "target DB"

cd "$ROOT_DIR"

db_container="$(compose ps -q medusa-db 2>/dev/null | head -n1 || true)"
[[ -n "$db_container" ]] || common::die "medusa-db is not running. Start resources first with: mise run dev:resources"

if ! docker inspect "$db_container" >/dev/null 2>&1; then
  common::die "medusa-db container is not inspectable: $db_container"
fi

timestamp="$(date -u +%Y%m%d%H%M%S)"
restore_db="${TARGET_DB}_restore_${timestamp}"
backup_db="${TARGET_DB}_before_restore_${timestamp}"
container_dump="/tmp/$(basename "$DUMP_FILE")"

require_safe_identifier "$restore_db" "restore DB"
require_safe_identifier "$backup_db" "backup DB"

echo "Stopping local app containers before DB swap..."
compose stop medusa-be payload >/dev/null 2>&1 || true

echo "Copying dump into medusa-db container..."
docker cp "$DUMP_FILE" "${db_container}:${container_dump}"

echo "Creating staging database: ${restore_db}"
compose exec -T medusa-db sh -lc "
  set -e
  psql -U \"\$POSTGRES_USER\" -d postgres -v ON_ERROR_STOP=1 \
    -c 'DROP DATABASE IF EXISTS \"${restore_db}\";' \
    -c 'CREATE DATABASE \"${restore_db}\";'
"

echo "Restoring dump into staging database..."
compose exec -T medusa-db sh -lc "
  set -e
  pg_restore \
    -U \"\$POSTGRES_USER\" \
    --dbname \"${restore_db}\" \
    --no-owner \
    --no-privileges \
    --clean \
    --if-exists \
    \"${container_dump}\"
"

echo "Swapping ${restore_db} into ${TARGET_DB}; previous DB becomes ${backup_db}"
target_exists="$(
  compose exec -T medusa-db sh -lc "
    psql -U \"\$POSTGRES_USER\" -d postgres -tA \
      -c \"SELECT 1 FROM pg_database WHERE datname = '${TARGET_DB}'\"
  " | tr -d '[:space:]'
)"

if [[ "$target_exists" == "1" ]]; then
  compose exec -T medusa-db sh -lc "
    set -e
    psql -U \"\$POSTGRES_USER\" -d postgres -v ON_ERROR_STOP=1 \
      -c \"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${TARGET_DB}' AND pid <> pg_backend_pid();\" \
      -c 'ALTER DATABASE \"${TARGET_DB}\" RENAME TO \"${backup_db}\";'
  "
else
  echo "Target DB ${TARGET_DB} does not exist; no local backup DB was created."
fi

compose exec -T medusa-db sh -lc "
  set -e
  psql -U \"\$POSTGRES_USER\" -d postgres -v ON_ERROR_STOP=1 \
    -c 'ALTER DATABASE \"${restore_db}\" RENAME TO \"${TARGET_DB}\";'
"

echo "Reapplying local Postgres role/schema grants..."
compose exec -T medusa-db sh /usr/local/bin/postgres-role-bootstrap

echo "Removing copied dump from medusa-db container..."
compose exec -T medusa-db rm -f "$container_dump" >/dev/null 2>&1 || true

if [[ "$START_AFTER_RESTORE" == "true" ]]; then
  echo "Starting local backend and Payload containers..."
  compose up -d --build medusa-be payload
fi

cat <<EOF
Restore complete.
  target_db: ${TARGET_DB}
  backup_db: ${backup_db}

Recommended follow-up:
  mise run dev:medusa:meili:reseed
  curl -fsS http://localhost:9000/health
EOF
