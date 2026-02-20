#!/usr/bin/env sh
set -eu

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required" >&2
  exit 1
fi

echo "Verifying postgres grants for app/dev roles in running medusa-db container..."

docker compose exec -T medusa-db sh -eu <<'SH'
: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"
: "${POSTGRES_DB:=medusa}"
: "${MEDUSA_APP_DB_USER:=medusa_app}"
: "${MEDUSA_APP_DB_PASSWORD:=medusa_app_change_me}"
: "${MEDUSA_DEV_DB_USER:=medusa_dev}"
: "${MEDUSA_APP_DB_NAME:=${POSTGRES_DB}}"
: "${MEDUSA_APP_DB_SCHEMA:=medusa}"

export PGPASSWORD="$POSTGRES_PASSWORD"

psql --username "$POSTGRES_USER" --dbname postgres \
  -v ON_ERROR_STOP=1 \
  -v app_db="$MEDUSA_APP_DB_NAME" \
  -v app_user="$MEDUSA_APP_DB_USER" \
  -v dev_user="$MEDUSA_DEV_DB_USER" <<'SQL'
SELECT set_config('audit.app_db', :'app_db', false);
SELECT set_config('audit.app_user', :'app_user', false);
SELECT set_config('audit.dev_user', :'dev_user', false);

DO $do$
DECLARE
  app_db text := current_setting('audit.app_db');
  app_user text := current_setting('audit.app_user');
  dev_user text := current_setting('audit.dev_user');
  db_owner text;
  app_role RECORD;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = app_db) THEN
    RAISE EXCEPTION 'expected app database "%" to exist', app_db;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = app_user) THEN
    RAISE EXCEPTION 'expected app role "%" to exist', app_user;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = dev_user) THEN
    RAISE EXCEPTION 'expected dev role "%" to exist', dev_user;
  END IF;

  SELECT rolsuper, rolcreatedb, rolcreaterole
    INTO app_role
  FROM pg_roles
  WHERE rolname = app_user;

  IF app_role.rolsuper OR app_role.rolcreatedb OR app_role.rolcreaterole THEN
    RAISE EXCEPTION 'app role "%" is over-privileged (super/db/role create)', app_user;
  END IF;

  SELECT pg_get_userbyid(datdba)
    INTO db_owner
  FROM pg_database
  WHERE datname = app_db;

  IF db_owner = app_user THEN
    RAISE EXCEPTION 'app role "%" must not own database "%"', app_user, app_db;
  END IF;

  IF NOT has_database_privilege(app_user, app_db, 'CONNECT') THEN
    RAISE EXCEPTION 'app role "%" missing CONNECT on database "%"', app_user, app_db;
  END IF;

  IF has_database_privilege(app_user, app_db, 'CREATE') THEN
    RAISE EXCEPTION 'app role "%" must not have CREATE on database "%"', app_user, app_db;
  END IF;

  IF has_database_privilege(app_user, app_db, 'TEMPORARY') THEN
    RAISE EXCEPTION 'app role "%" must not have TEMPORARY on database "%"', app_user, app_db;
  END IF;

END
$do$;
SQL

psql --username "$POSTGRES_USER" --dbname "$MEDUSA_APP_DB_NAME" \
  -v ON_ERROR_STOP=1 \
  -v app_schema="$MEDUSA_APP_DB_SCHEMA" \
  -v app_user="$MEDUSA_APP_DB_USER" <<'SQL'
SELECT set_config('audit.app_schema', :'app_schema', false);
SELECT set_config('audit.app_user', :'app_user', false);

DO $do$
DECLARE
  app_schema text := current_setting('audit.app_schema');
  app_user text := current_setting('audit.app_user');
  schema_record RECORD;
  has_usage boolean;
  has_create boolean;
BEGIN
  FOR schema_record IN
    SELECT nspname
    FROM pg_namespace
    WHERE nspname <> 'information_schema'
      AND nspname NOT LIKE 'pg_%'
  LOOP
    has_usage := has_schema_privilege(app_user, schema_record.nspname, 'USAGE');
    has_create := has_schema_privilege(app_user, schema_record.nspname, 'CREATE');

    IF schema_record.nspname = app_schema THEN
      IF NOT has_usage OR NOT has_create THEN
        RAISE EXCEPTION
          'app role "%" must have USAGE+CREATE on app schema "%"',
          app_user,
          app_schema;
      END IF;
    ELSE
      IF has_usage OR has_create THEN
        RAISE EXCEPTION
          'app role "%" must not have schema privileges on non-app schema "%" (usage=% create=%)',
          app_user,
          schema_record.nspname,
          has_usage,
          has_create;
      END IF;
    END IF;
  END LOOP;
END
$do$;
SQL

app_search_path="$(PGPASSWORD="$MEDUSA_APP_DB_PASSWORD" psql --username "$MEDUSA_APP_DB_USER" --dbname "$MEDUSA_APP_DB_NAME" -tA -c "SHOW search_path")"
app_search_path_norm="$(printf '%s' "$app_search_path" | tr -d ' ')"
expected_search_path="${MEDUSA_APP_DB_SCHEMA},pg_catalog"

if [ "$app_search_path_norm" != "$expected_search_path" ]; then
  echo "expected app search_path '$expected_search_path', got '$app_search_path'" >&2
  exit 1
fi

echo "search_path OK: $app_search_path"
echo "Grant verification OK."
SH

echo "Done."
