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

: "${MEDUSA_APP_DB_USER:=medusa_app}"
: "${MEDUSA_APP_DB_PASSWORD:=medusa_app_change_me}"
: "${MEDUSA_DEV_DB_USER:=medusa_dev}"
: "${MEDUSA_DEV_DB_PASSWORD:=medusa_dev_change_me}"
: "${MEDUSA_APP_DB_NAME:=${POSTGRES_DB}}"
: "${MEDUSA_APP_DB_SCHEMA:=medusa}"

require_identifier "POSTGRES_USER" "$POSTGRES_USER"
require_identifier "POSTGRES_DB" "$POSTGRES_DB"
require_identifier "MEDUSA_APP_DB_USER" "$MEDUSA_APP_DB_USER"
require_identifier "MEDUSA_DEV_DB_USER" "$MEDUSA_DEV_DB_USER"
require_identifier "MEDUSA_APP_DB_NAME" "$MEDUSA_APP_DB_NAME"
require_identifier "MEDUSA_APP_DB_SCHEMA" "$MEDUSA_APP_DB_SCHEMA"

export PGPASSWORD="$POSTGRES_PASSWORD"

log "Bootstrapping roles and grants (app/dev)"
psql --username "$POSTGRES_USER" --dbname postgres \
  -v ON_ERROR_STOP=1 \
  -v postgres_user="$POSTGRES_USER" \
  -v app_db="$MEDUSA_APP_DB_NAME" \
  -v app_schema="$MEDUSA_APP_DB_SCHEMA" \
  -v app_user="$MEDUSA_APP_DB_USER" \
  -v app_pass="$MEDUSA_APP_DB_PASSWORD" \
  -v dev_user="$MEDUSA_DEV_DB_USER" \
  -v dev_pass="$MEDUSA_DEV_DB_PASSWORD" <<'SQL'
SELECT set_config('zane.postgres_user', :'postgres_user', false);
SELECT set_config('zane.app_db', :'app_db', false);
SELECT set_config('zane.app_schema', :'app_schema', false);
SELECT set_config('zane.app_user', :'app_user', false);
SELECT set_config('zane.app_pass', :'app_pass', false);
SELECT set_config('zane.dev_user', :'dev_user', false);
SELECT set_config('zane.dev_pass', :'dev_pass', false);

DO $do$
DECLARE
  app_user text := current_setting('zane.app_user');
  app_pass text := current_setting('zane.app_pass');
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = app_user) THEN
    EXECUTE format('CREATE ROLE %I LOGIN', app_user);
  END IF;

  EXECUTE format(
    'ALTER ROLE %I WITH LOGIN NOCREATEDB NOSUPERUSER NOCREATEROLE NOBYPASSRLS INHERIT PASSWORD %L',
    app_user,
    app_pass
  );
END
$do$;

DO $do$
DECLARE
  dev_user text := current_setting('zane.dev_user');
  dev_pass text := current_setting('zane.dev_pass');
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = dev_user) THEN
    EXECUTE format('CREATE ROLE %I LOGIN', dev_user);
  END IF;

  EXECUTE format(
    'ALTER ROLE %I WITH LOGIN NOCREATEDB NOSUPERUSER NOCREATEROLE NOBYPASSRLS INHERIT PASSWORD %L',
    dev_user,
    dev_pass
  );
END
$do$;

DO $do$
DECLARE
  dev_user text := current_setting('zane.dev_user');
  db_record RECORD;
BEGIN
  FOR db_record IN
    SELECT datname
    FROM pg_database
    WHERE datistemplate = false
  LOOP
    EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', db_record.datname, dev_user);
  END LOOP;
END
$do$;

DO $do$
DECLARE
  app_db text := current_setting('zane.app_db');
  app_schema text := current_setting('zane.app_schema');
  app_user text := current_setting('zane.app_user');
  dev_user text := current_setting('zane.dev_user');
  postgres_user text := current_setting('zane.postgres_user');
BEGIN
  IF EXISTS (SELECT 1 FROM pg_database WHERE datname = app_db) THEN
    EXECUTE format('ALTER DATABASE %I OWNER TO %I', app_db, postgres_user);
    EXECUTE format('REVOKE CONNECT, TEMPORARY ON DATABASE %I FROM PUBLIC', app_db);
    EXECUTE format('REVOKE CREATE, TEMPORARY ON DATABASE %I FROM %I', app_db, app_user);
    EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', app_db, app_user);
    EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', app_db, dev_user);
    EXECUTE format(
      'ALTER ROLE %I IN DATABASE %I SET search_path = %I, pg_catalog',
      app_user,
      app_db,
      app_schema
    );
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
    -v app_schema="$MEDUSA_APP_DB_SCHEMA" \
    -v app_user="$MEDUSA_APP_DB_USER" \
    -v dev_user="$MEDUSA_DEV_DB_USER" <<'SQL'
SELECT set_config('zane.postgres_user', :'postgres_user', false);
SELECT set_config('zane.app_schema', :'app_schema', false);
SELECT set_config('zane.app_user', :'app_user', false);
SELECT set_config('zane.dev_user', :'dev_user', false);

DO $do$
DECLARE
  app_schema text := current_setting('zane.app_schema');
  app_user text := current_setting('zane.app_user');
  dev_user text := current_setting('zane.dev_user');
  postgres_user text := current_setting('zane.postgres_user');
  schema_record RECORD;
  rel_record RECORD;
  routine_record RECORD;
  type_record RECORD;
BEGIN
  EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I AUTHORIZATION %I', app_schema, app_user);
  -- Enforce secure schema usage pattern for this database.
  EXECUTE 'REVOKE ALL ON SCHEMA public FROM PUBLIC';

  FOR schema_record IN
    SELECT nspname
    FROM pg_namespace
    WHERE nspname <> 'information_schema'
      AND nspname NOT LIKE 'pg_%'
  LOOP
    EXECUTE format('REVOKE CREATE ON SCHEMA %I FROM PUBLIC', schema_record.nspname);
    EXECUTE format('GRANT USAGE, CREATE ON SCHEMA %I TO %I', schema_record.nspname, dev_user);

    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON ALL TABLES IN SCHEMA %I TO %I',
      schema_record.nspname,
      dev_user
    );
    EXECUTE format('GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA %I TO %I', schema_record.nspname, dev_user);
    EXECUTE format('GRANT EXECUTE ON ALL ROUTINES IN SCHEMA %I TO %I', schema_record.nspname, dev_user);

    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLES TO %I',
      postgres_user,
      schema_record.nspname,
      dev_user
    );
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO %I',
      postgres_user,
      schema_record.nspname,
      dev_user
    );
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I GRANT EXECUTE ON ROUTINES TO %I',
      postgres_user,
      schema_record.nspname,
      dev_user
    );

    IF schema_record.nspname = app_schema THEN
      EXECUTE format('ALTER SCHEMA %I OWNER TO %I', schema_record.nspname, app_user);

      FOR rel_record IN
        SELECT c.oid, c.relkind, n.nspname, c.relname
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        LEFT JOIN pg_depend d ON d.objid = c.oid AND d.deptype = 'e'
        WHERE n.nspname = schema_record.nspname
          AND c.relkind IN ('r', 'p', 'v', 'm', 'f', 'S')
          AND d.objid IS NULL
      LOOP
        IF rel_record.relkind IN ('r', 'p', 'f') THEN
          EXECUTE format('ALTER TABLE %I.%I OWNER TO %I', rel_record.nspname, rel_record.relname, app_user);
        ELSIF rel_record.relkind = 'v' THEN
          EXECUTE format('ALTER VIEW %I.%I OWNER TO %I', rel_record.nspname, rel_record.relname, app_user);
        ELSIF rel_record.relkind = 'm' THEN
          EXECUTE format('ALTER MATERIALIZED VIEW %I.%I OWNER TO %I', rel_record.nspname, rel_record.relname, app_user);
        ELSIF rel_record.relkind = 'S' THEN
          EXECUTE format('ALTER SEQUENCE %I.%I OWNER TO %I', rel_record.nspname, rel_record.relname, app_user);
        END IF;
      END LOOP;

      FOR routine_record IN
        SELECT p.oid::regprocedure AS identity
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        LEFT JOIN pg_depend d ON d.objid = p.oid AND d.deptype = 'e'
        WHERE n.nspname = schema_record.nspname
          AND d.objid IS NULL
      LOOP
        EXECUTE format('ALTER ROUTINE %s OWNER TO %I', routine_record.identity, app_user);
      END LOOP;

      FOR type_record IN
        SELECT format('%I.%I', n.nspname, t.typname) AS identity
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        LEFT JOIN pg_depend d ON d.objid = t.oid AND d.deptype = 'e'
        WHERE n.nspname = schema_record.nspname
          AND t.typtype IN ('d', 'e')
          AND d.objid IS NULL
      LOOP
        EXECUTE format('ALTER TYPE %s OWNER TO %I', type_record.identity, app_user);
      END LOOP;

      EXECUTE format('GRANT USAGE, CREATE ON SCHEMA %I TO %I', schema_record.nspname, app_user);

      EXECUTE format('GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA %I TO %I', schema_record.nspname, app_user);
      EXECUTE format('GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA %I TO %I', schema_record.nspname, app_user);
      EXECUTE format('GRANT EXECUTE ON ALL ROUTINES IN SCHEMA %I TO %I', schema_record.nspname, app_user);

      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I GRANT ALL PRIVILEGES ON TABLES TO %I, %I',
        app_user,
        schema_record.nspname,
        app_user,
        dev_user
      );
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I GRANT ALL PRIVILEGES ON SEQUENCES TO %I, %I',
        app_user,
        schema_record.nspname,
        app_user,
        dev_user
      );
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I GRANT EXECUTE ON ROUTINES TO %I, %I',
        app_user,
        schema_record.nspname,
        app_user,
        dev_user
      );

      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I GRANT ALL PRIVILEGES ON TABLES TO %I, %I',
        postgres_user,
        schema_record.nspname,
        app_user,
        dev_user
      );
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I GRANT ALL PRIVILEGES ON SEQUENCES TO %I, %I',
        postgres_user,
        schema_record.nspname,
        app_user,
        dev_user
      );
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I GRANT EXECUTE ON ROUTINES TO %I, %I',
        postgres_user,
        schema_record.nspname,
        app_user,
        dev_user
      );
    ELSE
      IF EXISTS (
        SELECT 1
        FROM pg_namespace n
        WHERE n.nspname = schema_record.nspname
          AND pg_get_userbyid(n.nspowner) = app_user
      ) THEN
        EXECUTE format('ALTER SCHEMA %I OWNER TO %I', schema_record.nspname, postgres_user);
      END IF;

      FOR rel_record IN
        SELECT c.oid, c.relkind, n.nspname, c.relname
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        LEFT JOIN pg_depend d ON d.objid = c.oid AND d.deptype = 'e'
        WHERE n.nspname = schema_record.nspname
          AND c.relkind IN ('r', 'p', 'v', 'm', 'f', 'S')
          AND d.objid IS NULL
          AND pg_get_userbyid(c.relowner) = app_user
      LOOP
        IF rel_record.relkind IN ('r', 'p', 'f') THEN
          EXECUTE format('ALTER TABLE %I.%I OWNER TO %I', rel_record.nspname, rel_record.relname, postgres_user);
        ELSIF rel_record.relkind = 'v' THEN
          EXECUTE format('ALTER VIEW %I.%I OWNER TO %I', rel_record.nspname, rel_record.relname, postgres_user);
        ELSIF rel_record.relkind = 'm' THEN
          EXECUTE format('ALTER MATERIALIZED VIEW %I.%I OWNER TO %I', rel_record.nspname, rel_record.relname, postgres_user);
        ELSIF rel_record.relkind = 'S' THEN
          EXECUTE format('ALTER SEQUENCE %I.%I OWNER TO %I', rel_record.nspname, rel_record.relname, postgres_user);
        END IF;
      END LOOP;

      FOR routine_record IN
        SELECT p.oid::regprocedure AS identity
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        LEFT JOIN pg_depend d ON d.objid = p.oid AND d.deptype = 'e'
        WHERE n.nspname = schema_record.nspname
          AND d.objid IS NULL
          AND pg_get_userbyid(p.proowner) = app_user
      LOOP
        EXECUTE format('ALTER ROUTINE %s OWNER TO %I', routine_record.identity, postgres_user);
      END LOOP;

      FOR type_record IN
        SELECT format('%I.%I', n.nspname, t.typname) AS identity
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        LEFT JOIN pg_depend d ON d.objid = t.oid AND d.deptype = 'e'
        WHERE n.nspname = schema_record.nspname
          AND t.typtype IN ('d', 'e')
          AND d.objid IS NULL
          AND pg_get_userbyid(t.typowner) = app_user
      LOOP
        EXECUTE format('ALTER TYPE %s OWNER TO %I', type_record.identity, postgres_user);
      END LOOP;

      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I REVOKE ALL PRIVILEGES ON TABLES FROM %I',
        app_user,
        schema_record.nspname,
        app_user
      );
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I REVOKE ALL PRIVILEGES ON SEQUENCES FROM %I',
        app_user,
        schema_record.nspname,
        app_user
      );
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I REVOKE ALL PRIVILEGES ON ROUTINES FROM %I',
        app_user,
        schema_record.nspname,
        app_user
      );
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I REVOKE ALL PRIVILEGES ON TABLES FROM %I',
        postgres_user,
        schema_record.nspname,
        app_user
      );
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I REVOKE ALL PRIVILEGES ON SEQUENCES FROM %I',
        postgres_user,
        schema_record.nspname,
        app_user
      );
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I REVOKE ALL PRIVILEGES ON ROUTINES FROM %I',
        postgres_user,
        schema_record.nspname,
        app_user
      );

      EXECUTE format('REVOKE ALL PRIVILEGES ON SCHEMA %I FROM %I', schema_record.nspname, app_user);
      EXECUTE format('REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA %I FROM %I', schema_record.nspname, app_user);
      EXECUTE format('REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA %I FROM %I', schema_record.nspname, app_user);
      EXECUTE format('REVOKE ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA %I FROM %I', schema_record.nspname, app_user);
    END IF;
  END LOOP;
END
$do$;
SQL
else
  log "Skipping schema grants because database ${MEDUSA_APP_DB_NAME} does not exist"
fi

log "Applying dev grants across all non-template databases and schemas"
db_list="$(psql --username "$POSTGRES_USER" --dbname postgres -tA -c "SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname")"
printf '%s\n' "$db_list" | while IFS= read -r db_name; do
  [ -n "$db_name" ] || continue
  psql --username "$POSTGRES_USER" --dbname "$db_name" \
    -v ON_ERROR_STOP=1 \
    -v dev_user="$MEDUSA_DEV_DB_USER" <<'SQL'
SELECT set_config('zane.dev_user', :'dev_user', false);

DO $do$
DECLARE
  dev_user text := current_setting('zane.dev_user');
  schema_record RECORD;
BEGIN
  FOR schema_record IN
    SELECT nspname
    FROM pg_namespace
    WHERE nspname <> 'information_schema'
      AND nspname NOT LIKE 'pg_%'
  LOOP
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO %I', schema_record.nspname, dev_user);
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON ALL TABLES IN SCHEMA %I TO %I',
      schema_record.nspname,
      dev_user
    );
    EXECUTE format(
      'GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA %I TO %I',
      schema_record.nspname,
      dev_user
    );
    EXECUTE format('GRANT EXECUTE ON ALL ROUTINES IN SCHEMA %I TO %I', schema_record.nspname, dev_user);
  END LOOP;
END
$do$;
SQL
done

log "Role bootstrap complete"
