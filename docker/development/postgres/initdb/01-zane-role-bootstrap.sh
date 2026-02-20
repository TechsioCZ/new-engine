#!/usr/bin/env sh
set -eu

log() {
  printf '[postgres-init] %s\n' "$1"
}

is_identifier() {
  printf '%s' "$1" | grep -Eq '^[A-Za-z_][A-Za-z0-9_]*$'
}

require_identifier() {
  variable_name="$1"
  variable_value="$2"
  if ! is_identifier "$variable_value"; then
    printf '[postgres-init] invalid identifier for %s: %s\n' "$variable_name" "$variable_value" >&2
    exit 1
  fi
}

: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"
: "${POSTGRES_DB:=medusa}"

: "${ZANE_OPERATOR_DB_USER:=zane_operator}"
: "${ZANE_OPERATOR_DB_PASSWORD:=zane_operator_change_me}"
: "${MEDUSA_APP_DB_USER:=medusa_app}"
: "${MEDUSA_APP_DB_PASSWORD:=medusa_app_change_me}"
: "${MEDUSA_DEV_DB_USER:=medusa_dev}"
: "${MEDUSA_DEV_DB_PASSWORD:=medusa_dev_change_me}"
: "${MEDUSA_APP_DB_NAME:=${POSTGRES_DB}}"

require_identifier "POSTGRES_USER" "$POSTGRES_USER"
require_identifier "POSTGRES_DB" "$POSTGRES_DB"
require_identifier "ZANE_OPERATOR_DB_USER" "$ZANE_OPERATOR_DB_USER"
require_identifier "MEDUSA_APP_DB_USER" "$MEDUSA_APP_DB_USER"
require_identifier "MEDUSA_DEV_DB_USER" "$MEDUSA_DEV_DB_USER"
require_identifier "MEDUSA_APP_DB_NAME" "$MEDUSA_APP_DB_NAME"

export PGPASSWORD="$POSTGRES_PASSWORD"

log "Bootstrapping roles and grants (zane-operator/app/dev)"
psql --username "$POSTGRES_USER" --dbname postgres \
  -v ON_ERROR_STOP=1 \
  -v postgres_user="$POSTGRES_USER" \
  -v app_db="$MEDUSA_APP_DB_NAME" \
  -v zane_user="$ZANE_OPERATOR_DB_USER" \
  -v zane_pass="$ZANE_OPERATOR_DB_PASSWORD" \
  -v app_user="$MEDUSA_APP_DB_USER" \
  -v app_pass="$MEDUSA_APP_DB_PASSWORD" \
  -v dev_user="$MEDUSA_DEV_DB_USER" \
  -v dev_pass="$MEDUSA_DEV_DB_PASSWORD" <<'SQL'
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = :'zane_user') THEN
    EXECUTE format('CREATE ROLE %I LOGIN', :'zane_user');
  END IF;

  EXECUTE format(
    'ALTER ROLE %I WITH LOGIN CREATEDB NOSUPERUSER NOCREATEROLE NOBYPASSRLS INHERIT PASSWORD %L',
    :'zane_user',
    :'zane_pass'
  );
  EXECUTE format('GRANT pg_signal_backend TO %I', :'zane_user');
END
$do$;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = :'app_user') THEN
    EXECUTE format('CREATE ROLE %I LOGIN', :'app_user');
  END IF;

  EXECUTE format(
    'ALTER ROLE %I WITH LOGIN NOCREATEDB NOSUPERUSER NOCREATEROLE NOBYPASSRLS INHERIT PASSWORD %L',
    :'app_user',
    :'app_pass'
  );
END
$do$;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = :'dev_user') THEN
    EXECUTE format('CREATE ROLE %I LOGIN', :'dev_user');
  END IF;

  EXECUTE format(
    'ALTER ROLE %I WITH LOGIN NOCREATEDB NOSUPERUSER NOCREATEROLE NOBYPASSRLS INHERIT PASSWORD %L',
    :'dev_user',
    :'dev_pass'
  );

  EXECUTE format('GRANT pg_read_all_data TO %I', :'dev_user');
  EXECUTE format('GRANT pg_write_all_data TO %I', :'dev_user');
  EXECUTE format('GRANT pg_monitor TO %I', :'dev_user');
END
$do$;

DO $do$
DECLARE
  db_record RECORD;
BEGIN
  FOR db_record IN
    SELECT datname
    FROM pg_database
    WHERE datistemplate = false
  LOOP
    EXECUTE format('GRANT CONNECT, TEMP ON DATABASE %I TO %I', db_record.datname, :'zane_user');
    EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', db_record.datname, :'dev_user');
  END LOOP;
END
$do$;

DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_database WHERE datname = :'app_db') THEN
    EXECUTE format('ALTER DATABASE %I OWNER TO %I', :'app_db', :'app_user');
    EXECUTE format('REVOKE CONNECT ON DATABASE %I FROM PUBLIC', :'app_db');
    EXECUTE format('GRANT CONNECT, TEMP ON DATABASE %I TO %I', :'app_db', :'app_user');
    EXECUTE format('GRANT CONNECT, TEMP ON DATABASE %I TO %I', :'app_db', :'zane_user');
    EXECUTE format('GRANT ALL PRIVILEGES ON DATABASE %I TO %I', :'app_db', :'dev_user');
  END IF;
END
$do$;
SQL

log "Applying schema-level grants on database: ${MEDUSA_APP_DB_NAME}"
app_db_exists="$(psql --username "$POSTGRES_USER" --dbname postgres -tA -c "SELECT 1 FROM pg_database WHERE datname = '${MEDUSA_APP_DB_NAME}'")"
if [ "$app_db_exists" = "1" ]; then
  psql --username "$POSTGRES_USER" --dbname "$MEDUSA_APP_DB_NAME" \
    -v ON_ERROR_STOP=1 \
    -v postgres_user="$POSTGRES_USER" \
    -v app_user="$MEDUSA_APP_DB_USER" \
    -v dev_user="$MEDUSA_DEV_DB_USER" <<'SQL'
  REVOKE CREATE ON SCHEMA public FROM PUBLIC;
  GRANT USAGE, CREATE ON SCHEMA public TO :"app_user";
  GRANT USAGE, CREATE ON SCHEMA public TO :"dev_user";

  GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO :"app_user";
  GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO :"dev_user";
  GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO :"app_user";
  GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO :"dev_user";
  GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO :"app_user";
  GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO :"dev_user";

  ALTER DEFAULT PRIVILEGES FOR ROLE :"app_user" IN SCHEMA public
    GRANT ALL PRIVILEGES ON TABLES TO :"app_user", :"dev_user";
  ALTER DEFAULT PRIVILEGES FOR ROLE :"app_user" IN SCHEMA public
    GRANT ALL PRIVILEGES ON SEQUENCES TO :"app_user", :"dev_user";
  ALTER DEFAULT PRIVILEGES FOR ROLE :"app_user" IN SCHEMA public
    GRANT EXECUTE ON FUNCTIONS TO :"app_user", :"dev_user";

  ALTER DEFAULT PRIVILEGES FOR ROLE :"postgres_user" IN SCHEMA public
    GRANT ALL PRIVILEGES ON TABLES TO :"app_user", :"dev_user";
  ALTER DEFAULT PRIVILEGES FOR ROLE :"postgres_user" IN SCHEMA public
    GRANT ALL PRIVILEGES ON SEQUENCES TO :"app_user", :"dev_user";
  ALTER DEFAULT PRIVILEGES FOR ROLE :"postgres_user" IN SCHEMA public
    GRANT EXECUTE ON FUNCTIONS TO :"app_user", :"dev_user";
SQL
else
  log "Skipping schema grants because database ${MEDUSA_APP_DB_NAME} does not exist"
fi

log "Role bootstrap complete"
