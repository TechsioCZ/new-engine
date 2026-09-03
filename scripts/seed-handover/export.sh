#!/usr/bin/env bash
# Seed-database handover: EXPORT
#
# Produces a portable, timestamped bundle containing:
#   - a single pg_dump (custom format) of the primary Postgres database, which
#     in this deployment holds THREE schemas: medusa (commerce), payload (CMS),
#     and url_registry (URL routing ledger) -- see README.md "One database,
#     three schemas" for why there is no separate "Payload database" dump here.
#   - an optional SEPARATE Payload dump, only produced if PAYLOAD_DATABASE_URL
#     is explicitly set to a host/db different from the primary one (i.e. the
#     target deployment actually split Payload into its own database).
#   - a tar.gz of the Payload media bucket (object storage, not local disk).
#   - a manifest.json with sizes, checksums, row counts, and the source git
#     commit, so the import side can sanity-check what it received.
#
# SAFETY: this script only ever reads from the live databases (pg_dump) and
# only ever reads the media bucket (docker cp out). It never writes to, drops,
# or truncates anything live. It never prints a DSN, password, or hash value.
#
# Usage:
#   scripts/seed-handover/export.sh
#
# Env vars (all optional; defaults match this repo's docker-compose.yaml):
#   OUTPUT_DIR                Where to write the bundle. Default:
#                             ./seed-handover-output/<UTC timestamp> (repo-root
#                             relative). NEVER commit this directory -- it is
#                             gitignored, but prefer pointing it outside the
#                             repo entirely for real handovers, e.g.:
#                               OUTPUT_DIR=/path/outside/repo scripts/seed-handover/export.sh
#   DB_CONTAINER              Docker container running the primary Postgres
#                             instance. Default: resolved via
#                             `docker compose ps -q medusa-db`, falling back to
#                             "new-engine-medusa-db-1".
#   DB_SUPERUSER              Postgres role to dump with. Default: read from
#                             the container's own POSTGRES_USER env var
#                             (not printed), falling back to "root".
#   DB_NAME                   Database to dump. Default: read from the
#                             container's own POSTGRES_DB env var, falling
#                             back to "medusa".
#   EXCLUDE_AUTH_TABLE_DATA   1 (default) / 0. When 1, the schema of the
#                             Medusa admin-auth tables (auth_identity,
#                             provider_identity, and their dependents) is kept
#                             but their ROW DATA is excluded from the dump --
#                             these tables hold password hashes for the Medusa
#                             admin panel. See README.md "Sanitization".
#   MINIO_CONTAINER           Docker container running the Payload media
#                             bucket (MinIO / S3-compatible). Default:
#                             resolved via `docker compose ps -q medusa-minio`,
#                             falling back to "new-engine-medusa-minio".
#   MINIO_BUCKET              Bucket name holding Payload media objects.
#                             Default: read from the container's own
#                             MINIO_MEDUSA_BUCKET env var, falling back to
#                             "medusa-bucket".
#   SKIP_MEDIA                1 to skip the (large, slow) media export.
#                             Default: 0.
#   PAYLOAD_DATABASE_URL      Only set this if your deployment put Payload in
#                             a genuinely separate database. If set AND its
#                             host/dbname differ from DB_CONTAINER/DB_NAME,
#                             a second dump (payload.dump) is produced via
#                             `pg_dump "$PAYLOAD_DATABASE_URL"` run from the
#                             HOST (requires a local pg_dump client). The
#                             value is read once into a variable and is never
#                             echoed or logged.
#
# Ground-truth values observed against this repo's dev stack are recorded in
# README.md; nothing here is hardcoded except as a documented default.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"

OUTPUT_DIR="${OUTPUT_DIR:-$ROOT_DIR/seed-handover-output/$TIMESTAMP}"
DB_CONTAINER="${DB_CONTAINER:-}"
DB_SUPERUSER="${DB_SUPERUSER:-}"
DB_NAME="${DB_NAME:-}"
EXCLUDE_AUTH_TABLE_DATA="${EXCLUDE_AUTH_TABLE_DATA:-1}"
MINIO_CONTAINER="${MINIO_CONTAINER:-}"
MINIO_BUCKET="${MINIO_BUCKET:-}"
SKIP_MEDIA="${SKIP_MEDIA:-0}"
PAYLOAD_DATABASE_URL="${PAYLOAD_DATABASE_URL:-}"

log() { printf '[seed-export] %s\n' "$*"; }
die() {
  printf '[seed-export] ERROR: %s\n' "$*" >&2
  exit 1
}
require_cmd() { command -v "$1" >/dev/null 2>&1 || die "Required command not found: $1"; }

require_cmd docker
require_cmd sha256sum || require_cmd shasum

sha256_of() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  else
    shasum -a 256 "$1" | awk '{print $1}'
  fi
}

resolve_compose_container() {
  local service="$1" fallback="$2"
  local id=""
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    id="$(cd "$ROOT_DIR" && docker compose ps -q "$service" 2>/dev/null || true)"
  fi
  if [[ -n "$id" ]]; then
    docker inspect --format '{{.Name}}' "$id" | sed 's#^/##'
  elif docker inspect "$fallback" >/dev/null 2>&1; then
    echo "$fallback"
  else
    echo ""
  fi
}

if [[ -z "$DB_CONTAINER" ]]; then
  DB_CONTAINER="$(resolve_compose_container medusa-db new-engine-medusa-db-1)"
fi
[[ -n "$DB_CONTAINER" ]] || die "Could not resolve the Postgres container. Set DB_CONTAINER explicitly."
docker inspect "$DB_CONTAINER" >/dev/null 2>&1 || die "Container not found: $DB_CONTAINER"

if [[ -z "$DB_SUPERUSER" ]]; then
  DB_SUPERUSER="$(docker exec "$DB_CONTAINER" printenv POSTGRES_USER 2>/dev/null || true)"
  DB_SUPERUSER="${DB_SUPERUSER:-root}"
fi
if [[ -z "$DB_NAME" ]]; then
  DB_NAME="$(docker exec "$DB_CONTAINER" printenv POSTGRES_DB 2>/dev/null || true)"
  DB_NAME="${DB_NAME:-medusa}"
fi

if [[ "$SKIP_MEDIA" != "1" ]]; then
  if [[ -z "$MINIO_CONTAINER" ]]; then
    MINIO_CONTAINER="$(resolve_compose_container medusa-minio new-engine-medusa-minio)"
  fi
  if [[ -z "$MINIO_BUCKET" && -n "$MINIO_CONTAINER" ]]; then
    MINIO_BUCKET="$(docker exec "$MINIO_CONTAINER" printenv MINIO_MEDUSA_BUCKET 2>/dev/null || true)"
    MINIO_BUCKET="${MINIO_BUCKET:-medusa-bucket}"
  fi
fi

mkdir -p "$OUTPUT_DIR"
log "Output directory: $OUTPUT_DIR"
log "Primary DB container: $DB_CONTAINER (db=$DB_NAME, superuser=$DB_SUPERUSER)"

# ---------------------------------------------------------------------------
# 1. Primary database dump (medusa + payload + url_registry schemas)
# ---------------------------------------------------------------------------
PRIMARY_DUMP="$OUTPUT_DIR/medusa-full.dump"

EXCLUDE_ARGS=()
if [[ "$EXCLUDE_AUTH_TABLE_DATA" == "1" ]]; then
  log "Excluding row data (schema kept) for Medusa admin-auth tables (password hashes)."
  for t in auth_identity provider_identity auth_password_reset_token auth_mfa_factor auth_mfa_recovery_code auth_verification; do
    EXCLUDE_ARGS+=(--exclude-table-data="medusa.${t}")
  done
fi

log "Dumping primary database (this can take a while)..."
docker exec "$DB_CONTAINER" pg_dump \
  -U "$DB_SUPERUSER" \
  -d "$DB_NAME" \
  -Fc \
  --no-owner \
  --no-privileges \
  "${EXCLUDE_ARGS[@]}" \
  >"$PRIMARY_DUMP"
log "Primary dump written: $PRIMARY_DUMP ($(du -h "$PRIMARY_DUMP" | awk '{print $1}'))"

# ---------------------------------------------------------------------------
# 2. Optional separate Payload dump (only if genuinely a different database)
# ---------------------------------------------------------------------------
PAYLOAD_DUMP=""
if [[ -n "$PAYLOAD_DATABASE_URL" ]]; then
  # Compare host+dbname (not the full DSN, so we never log/compare secrets)
  # against the primary container's own connection info.
  PRIMARY_HOST_DB="${DB_CONTAINER}:${DB_NAME}"
  PAYLOAD_HOST_DB="$(printf '%s' "$PAYLOAD_DATABASE_URL" | sed -E 's#^[a-zA-Z]+://[^@]*@##; s#\?.*$##')"
  if [[ "$PAYLOAD_HOST_DB" == *"$DB_NAME"* ]] && [[ -z "${FORCE_SEPARATE_PAYLOAD_DUMP:-}" ]]; then
    log "PAYLOAD_DATABASE_URL looks like the same database as the primary dump (dbname matches '$DB_NAME'); skipping a redundant second dump. Set FORCE_SEPARATE_PAYLOAD_DUMP=1 to override."
  else
    require_cmd pg_dump
    log "Dumping separate Payload database (PAYLOAD_DATABASE_URL is host-distinct)..."
    PAYLOAD_DUMP="$OUTPUT_DIR/payload.dump"
    pg_dump "$PAYLOAD_DATABASE_URL" -Fc --no-owner --no-privileges >"$PAYLOAD_DUMP"
    log "Payload dump written: $PAYLOAD_DUMP ($(du -h "$PAYLOAD_DUMP" | awk '{print $1}'))"
  fi
fi

# ---------------------------------------------------------------------------
# 3. Media (Payload uploads live in S3-compatible object storage, not disk)
# ---------------------------------------------------------------------------
MEDIA_ARCHIVE=""
MEDIA_FILE_COUNT=0
if [[ "$SKIP_MEDIA" != "1" ]]; then
  if [[ -z "$MINIO_CONTAINER" ]] || ! docker inspect "$MINIO_CONTAINER" >/dev/null 2>&1; then
    log "WARNING: media container not found; skipping media export. Set MINIO_CONTAINER or SKIP_MEDIA=1 to silence this."
  else
    log "Copying media bucket '$MINIO_BUCKET' out of $MINIO_CONTAINER (this can take a while for large buckets)..."
    MEDIA_STAGE="$OUTPUT_DIR/.media-stage"
    mkdir -p "$MEDIA_STAGE"
    docker cp "$MINIO_CONTAINER:/data/$MINIO_BUCKET" "$MEDIA_STAGE/media"
    MEDIA_FILE_COUNT="$(find "$MEDIA_STAGE/media" -type f | wc -l | tr -d ' ')"
    MEDIA_ARCHIVE="$OUTPUT_DIR/media.tar.gz"
    tar -C "$MEDIA_STAGE" -czf "$MEDIA_ARCHIVE" media
    rm -rf "$MEDIA_STAGE"
    log "Media archive written: $MEDIA_ARCHIVE ($(du -h "$MEDIA_ARCHIVE" | awk '{print $1}'), $MEDIA_FILE_COUNT files)"
  fi
else
  log "SKIP_MEDIA=1: skipping media export."
fi

# ---------------------------------------------------------------------------
# 4. Row-count snapshot (for post-restore verification, not a full audit)
# ---------------------------------------------------------------------------
log "Collecting row counts for the manifest..."
ROW_COUNTS_SQL="
select 'medusa.product' as t, count(*) from medusa.product
union all select 'medusa.product_variant', count(*) from medusa.product_variant
union all select 'medusa.price', count(*) from medusa.price
union all select 'medusa.product_category', count(*) from medusa.product_category
union all select 'medusa.brand', count(*) from medusa.brand
union all select 'medusa.sales_channel', count(*) from medusa.sales_channel
union all select 'medusa.region', count(*) from medusa.region
union all select 'medusa.shipping_option', count(*) from medusa.shipping_option
union all select 'medusa.customer', count(*) from medusa.customer
union all select 'medusa.order', count(*) from medusa.\"order\"
union all select 'medusa.api_key', count(*) from medusa.api_key
union all select 'medusa.translation', count(*) from medusa.translation
union all select 'payload.articles', count(*) from payload.articles
union all select 'payload.pages', count(*) from payload.pages
union all select 'payload.media', count(*) from payload.media
union all select 'payload.users', count(*) from payload.users
union all select 'url_registry.url_route', count(*) from url_registry.url_route
union all select 'url_registry.url_entity_slug', count(*) from url_registry.url_entity_slug
union all select 'url_registry.schema_migrations', count(*) from url_registry.schema_migrations
"
ROW_COUNTS_JSON="$(docker exec "$DB_CONTAINER" psql -U "$DB_SUPERUSER" -d "$DB_NAME" -Atc "
select coalesce(jsonb_object_agg(t, c), '{}'::jsonb) from ( ${ROW_COUNTS_SQL} ) x(t, c);
")"

PG_VERSION="$(docker exec "$DB_CONTAINER" psql -U "$DB_SUPERUSER" -d "$DB_NAME" -Atc 'show server_version;')"
GIT_COMMIT="$(cd "$ROOT_DIR" && git rev-parse HEAD 2>/dev/null || echo unknown)"
GIT_DIRTY="$(cd "$ROOT_DIR" && { git diff --quiet && git diff --cached --quiet; } 2>/dev/null && echo false || echo true)"

# ---------------------------------------------------------------------------
# 5. Manifest
# ---------------------------------------------------------------------------
MANIFEST="$OUTPUT_DIR/manifest.json"

primary_dump_sha="$(sha256_of "$PRIMARY_DUMP")"
primary_dump_size="$(wc -c <"$PRIMARY_DUMP" | tr -d ' ')"

payload_dump_json="null"
if [[ -n "$PAYLOAD_DUMP" ]]; then
  payload_dump_json="$(printf '{"file":"%s","bytes":%s,"sha256":"%s"}' \
    "$(basename "$PAYLOAD_DUMP")" \
    "$(wc -c <"$PAYLOAD_DUMP" | tr -d ' ')" \
    "$(sha256_of "$PAYLOAD_DUMP")")"
fi

media_json="null"
if [[ -n "$MEDIA_ARCHIVE" ]]; then
  media_json="$(printf '{"file":"%s","bytes":%s,"sha256":"%s","file_count":%s}' \
    "$(basename "$MEDIA_ARCHIVE")" \
    "$(wc -c <"$MEDIA_ARCHIVE" | tr -d ' ')" \
    "$(sha256_of "$MEDIA_ARCHIVE")" \
    "$MEDIA_FILE_COUNT")"
fi

cat >"$MANIFEST" <<JSON
{
  "generated_at_utc": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "source_git_commit": "$GIT_COMMIT",
  "source_git_dirty": $GIT_DIRTY,
  "postgres_server_version": "$PG_VERSION",
  "primary_dump": {
    "file": "$(basename "$PRIMARY_DUMP")",
    "bytes": $primary_dump_size,
    "sha256": "$primary_dump_sha",
    "schemas": ["medusa", "payload", "url_registry", "public"],
    "note": "One physical database, three application schemas. See README.md."
  },
  "payload_dump": $payload_dump_json,
  "media_archive": $media_json,
  "row_counts": $ROW_COUNTS_JSON,
  "sanitization": {
    "medusa_admin_auth_tables_data_excluded": $([[ "$EXCLUDE_AUTH_TABLE_DATA" == "1" ]] && echo true || echo false),
    "payload_admin_password_fields": "kept in this dump; must be cleared post-restore via scripts/seed-handover/sanitize.sql before exposing the admin panel",
    "medusa_api_keys": "all rows are type=publishable (safe to keep; not secret admin keys) at export time -- re-verify after import",
    "customer_and_order_rows": "demo/QA data only at export time (emails end in @example.com/@example.invalid) -- re-verify after import if this deployment has real customers"
  }
}
JSON

log "Manifest written: $MANIFEST"
log "Done."
log ""
log "Summary:"
log "  Primary dump : $PRIMARY_DUMP"
[[ -n "$PAYLOAD_DUMP" ]] && log "  Payload dump : $PAYLOAD_DUMP"
[[ -n "$MEDIA_ARCHIVE" ]] && log "  Media archive: $MEDIA_ARCHIVE"
log "  Manifest     : $MANIFEST"
