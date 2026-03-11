#!/usr/bin/env sh
set -eu

log() {
  printf '[postgres-bootstrap] %s\n' "$1"
}

is_identifier() {
  printf '%s' "$1" | grep -Eq '^[A-Za-z_][A-Za-z0-9_]*$'
}

require_identifier() {
  variable_name="$1"
  variable_value="$2"
  if ! is_identifier "$variable_value"; then
    printf '[postgres-bootstrap] invalid identifier for %s: %s\n' "$variable_name" "$variable_value" >&2
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
: "${MEDUSA_DB_ZANE_OPERATOR_USER:=zane_operator}"
: "${MEDUSA_DB_ZANE_OPERATOR_PASSWORD:=}"
: "${MEDUSA_DB_ZANE_OPERATOR_DB_TEMPLATE_NAME:=template_medusa}"

require_identifier "POSTGRES_USER" "$POSTGRES_USER"
require_identifier "POSTGRES_DB" "$POSTGRES_DB"
require_identifier "MEDUSA_APP_DB_USER" "$MEDUSA_APP_DB_USER"
require_identifier "MEDUSA_DEV_DB_USER" "$MEDUSA_DEV_DB_USER"
require_identifier "MEDUSA_APP_DB_NAME" "$MEDUSA_APP_DB_NAME"
require_identifier "MEDUSA_APP_DB_SCHEMA" "$MEDUSA_APP_DB_SCHEMA"

operator_enabled="0"
if [ -n "$MEDUSA_DB_ZANE_OPERATOR_PASSWORD" ]; then
  require_identifier "MEDUSA_DB_ZANE_OPERATOR_USER" "$MEDUSA_DB_ZANE_OPERATOR_USER"
  require_identifier "MEDUSA_DB_ZANE_OPERATOR_DB_TEMPLATE_NAME" "$MEDUSA_DB_ZANE_OPERATOR_DB_TEMPLATE_NAME"
  if [ "$MEDUSA_DB_ZANE_OPERATOR_USER" = "$POSTGRES_USER" ]; then
    log "Refusing to bootstrap zane-operator onto POSTGRES_USER; configure a dedicated MEDUSA_DB_ZANE_OPERATOR_USER"
    exit 1
  fi
  operator_enabled="1"
else
  log "Skipping zane-operator role bootstrap because MEDUSA_DB_ZANE_OPERATOR_PASSWORD is empty"
fi

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
  -v dev_pass="$MEDUSA_DEV_DB_PASSWORD" \
  -v operator_enabled="$operator_enabled" \
  -v operator_user="$MEDUSA_DB_ZANE_OPERATOR_USER" \
  -v operator_pass="$MEDUSA_DB_ZANE_OPERATOR_PASSWORD" \
  -v operator_template_db="$MEDUSA_DB_ZANE_OPERATOR_DB_TEMPLATE_NAME" <<'SQL'
SELECT set_config('zane.postgres_user', :'postgres_user', false);
SELECT set_config('zane.app_db', :'app_db', false);
SELECT set_config('zane.app_schema', :'app_schema', false);
SELECT set_config('zane.app_user', :'app_user', false);
SELECT set_config('zane.app_pass', :'app_pass', false);
SELECT set_config('zane.dev_user', :'dev_user', false);
SELECT set_config('zane.dev_pass', :'dev_pass', false);
SELECT set_config('zane.operator_enabled', :'operator_enabled', false);
SELECT set_config('zane.operator_user', :'operator_user', false);
SELECT set_config('zane.operator_pass', :'operator_pass', false);
SELECT set_config('zane.operator_template_db', :'operator_template_db', false);

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
  operator_enabled boolean := current_setting('zane.operator_enabled') = '1';
  operator_user text := current_setting('zane.operator_user');
  operator_pass text := current_setting('zane.operator_pass');
  template_db text := current_setting('zane.operator_template_db');
  admin_db text := current_database();
BEGIN
  IF NOT operator_enabled THEN
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = operator_user) THEN
    EXECUTE format('CREATE ROLE %I LOGIN', operator_user);
  END IF;

  EXECUTE format(
    'ALTER ROLE %I WITH LOGIN NOSUPERUSER CREATEDB CREATEROLE NOBYPASSRLS INHERIT PASSWORD %L',
    operator_user,
    operator_pass
  );
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', admin_db, operator_user);
  EXECUTE format('GRANT pg_signal_backend TO %I', operator_user);

  IF EXISTS (SELECT 1 FROM pg_database WHERE datname = template_db) THEN
    EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', template_db, operator_user);
    EXECUTE format('ALTER DATABASE %I OWNER TO %I', template_db, operator_user);
  ELSE
    RAISE NOTICE 'template database "%" does not exist yet; skipping zane-operator owner sync', template_db;
  END IF;
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
  db_record RECORD;
BEGIN
  FOR db_record IN
    SELECT datname
    FROM pg_database
    WHERE datistemplate = false
      AND datname <> app_db
  LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES ON DATABASE %I FROM %I', db_record.datname, app_user);
  END LOOP;

  IF EXISTS (SELECT 1 FROM pg_database WHERE datname = app_db) THEN
    EXECUTE format('ALTER DATABASE %I OWNER TO %I', app_db, postgres_user);
    EXECUTE format('REVOKE ALL PRIVILEGES ON DATABASE %I FROM %I', app_db, app_user);
    EXECUTE format('REVOKE CONNECT, TEMPORARY ON DATABASE %I FROM PUBLIC', app_db);
    EXECUTE format('REVOKE TEMPORARY ON DATABASE %I FROM %I', app_db, app_user);
    EXECUTE format('GRANT CONNECT, CREATE ON DATABASE %I TO %I', app_db, app_user);
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
  public_rel RECORD;
  public_routine RECORD;
  public_type RECORD;
BEGIN
  EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I AUTHORIZATION %I', app_schema, app_user);
  EXECUTE 'REVOKE ALL ON SCHEMA public FROM PUBLIC';

  IF app_schema <> 'public' THEN
    FOR public_rel IN
      SELECT c.oid, c.relkind, c.relname
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN pg_depend d ON d.objid = c.oid AND d.deptype = 'e'
      WHERE n.nspname = 'public'
        AND c.relkind IN ('r', 'p', 'v', 'm', 'f', 'S')
        AND (
          c.relkind <> 'S'
          OR NOT EXISTS (
            SELECT 1
            FROM pg_depend sd
            WHERE sd.classid = 'pg_class'::regclass
              AND sd.objid = c.oid
              AND sd.refclassid = 'pg_class'::regclass
              AND sd.deptype IN ('a', 'i')
          )
        )
        AND d.objid IS NULL
    LOOP
      IF EXISTS (
        SELECT 1
        FROM pg_class c2
        JOIN pg_namespace n2 ON n2.oid = c2.relnamespace
        WHERE n2.nspname = app_schema
          AND c2.relname = public_rel.relname
          AND c2.relkind = public_rel.relkind
      ) THEN
        RAISE EXCEPTION
          'cannot migrate public.% to %.% because target object already exists',
          public_rel.relname,
          app_schema,
          public_rel.relname;
      END IF;

      IF public_rel.relkind IN ('r', 'p') THEN
        EXECUTE format('ALTER TABLE public.%I SET SCHEMA %I', public_rel.relname, app_schema);
      ELSIF public_rel.relkind = 'v' THEN
        EXECUTE format('ALTER VIEW public.%I SET SCHEMA %I', public_rel.relname, app_schema);
      ELSIF public_rel.relkind = 'm' THEN
        EXECUTE format('ALTER MATERIALIZED VIEW public.%I SET SCHEMA %I', public_rel.relname, app_schema);
      ELSIF public_rel.relkind = 'f' THEN
        EXECUTE format('ALTER FOREIGN TABLE public.%I SET SCHEMA %I', public_rel.relname, app_schema);
      ELSIF public_rel.relkind = 'S' THEN
        EXECUTE format('ALTER SEQUENCE public.%I SET SCHEMA %I', public_rel.relname, app_schema);
      END IF;
    END LOOP;

    FOR public_routine IN
      SELECT p.oid::regprocedure AS identity,
             p.proname,
             pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      LEFT JOIN pg_depend d ON d.objid = p.oid AND d.deptype = 'e'
      WHERE n.nspname = 'public'
        AND d.objid IS NULL
    LOOP
      IF EXISTS (
        SELECT 1
        FROM pg_proc p2
        JOIN pg_namespace n2 ON n2.oid = p2.pronamespace
        WHERE n2.nspname = app_schema
          AND p2.proname = public_routine.proname
          AND pg_get_function_identity_arguments(p2.oid) = public_routine.args
      ) THEN
        RAISE EXCEPTION
          'cannot migrate public.%(%) to schema % because target routine already exists',
          public_routine.proname,
          public_routine.args,
          app_schema;
      END IF;

      EXECUTE format('ALTER ROUTINE %s SET SCHEMA %I', public_routine.identity, app_schema);
    END LOOP;

    FOR public_type IN
      SELECT t.typname
      FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      LEFT JOIN pg_depend d ON d.objid = t.oid AND d.deptype = 'e'
      WHERE n.nspname = 'public'
        AND t.typtype IN ('d', 'e')
        AND d.objid IS NULL
    LOOP
      IF EXISTS (
        SELECT 1
        FROM pg_type t2
        JOIN pg_namespace n2 ON n2.oid = t2.typnamespace
        WHERE n2.nspname = app_schema
          AND t2.typname = public_type.typname
      ) THEN
        RAISE EXCEPTION
          'cannot migrate public.% to schema % because target type already exists',
          public_type.typname,
          app_schema;
      END IF;

      EXECUTE format('ALTER TYPE public.%I SET SCHEMA %I', public_type.typname, app_schema);
    END LOOP;
  END IF;

  FOR schema_record IN
    SELECT nspname
    FROM pg_namespace
    WHERE nspname NOT LIKE 'pg_%'
      AND nspname <> 'information_schema'
      AND nspname <> app_schema
  LOOP
    EXECUTE format('REVOKE ALL ON SCHEMA %I FROM %I', schema_record.nspname, app_user);
  END LOOP;

  EXECUTE format('ALTER SCHEMA %I OWNER TO %I', app_schema, app_user);
  EXECUTE format('GRANT USAGE, CREATE ON SCHEMA %I TO %I', app_schema, app_user);
  EXECUTE format('GRANT USAGE ON SCHEMA %I TO %I', app_schema, dev_user);

  FOR rel_record IN
    SELECT c.relkind, c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = app_schema
      AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')
  LOOP
    IF rel_record.relkind IN ('r', 'p', 'f') THEN
      EXECUTE format('ALTER TABLE %I.%I OWNER TO %I', app_schema, rel_record.relname, app_user);
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE %I.%I TO %I', app_schema, rel_record.relname, app_user);
      EXECUTE format('GRANT SELECT ON TABLE %I.%I TO %I', app_schema, rel_record.relname, dev_user);
    ELSIF rel_record.relkind = 'v' THEN
      EXECUTE format('ALTER VIEW %I.%I OWNER TO %I', app_schema, rel_record.relname, app_user);
      EXECUTE format('GRANT SELECT ON TABLE %I.%I TO %I', app_schema, rel_record.relname, app_user);
      EXECUTE format('GRANT SELECT ON TABLE %I.%I TO %I', app_schema, rel_record.relname, dev_user);
    ELSIF rel_record.relkind = 'm' THEN
      EXECUTE format('ALTER MATERIALIZED VIEW %I.%I OWNER TO %I', app_schema, rel_record.relname, app_user);
      EXECUTE format('GRANT SELECT ON TABLE %I.%I TO %I', app_schema, rel_record.relname, app_user);
      EXECUTE format('GRANT SELECT ON TABLE %I.%I TO %I', app_schema, rel_record.relname, dev_user);
    ELSIF rel_record.relkind = 'S' THEN
      EXECUTE format('ALTER SEQUENCE %I.%I OWNER TO %I', app_schema, rel_record.relname, app_user);
      EXECUTE format('GRANT USAGE, SELECT, UPDATE ON SEQUENCE %I.%I TO %I', app_schema, rel_record.relname, app_user);
      EXECUTE format('GRANT SELECT ON SEQUENCE %I.%I TO %I', app_schema, rel_record.relname, dev_user);
    END IF;
  END LOOP;

  FOR routine_record IN
    SELECT p.oid::regprocedure AS identity
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = app_schema
  LOOP
    EXECUTE format('ALTER ROUTINE %s OWNER TO %I', routine_record.identity, app_user);
    EXECUTE format('GRANT EXECUTE ON ROUTINE %s TO %I', routine_record.identity, app_user);
    EXECUTE format('GRANT EXECUTE ON ROUTINE %s TO %I', routine_record.identity, dev_user);
  END LOOP;

  FOR type_record IN
    SELECT t.typname
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = app_schema
      AND t.typtype IN ('d', 'e')
  LOOP
    EXECUTE format('ALTER TYPE %I.%I OWNER TO %I', app_schema, type_record.typname, app_user);
    EXECUTE format('GRANT USAGE ON TYPE %I.%I TO %I', app_schema, type_record.typname, app_user);
    EXECUTE format('GRANT USAGE ON TYPE %I.%I TO %I', app_schema, type_record.typname, dev_user);
  END LOOP;

  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I REVOKE ALL ON TABLES FROM PUBLIC', app_user, app_schema);
  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLES TO %I', app_user, app_schema, app_user);
  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I GRANT SELECT ON TABLES TO %I', app_user, app_schema, dev_user);

  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I REVOKE ALL ON SEQUENCES FROM PUBLIC', app_user, app_schema);
  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO %I', app_user, app_schema, app_user);
  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I GRANT SELECT ON SEQUENCES TO %I', app_user, app_schema, dev_user);

  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I REVOKE ALL ON FUNCTIONS FROM PUBLIC', app_user, app_schema);
  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I GRANT EXECUTE ON FUNCTIONS TO %I', app_user, app_schema, app_user);
  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I GRANT EXECUTE ON FUNCTIONS TO %I', app_user, app_schema, dev_user);

  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I REVOKE ALL ON TYPES FROM PUBLIC', app_user, app_schema);
  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I GRANT USAGE ON TYPES TO %I', app_user, app_schema, app_user);
  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I GRANT USAGE ON TYPES TO %I', app_user, app_schema, dev_user);
END
$do$;
SQL
fi
