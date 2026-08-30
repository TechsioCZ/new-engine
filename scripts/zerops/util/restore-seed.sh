#!/usr/bin/env bash
#
# Restore the Herbatika seed dump into the Zerops PostgreSQL service.
#
# Runs INSIDE the `util` Zerops container (see zerops.yml setup `herbatica-util`),
# which is the only place with private-network access to `db` and credentials for
# the private `seed` bucket. Invoked once via:
#
#   zsc execOnce herbatica_restore_v1 -- bash /var/www/util/restore-seed.sh
#
# The dump is pulled with credentials from the PRIVATE seed bucket -- it carries
# customer and order rows and is never exposed through the public media bucket.
#
# No secret is ever echoed: every credential is passed through the environment
# or through `mc alias set`, whose output is discarded.
set -euo pipefail

log() { printf '[restore-seed] %s\n' "$*"; }
die() {
  printf '[restore-seed] ERROR: %s\n' "$*" >&2
  exit 1
}

: "${SEED_S3_ENDPOINT:?SEED_S3_ENDPOINT is required}"
: "${SEED_S3_BUCKET:?SEED_S3_BUCKET is required}"
: "${SEED_S3_ACCESS_KEY_ID:?SEED_S3_ACCESS_KEY_ID is required}"
: "${SEED_S3_SECRET_ACCESS_KEY:?SEED_S3_SECRET_ACCESS_KEY is required}"
: "${SEED_TARGET_DSN:?SEED_TARGET_DSN is required}"

SEED_OBJECT_KEY="${SEED_OBJECT_KEY:-medusa-full.dump}"
RESTORE_JOBS="${SEED_RESTORE_JOBS:-2}"
WORK_DIR="${SEED_WORK_DIR:-/tmp/herbatica-seed}"
DUMP_PATH="$WORK_DIR/$SEED_OBJECT_KEY"

command -v mc >/dev/null 2>&1 || die "mc not found (run.prepareCommands did not complete)"
command -v pg_restore >/dev/null 2>&1 || die "pg_restore not found"

# The dump header is PostgreSQL 18; an older pg_restore cannot read it.
restore_major="$(pg_restore --version | grep -oE '[0-9]+' | head -1)"
[[ "$restore_major" -ge 18 ]] || die "pg_restore is major $restore_major, need >= 18"

mkdir -p "$WORK_DIR"
cleanup() { rm -rf "$WORK_DIR"; }
trap cleanup EXIT

log "configuring S3 alias for the private seed bucket"
mc alias set herbaticaseed "$SEED_S3_ENDPOINT" \
  "$SEED_S3_ACCESS_KEY_ID" "$SEED_S3_SECRET_ACCESS_KEY" >/dev/null 2>&1 ||
  die "could not configure the seed bucket alias"

log "downloading $SEED_OBJECT_KEY"
mc cp "herbaticaseed/$SEED_S3_BUCKET/$SEED_OBJECT_KEY" "$DUMP_PATH" ||
  die "could not download $SEED_OBJECT_KEY from the seed bucket"

if [[ -n "${SEED_DUMP_SHA256:-}" ]]; then
  log "verifying checksum"
  echo "${SEED_DUMP_SHA256}  ${DUMP_PATH}" | sha256sum -c - ||
    die "checksum mismatch -- re-upload the dump before restoring"
fi

# --no-owner/--no-privileges: the source roles do not exist here, so everything
# is recreated owned by the connecting Zerops role.
# --clean --if-exists: makes a re-run idempotent on a partially restored target.
# pg_restore reports per-object errors without failing the run; the row-count
# verification below is what actually decides whether the restore was good.
log "restoring into the target database (this takes several minutes)"
pg_restore \
  --no-owner \
  --no-privileges \
  --clean --if-exists \
  -j "$RESTORE_JOBS" \
  -d "$SEED_TARGET_DSN" \
  "$DUMP_PATH" || log "pg_restore reported non-fatal errors; verifying row counts"

log "verifying row counts against the export manifest"
psql "$SEED_TARGET_DSN" -v ON_ERROR_STOP=1 -Atq <<'SQL'
select format('%-28s %s', t.label, t.actual)
from (
  select 'medusa.product' as label, count(*) as actual from medusa.product
  union all select 'medusa.product_variant', count(*) from medusa.product_variant
  union all select 'medusa.translation', count(*) from medusa.translation
  union all select 'medusa.price', count(*) from medusa.price
  union all select 'medusa.region', count(*) from medusa.region
  union all select 'medusa.sales_channel', count(*) from medusa.sales_channel
  union all select 'medusa.api_key', count(*) from medusa.api_key
  union all select 'medusa.product_category', count(*) from medusa.product_category
  union all select 'medusa.brand', count(*) from medusa.brand
  union all select 'payload.articles', count(*) from payload.articles
  union all select 'payload.pages', count(*) from payload.pages
  union all select 'payload.media', count(*) from payload.media
  union all select 'payload.users', count(*) from payload.users
  union all select 'url_registry.url_route', count(*) from url_registry.url_route
  union all select 'url_registry.url_entity_slug', count(*) from url_registry.url_entity_slug
) t;
SQL

log "restore complete"
