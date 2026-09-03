-- Seed-database handover: post-restore sanitization.
--
-- Run this ONCE against your freshly restored TARGET database, before
-- exposing the Payload admin panel to anyone:
--
--   psql "$TARGET_DATABASE_URL" -f scripts/seed-handover/sanitize.sql
--
-- What this does and why:
--
-- Medusa's admin-panel password hashes (medusa.provider_identity /
-- medusa.auth_identity and their dependent tables) were already EXCLUDED
-- from the dump at export time (export.sh's EXCLUDE_AUTH_TABLE_DATA=1
-- default) -- those tables exist but are empty in your restored database,
-- so there is nothing to sanitize here for Medusa. Recreate a Medusa admin
-- with:
--   SUPERADMIN_EMAIL=you@example.com SUPERADMIN_PASSWORD='...' \
--     npx medusa exec ./src/scripts/create-initial-superadmin.ts
--
-- Payload's admin user row(s) WERE kept in full (payload.users is
-- referenced by payload.articles.author_id and other tables via foreign
-- keys, so deleting the row would break those references). This script
-- clears only the credential-bearing columns, leaving the row (id, email,
-- name) intact for referential integrity. After running this, nobody can
-- log in with the old password -- use reset-payload-admin.mjs (or Payload's
-- forgot-password email flow, if you have SMTP configured) to set a new one.

begin;

update payload.users
set
  hash = null,
  salt = null,
  reset_password_token = null,
  reset_password_expiration = null,
  api_key = null,
  api_key_index = null,
  login_attempts = 0,
  lock_until = null;

commit;

-- Sanity check: confirms every row's credential columns are now cleared.
select
  count(*) filter (where hash is not null or salt is not null) as rows_still_credentialed,
  count(*) as total_users
from payload.users;
