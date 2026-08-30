#!/usr/bin/env bash
#
# Post-restore hardening + media relocation for the Herbatika demo.
#
# Runs INSIDE the `util` Zerops container, once, after restore-seed.sh:
#   zsc execOnce herbatica_sanitize_v1 -- bash /var/www/util/sanitize-seed.sh
#
# Two jobs:
#   1. Clear the restored Payload admin credentials. The export kept the
#      payload.users row because payload.articles.author_id references it, so the
#      row must survive but its password hash must not.
#   2. Repoint every absolute media URL from the exported deployment's MinIO
#      origin to this project's public object-storage bucket.
set -euo pipefail

log() { printf '[sanitize-seed] %s\n' "$*"; }
die() {
  printf '[sanitize-seed] ERROR: %s\n' "$*" >&2
  exit 1
}

: "${SEED_TARGET_DSN:?SEED_TARGET_DSN is required}"
: "${MEDIA_PUBLIC_BASE_URL:?MEDIA_PUBLIC_BASE_URL is required}"

# The exported deployment served media from this compose-internal origin.
OLD_MEDIA_BASE_URL="${OLD_MEDIA_BASE_URL:-http://medusa-minio:9004/medusa-bucket}"
NEW_MEDIA_BASE_URL="${MEDIA_PUBLIC_BASE_URL%/}"
SANITIZE_SQL="${SANITIZE_SQL:-/var/www/scripts/seed-handover/sanitize.sql}"

command -v psql >/dev/null 2>&1 || die "psql not found"
[[ -f "$SANITIZE_SQL" ]] || die "missing $SANITIZE_SQL"

log "clearing restored Payload admin credentials"
psql "$SEED_TARGET_DSN" -v ON_ERROR_STOP=1 -f "$SANITIZE_SQL"

log "rewriting media URLs -> ${NEW_MEDIA_BASE_URL}"
# Media URLs are spread across Medusa product/image tables and Payload's media
# collection, and the exact column set differs between schema versions. Rather
# than hard-coding a table list that silently misses columns, walk every plain
# text column in the three application schemas and rewrite only those that
# actually contain the old origin.
psql "$SEED_TARGET_DSN" -v ON_ERROR_STOP=1 \
  -v old_base="$OLD_MEDIA_BASE_URL" \
  -v new_base="$NEW_MEDIA_BASE_URL" <<'SQL'
\set ON_ERROR_STOP on
do $rewrite$
declare
  target record;
  old_base constant text := :'old_base';
  new_base constant text := :'new_base';
  touched bigint;
  total bigint := 0;
begin
  for target in
    select c.table_schema, c.table_name, c.column_name
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema = c.table_schema
     and t.table_name = c.table_name
    where c.table_schema in ('medusa', 'payload', 'url_registry')
      and t.table_type = 'BASE TABLE'
      and c.data_type in ('text', 'character varying')
      and c.is_generated = 'NEVER'
      and c.is_updatable = 'YES'
  loop
    execute format(
      'update %I.%I set %I = replace(%I, $1, $2) where %I like $3',
      target.table_schema, target.table_name,
      target.column_name, target.column_name, target.column_name
    ) using old_base, new_base, '%' || old_base || '%';

    get diagnostics touched = row_count;
    if touched > 0 then
      total := total + touched;
      raise notice 'rewrote % row(s) in %.%.%',
        touched, target.table_schema, target.table_name, target.column_name;
    end if;
  end loop;

  raise notice 'media URL rewrite touched % row(s) in total', total;
end
$rewrite$;
SQL

log "verifying no stale media origin remains"
remaining="$(
  psql "$SEED_TARGET_DSN" -Atq -v old_base="$OLD_MEDIA_BASE_URL" <<'SQL'
select count(*)
from payload.media
where url like '%' || :'old_base' || '%';
SQL
)"
[[ "$remaining" == "0" ]] || die "payload.media still has $remaining rows on the old origin"

log "sanitization complete"
log "NEXT: set a Payload admin password with scripts/seed-handover/reset-payload-admin.ts"
