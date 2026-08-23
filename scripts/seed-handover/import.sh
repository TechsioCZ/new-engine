#!/usr/bin/env bash
# Seed-database handover: IMPORT
#
# Restores a bundle produced by export.sh into a TARGET Postgres server that
# you control. This script only runs pg_restore (schema + data creation) --
# it never touches the source/live Herbatika deployment.
#
# Usage:
#   TARGET_DATABASE_URL='postgresql://user:pass@host:5432/mydb' \
#     scripts/seed-handover/import.sh /path/to/seed-handover-output/<timestamp>
#
# Required env var:
#   TARGET_DATABASE_URL   DSN of an EMPTY target database (must already exist;
#                          this script does not CREATE DATABASE). The DSN is
#                          used only to invoke pg_restore/psql -- it is never
#                          printed or logged.
#
# Optional env vars:
#   TARGET_PAYLOAD_DATABASE_URL   Only needed if the bundle contains a
#                                 separate payload.dump (i.e. your deployment
#                                 keeps Payload in its own database). If the
#                                 bundle has no payload.dump, this is ignored.
#   JOBS                          Parallel pg_restore jobs. Default: 1
#                                 (custom-format dumps support -j, but keep
#                                 this conservative unless you know your
#                                 target Postgres can handle it).
#
# Requires: pg_restore and psql client tools compatible with the target
# Postgres server (the source was dumped from PostgreSQL 18.x -- see
# manifest.json's postgres_server_version; pg_restore from an equal-or-newer
# major version is the safest bet).

set -euo pipefail

BUNDLE_DIR="${1:-}"
[[ -n "$BUNDLE_DIR" ]] || {
  echo "Usage: TARGET_DATABASE_URL=... $0 <bundle-dir>" >&2
  exit 1
}
[[ -d "$BUNDLE_DIR" ]] || {
  echo "ERROR: bundle dir not found: $BUNDLE_DIR" >&2
  exit 1
}
[[ -n "${TARGET_DATABASE_URL:-}" ]] || {
  echo "ERROR: TARGET_DATABASE_URL is required." >&2
  exit 1
}

JOBS="${JOBS:-1}"

log() { printf '[seed-import] %s\n' "$*"; }
die() {
  printf '[seed-import] ERROR: %s\n' "$*" >&2
  exit 1
}
require_cmd() { command -v "$1" >/dev/null 2>&1 || die "Required command not found: $1"; }

require_cmd pg_restore
require_cmd psql

PRIMARY_DUMP="$BUNDLE_DIR/medusa-full.dump"
PAYLOAD_DUMP="$BUNDLE_DIR/payload.dump"
MEDIA_ARCHIVE="$BUNDLE_DIR/media.tar.gz"
MANIFEST="$BUNDLE_DIR/manifest.json"

[[ -f "$PRIMARY_DUMP" ]] || die "Missing $PRIMARY_DUMP -- is this a valid export.sh bundle dir?"

if [[ -f "$MANIFEST" ]] && command -v sha256sum >/dev/null 2>&1; then
  # head/grep -m1 in a pipeline can trigger SIGPIPE upstream under
  # `set -o pipefail`; do this extraction without piping through head.
  expected="$(grep -A2 -m1 '"primary_dump"' "$MANIFEST" | grep -m1 -oE '"sha256": *"[a-f0-9]{64}"' | grep -oE '[a-f0-9]{64}' || true)"
  actual="$(sha256sum "$PRIMARY_DUMP" | awk '{print $1}')"
  if [[ -n "$expected" && "$expected" != "$actual" ]]; then
    die "Checksum mismatch on $PRIMARY_DUMP (manifest says $expected, got $actual). Re-copy the bundle before restoring."
  fi
  log "Primary dump checksum verified against manifest.json."
fi

log "Restoring primary dump (medusa + payload + url_registry schemas) into TARGET_DATABASE_URL..."
pg_restore \
  --no-owner \
  --no-privileges \
  --clean --if-exists \
  -j "$JOBS" \
  -d "$TARGET_DATABASE_URL" \
  "$PRIMARY_DUMP"
log "Primary restore complete."

if [[ -f "$PAYLOAD_DUMP" ]]; then
  [[ -n "${TARGET_PAYLOAD_DATABASE_URL:-}" ]] || die "$PAYLOAD_DUMP exists but TARGET_PAYLOAD_DATABASE_URL is not set."
  log "Restoring separate Payload dump into TARGET_PAYLOAD_DATABASE_URL..."
  pg_restore \
    --no-owner \
    --no-privileges \
    --clean --if-exists \
    -j "$JOBS" \
    -d "$TARGET_PAYLOAD_DATABASE_URL" \
    "$PAYLOAD_DUMP"
  log "Payload restore complete."
fi

log ""
log "=============================================================="
log " Database restore finished. REQUIRED next steps (manual):"
log "=============================================================="
log ""
log "1) Sanitize Payload admin credentials (mandatory before exposing"
log "   the admin panel -- this dump kept the users row for referential"
log "   integrity but you must clear its password fields yourself):"
log "     psql \"\$TARGET_DATABASE_URL\" -f $(dirname "$0")/sanitize.sql"
log "   Then create a real password with (DATABASE_URL must point at your"
log "   target database when you run this):"
log "     pnpm --dir apps/payload payload run \\"
log "       ../../scripts/seed-handover/reset-payload-admin.ts -- \\"
log "       --email <email> --password <new-password>"
log ""
log "2) Create/verify your Medusa admin user (Medusa's admin-auth tables"
log "   were excluded from the dump on purpose -- see manifest.json):"
log "     SUPERADMIN_EMAIL=you@example.com SUPERADMIN_PASSWORD='...' \\"
log "       npx medusa exec ./src/scripts/create-initial-superadmin.ts"
log "   (run from apps/medusa-be against your target database)"
log ""
log "3) Run outstanding Medusa migrations against the target (safe/idempotent):"
log "     npx medusa db:migrate"
log ""
log "4) Place media: extract $MEDIA_ARCHIVE into your own S3-compatible"
log "   bucket (Payload uses the s3Storage plugin, not local disk), e.g.:"
log "     tar -xzf $MEDIA_ARCHIVE"
log "     mc mirror ./media s3-alias/<your-bucket>"
log "   Point S3_ENDPOINT/S3_BUCKET/S3_REGION/S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY"
log "   at that bucket for the payload service."
log ""
log "5) Rebuild Meilisearch (NOT included in this dump -- it is a derived"
log "   index, not a source of truth):"
log "     npx medusa exec ./src/scripts/search-index.ts full"
log "   (run from apps/medusa-be once MEILISEARCH_HOST/MEILISEARCH_API_KEY"
log "   point at your target Meilisearch instance)"
log ""
log "6) Smoke-check row counts against manifest.json's row_counts block."
log ""
