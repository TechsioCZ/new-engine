import { Migration } from "@medusajs/framework/mikro-orm/migrations"

const PRODUCER_LINK_TABLE = "product_product_producer_producer"
const BRAND_LINK_TABLE = "product_product_brand_brand"

export class Migration20260622000000 extends Migration {
  private addConfiguredSearchPath(): void {
    const schema = this.config.get("schema")

    if (
      typeof schema !== "string" ||
      !/^[A-Za-z_][A-Za-z0-9_$]*$/.test(schema)
    ) {
      throw new Error("Brand migration requires a valid configured schema")
    }

    // Medusa 2.16 applies its automatic SET LOCAL before MigrationRunner opens
    // the transaction. Queue it so this migration's SQL uses the resolved schema
    // on the same transaction and connection.
    this.addSql(`SET LOCAL search_path TO "${schema}", pg_catalog;`)
  }

  override async up(): Promise<void> {
    this.addConfiguredSearchPath()
    this.addSql(`
DO $$
DECLARE
  legacy_table_count integer;
  brand_table_count integer;
  producer_count bigint;
  producer_active_count bigint;
  attribute_type_count bigint;
  attribute_type_active_count bigint;
  attribute_count bigint;
  attribute_active_count bigint;
  link_count bigint;
  link_active_count bigint;
  producer_oid oid;
  attribute_type_oid oid;
  attribute_oid oid;
  link_oid oid;
  old_link_exists boolean;
  new_link_exists boolean;
  old_tracker_count integer;
  new_tracker_count integer;
  tracked_descriptor jsonb;
  not_null_mapping record;
  actual_not_null_name text;
BEGIN
  SELECT count(*) INTO legacy_table_count
  FROM (VALUES ('producer'), ('producer_attribute_type'), ('producer_attribute')) AS names(name)
  WHERE to_regclass(format('%I.%I', current_schema(), name)) IS NOT NULL;

  SELECT count(*) INTO brand_table_count
  FROM (VALUES ('brand'), ('brand_attribute_type'), ('brand_attribute')) AS names(name)
  WHERE to_regclass(format('%I.%I', current_schema(), name)) IS NOT NULL;

  IF legacy_table_count NOT IN (0, 3) THEN
    RAISE EXCEPTION
      'Producer to brand migration aborted: partial legacy domain state (% of 3 tables)',
      legacy_table_count;
  END IF;

  IF brand_table_count NOT IN (0, 3) THEN
    RAISE EXCEPTION
      'Producer to brand migration aborted: partial brand domain state (% of 3 tables)',
      brand_table_count;
  END IF;

  IF legacy_table_count = 3 AND brand_table_count = 3 THEN
    RAISE EXCEPTION
      'Producer to brand migration aborted: both complete producer and brand domains exist';
  END IF;

  old_link_exists :=
    to_regclass(format('%I.%I', current_schema(), '${PRODUCER_LINK_TABLE}')) IS NOT NULL;
  new_link_exists :=
    to_regclass(format('%I.%I', current_schema(), '${BRAND_LINK_TABLE}')) IS NOT NULL;

  IF old_link_exists AND new_link_exists THEN
    RAISE EXCEPTION
      'Producer to brand migration aborted: both generated link tables exist';
  END IF;

  IF to_regclass(format('%I.%I', current_schema(), 'link_module_migrations')) IS NOT NULL THEN
    SELECT
      count(*) FILTER (WHERE table_name = '${PRODUCER_LINK_TABLE}'),
      count(*) FILTER (WHERE table_name = '${BRAND_LINK_TABLE}')
    INTO old_tracker_count, new_tracker_count
    FROM "link_module_migrations";
  ELSE
    old_tracker_count := 0;
    new_tracker_count := 0;
  END IF;

  IF old_tracker_count > 1 OR new_tracker_count > 1 OR
     (old_tracker_count > 0 AND new_tracker_count > 0) THEN
    RAISE EXCEPTION
      'Producer to brand migration aborted: ambiguous generated link tracking rows (producer %, brand %)',
      old_tracker_count,
      new_tracker_count;
  END IF;

  IF old_link_exists <> (old_tracker_count = 1) THEN
    RAISE EXCEPTION
      'Producer to brand migration aborted: producer link table/tracker mismatch (table %, tracker rows %)',
      old_link_exists,
      old_tracker_count;
  END IF;

  IF new_link_exists <> (new_tracker_count = 1) THEN
    RAISE EXCEPTION
      'Producer to brand migration aborted: brand link table/tracker mismatch (table %, tracker rows %)',
      new_link_exists,
      new_tracker_count;
  END IF;

  IF (legacy_table_count = 3 AND new_link_exists) OR
     (brand_table_count = 3 AND old_link_exists) OR
     (legacy_table_count = 0 AND brand_table_count = 0 AND
       (old_link_exists OR new_link_exists)) THEN
    RAISE EXCEPTION
      'Producer to brand migration aborted: domain/link semantic state mismatch (producer tables %, brand tables %, producer link %, brand link %)',
      legacy_table_count,
      brand_table_count,
      old_link_exists,
      new_link_exists;
  END IF;

  IF legacy_table_count = 3 THEN
    IF EXISTS (
      SELECT 1
      FROM "producer_attribute" attribute
      LEFT JOIN "producer" producer ON producer.id = attribute.producer_id
      WHERE producer.id IS NULL
    ) OR EXISTS (
      SELECT 1
      FROM "producer_attribute" attribute
      LEFT JOIN "producer_attribute_type" attribute_type
        ON attribute_type.id = attribute.attribute_type_id
      WHERE attribute_type.id IS NULL
    ) THEN
      RAISE EXCEPTION
        'Producer to brand migration aborted: orphan producer attributes exist';
    END IF;

    IF old_link_exists AND (
      EXISTS (
        SELECT 1
        FROM "${PRODUCER_LINK_TABLE}" link
        LEFT JOIN "product" product ON product.id = link.product_id
        WHERE product.id IS NULL
      ) OR EXISTS (
        SELECT 1
        FROM "${PRODUCER_LINK_TABLE}" link
        LEFT JOIN "producer" producer ON producer.id = link.producer_id
        WHERE producer.id IS NULL
      )
    ) THEN
      RAISE EXCEPTION
        'Producer to brand migration aborted: orphan producer product links exist';
    END IF;

    SELECT
      count(*),
      count(*) FILTER (WHERE deleted_at IS NULL),
      'producer'::regclass::oid
    INTO producer_count, producer_active_count, producer_oid
    FROM "producer";
    SELECT
      count(*),
      count(*) FILTER (WHERE deleted_at IS NULL),
      'producer_attribute_type'::regclass::oid
    INTO attribute_type_count, attribute_type_active_count, attribute_type_oid
    FROM "producer_attribute_type";
    SELECT
      count(*),
      count(*) FILTER (WHERE deleted_at IS NULL),
      'producer_attribute'::regclass::oid
    INTO attribute_count, attribute_active_count, attribute_oid
    FROM "producer_attribute";

    IF old_link_exists THEN
      SELECT
        count(*),
        count(*) FILTER (WHERE deleted_at IS NULL),
        '${PRODUCER_LINK_TABLE}'::regclass::oid
      INTO link_count, link_active_count, link_oid
      FROM "${PRODUCER_LINK_TABLE}";
    END IF;

    ALTER TABLE "producer" RENAME TO "brand";
    ALTER TABLE "producer_attribute_type" RENAME TO "brand_attribute_type";
    ALTER TABLE "producer_attribute" RENAME TO "brand_attribute";
    ALTER TABLE "brand_attribute" RENAME COLUMN "producer_id" TO "brand_id";

    ALTER TABLE "brand" RENAME CONSTRAINT "producer_pkey" TO "brand_pkey";
    ALTER INDEX "IDX_producer_deleted_at" RENAME TO "IDX_brand_deleted_at";
    ALTER INDEX "IDX_producer_handle_unique" RENAME TO "IDX_brand_handle_unique";

    ALTER TABLE "brand_attribute_type"
      RENAME CONSTRAINT "producer_attribute_type_pkey" TO "brand_attribute_type_pkey";
    ALTER INDEX "IDX_producer_attribute_type_deleted_at"
      RENAME TO "IDX_brand_attribute_type_deleted_at";
    ALTER INDEX "IDX_producer_attribute_type_name_unique"
      RENAME TO "IDX_brand_attribute_type_name_unique";

    ALTER TABLE "brand_attribute"
      RENAME CONSTRAINT "producer_attribute_pkey" TO "brand_attribute_pkey";
    ALTER TABLE "brand_attribute"
      RENAME CONSTRAINT "producer_attribute_attribute_type_id_foreign"
      TO "brand_attribute_attribute_type_id_foreign";
    ALTER TABLE "brand_attribute"
      RENAME CONSTRAINT "producer_attribute_producer_id_foreign"
      TO "brand_attribute_brand_id_foreign";
    ALTER INDEX "IDX_producer_attribute_attribute_type_id"
      RENAME TO "IDX_brand_attribute_attribute_type_id";
    ALTER INDEX "IDX_producer_attribute_producer_id"
      RENAME TO "IDX_brand_attribute_brand_id";
    ALTER INDEX "IDX_producer_attribute_deleted_at"
      RENAME TO "IDX_brand_attribute_deleted_at";

    IF old_link_exists THEN
      SELECT link_descriptor::jsonb
      INTO tracked_descriptor
      FROM "link_module_migrations"
      WHERE table_name = '${PRODUCER_LINK_TABLE}';

      IF jsonb_typeof(tracked_descriptor) IS DISTINCT FROM 'object' OR
         tracked_descriptor ->> 'fromModule' IS DISTINCT FROM 'product' OR
         tracked_descriptor ->> 'fromModel' IS DISTINCT FROM 'product' OR
         tracked_descriptor ->> 'toModule' IS DISTINCT FROM 'producer' OR
         tracked_descriptor ->> 'toModel' IS DISTINCT FROM 'producer' THEN
        RAISE EXCEPTION
          'Producer to brand migration aborted: unexpected producer link descriptor %',
          tracked_descriptor;
      END IF;

      ALTER TABLE "${PRODUCER_LINK_TABLE}" RENAME TO "${BRAND_LINK_TABLE}";
      ALTER TABLE "${BRAND_LINK_TABLE}" RENAME COLUMN "producer_id" TO "brand_id";
      ALTER TABLE "${BRAND_LINK_TABLE}"
        RENAME CONSTRAINT "product_product_producer_producer_pkey"
        TO "product_product_brand_brand_pkey";
      ALTER INDEX "IDX_id_1de2c574c" RENAME TO "IDX_id_29c624132";
      ALTER INDEX "IDX_product_id_1de2c574c"
        RENAME TO "IDX_product_id_29c624132";
      ALTER INDEX "IDX_producer_id_1de2c574c"
        RENAME TO "IDX_brand_id_29c624132";
      ALTER INDEX "IDX_deleted_at_1de2c574c"
        RENAME TO "IDX_deleted_at_29c624132";

      UPDATE "link_module_migrations"
      SET
        table_name = '${BRAND_LINK_TABLE}',
        link_descriptor = (
          link_descriptor::jsonb ||
          '{"toModule": "brand", "toModel": "brand"}'::jsonb
        )
      WHERE table_name = '${PRODUCER_LINK_TABLE}';
    END IF;

    IF 'brand'::regclass::oid <> producer_oid OR
       'brand_attribute_type'::regclass::oid <> attribute_type_oid OR
       'brand_attribute'::regclass::oid <> attribute_oid THEN
      RAISE EXCEPTION
        'Producer to brand migration verification failed: domain table identity changed';
    END IF;

    IF (SELECT count(*) FROM "brand") <> producer_count OR
       (SELECT count(*) FROM "brand" WHERE deleted_at IS NULL) <> producer_active_count OR
       (SELECT count(*) FROM "brand_attribute_type") <> attribute_type_count OR
       (SELECT count(*) FROM "brand_attribute_type" WHERE deleted_at IS NULL) <> attribute_type_active_count OR
       (SELECT count(*) FROM "brand_attribute") <> attribute_count OR
       (SELECT count(*) FROM "brand_attribute" WHERE deleted_at IS NULL) <> attribute_active_count THEN
      RAISE EXCEPTION
        'Producer to brand migration verification failed: domain row counts changed';
    END IF;

    IF old_link_exists AND (
      '${BRAND_LINK_TABLE}'::regclass::oid <> link_oid OR
      (SELECT count(*) FROM "${BRAND_LINK_TABLE}") <> link_count OR
      (SELECT count(*) FROM "${BRAND_LINK_TABLE}" WHERE deleted_at IS NULL) <> link_active_count
    ) THEN
      RAISE EXCEPTION
        'Producer to brand migration verification failed: product link identity or counts changed';
    END IF;
  ELSIF brand_table_count = 0 THEN
    CREATE TABLE "brand" (
      "id" text NOT NULL,
      "title" text NOT NULL,
      "handle" text NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      "deleted_at" timestamptz NULL,
      CONSTRAINT "brand_pkey" PRIMARY KEY ("id")
    );
    CREATE INDEX "IDX_brand_deleted_at"
      ON "brand" ("deleted_at") WHERE deleted_at IS NULL;
    CREATE UNIQUE INDEX "IDX_brand_handle_unique"
      ON "brand" ("handle") WHERE deleted_at IS NULL;

    CREATE TABLE "brand_attribute_type" (
      "id" text NOT NULL,
      "name" text NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      "deleted_at" timestamptz NULL,
      CONSTRAINT "brand_attribute_type_pkey" PRIMARY KEY ("id")
    );
    CREATE INDEX "IDX_brand_attribute_type_deleted_at"
      ON "brand_attribute_type" ("deleted_at") WHERE deleted_at IS NULL;
    CREATE UNIQUE INDEX "IDX_brand_attribute_type_name_unique"
      ON "brand_attribute_type" ("name") WHERE deleted_at IS NULL;

    CREATE TABLE "brand_attribute" (
      "id" text NOT NULL,
      "value" text NOT NULL,
      "attribute_type_id" text NOT NULL,
      "brand_id" text NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      "deleted_at" timestamptz NULL,
      CONSTRAINT "brand_attribute_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "brand_attribute_attribute_type_id_foreign"
        FOREIGN KEY ("attribute_type_id") REFERENCES "brand_attribute_type" ("id")
        ON UPDATE CASCADE,
      CONSTRAINT "brand_attribute_brand_id_foreign"
        FOREIGN KEY ("brand_id") REFERENCES "brand" ("id")
        ON UPDATE CASCADE
    );
    CREATE INDEX "IDX_brand_attribute_attribute_type_id"
      ON "brand_attribute" ("attribute_type_id") WHERE deleted_at IS NULL;
    CREATE INDEX "IDX_brand_attribute_brand_id"
      ON "brand_attribute" ("brand_id") WHERE deleted_at IS NULL;
    CREATE INDEX "IDX_brand_attribute_deleted_at"
      ON "brand_attribute" ("deleted_at") WHERE deleted_at IS NULL;
  END IF;

  -- PostgreSQL 18 represents NOT NULL declarations as named constraints.
  -- Table and column renames retain their old names, so canonicalize those
  -- catalog objects as part of the semantic rename.
  FOR not_null_mapping IN
      SELECT *
      FROM (
        VALUES
          ('brand', 'id', 'producer_id_not_null', 'brand_id_not_null', false, false),
          ('brand', 'title', 'producer_title_not_null', 'brand_title_not_null', false, false),
          ('brand', 'handle', 'producer_handle_not_null', 'brand_handle_not_null', false, false),
          ('brand', 'created_at', 'producer_created_at_not_null', 'brand_created_at_not_null', false, false),
          ('brand', 'updated_at', 'producer_updated_at_not_null', 'brand_updated_at_not_null', false, false),
          (
            'brand',
            'gpsr_manufactured_outside_eu',
            'producer_gpsr_manufactured_outside_eu_not_null',
            'brand_gpsr_manufactured_outside_eu_not_null',
            false,
            true
          ),
          ('brand_attribute_type', 'id', 'producer_attribute_type_id_not_null', 'brand_attribute_type_id_not_null', false, false),
          ('brand_attribute_type', 'name', 'producer_attribute_type_name_not_null', 'brand_attribute_type_name_not_null', false, false),
          ('brand_attribute_type', 'created_at', 'producer_attribute_type_created_at_not_null', 'brand_attribute_type_created_at_not_null', false, false),
          ('brand_attribute_type', 'updated_at', 'producer_attribute_type_updated_at_not_null', 'brand_attribute_type_updated_at_not_null', false, false),
          ('brand_attribute', 'id', 'producer_attribute_id_not_null', 'brand_attribute_id_not_null', false, false),
          ('brand_attribute', 'value', 'producer_attribute_value_not_null', 'brand_attribute_value_not_null', false, false),
          ('brand_attribute', 'attribute_type_id', 'producer_attribute_attribute_type_id_not_null', 'brand_attribute_attribute_type_id_not_null', false, false),
          ('brand_attribute', 'brand_id', 'producer_attribute_producer_id_not_null', 'brand_attribute_brand_id_not_null', false, false),
          ('brand_attribute', 'created_at', 'producer_attribute_created_at_not_null', 'brand_attribute_created_at_not_null', false, false),
          ('brand_attribute', 'updated_at', 'producer_attribute_updated_at_not_null', 'brand_attribute_updated_at_not_null', false, false),
          ('${BRAND_LINK_TABLE}', 'product_id', '${PRODUCER_LINK_TABLE}_product_id_not_null', '${BRAND_LINK_TABLE}_product_id_not_null', true, false),
          ('${BRAND_LINK_TABLE}', 'brand_id', '${PRODUCER_LINK_TABLE}_producer_id_not_null', '${BRAND_LINK_TABLE}_brand_id_not_null', true, false),
          ('${BRAND_LINK_TABLE}', 'id', '${PRODUCER_LINK_TABLE}_id_not_null', '${BRAND_LINK_TABLE}_id_not_null', true, false),
          ('${BRAND_LINK_TABLE}', 'created_at', '${PRODUCER_LINK_TABLE}_created_at_not_null', '${BRAND_LINK_TABLE}_created_at_not_null', true, false),
          ('${BRAND_LINK_TABLE}', 'updated_at', '${PRODUCER_LINK_TABLE}_updated_at_not_null', '${BRAND_LINK_TABLE}_updated_at_not_null', true, false)
      ) AS mappings(
        table_name,
        column_name,
        legacy_name,
        canonical_name,
        optional_table,
        optional_column
      )
    LOOP
      IF to_regclass(
        format('%I.%I', current_schema(), not_null_mapping.table_name)
      ) IS NULL THEN
        IF not_null_mapping.optional_table THEN
          CONTINUE;
        END IF;

        RAISE EXCEPTION
          'Producer to brand migration verification failed: table % is missing while canonicalizing NOT NULL constraints',
          not_null_mapping.table_name;
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = not_null_mapping.table_name
          AND column_name = not_null_mapping.column_name
      ) THEN
        IF not_null_mapping.optional_column THEN
          CONTINUE;
        END IF;

        RAISE EXCEPTION
          'Producer to brand migration verification failed: column %.% is missing while canonicalizing NOT NULL constraints',
          not_null_mapping.table_name,
          not_null_mapping.column_name;
      END IF;

      SELECT constraint_record.conname
      INTO actual_not_null_name
      FROM pg_constraint constraint_record
      JOIN pg_class table_record
        ON table_record.oid = constraint_record.conrelid
      JOIN pg_namespace table_namespace
        ON table_namespace.oid = table_record.relnamespace
      JOIN pg_attribute column_record
        ON column_record.attrelid = table_record.oid
        AND constraint_record.conkey = ARRAY[column_record.attnum]::smallint[]
      WHERE table_namespace.nspname = current_schema()
        AND table_record.relname = not_null_mapping.table_name
        AND column_record.attname = not_null_mapping.column_name
        AND constraint_record.contype = 'n';

      IF actual_not_null_name = not_null_mapping.legacy_name THEN
        EXECUTE format(
          'ALTER TABLE %I.%I RENAME CONSTRAINT %I TO %I',
          current_schema(),
          not_null_mapping.table_name,
          actual_not_null_name,
          not_null_mapping.canonical_name
        );
      ELSIF actual_not_null_name IS DISTINCT FROM not_null_mapping.canonical_name THEN
        RAISE EXCEPTION
          'Producer to brand migration verification failed: unexpected NOT NULL constraint for %.% (actual %, expected % or %)',
          not_null_mapping.table_name,
          not_null_mapping.column_name,
          actual_not_null_name,
          not_null_mapping.legacy_name,
          not_null_mapping.canonical_name;
      END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM (
      VALUES
        ('brand', 'id', 'text', 'NO'),
        ('brand', 'title', 'text', 'NO'),
        ('brand', 'handle', 'text', 'NO'),
        ('brand', 'created_at', 'timestamp with time zone', 'NO'),
        ('brand', 'updated_at', 'timestamp with time zone', 'NO'),
        ('brand', 'deleted_at', 'timestamp with time zone', 'YES'),
        ('brand_attribute_type', 'id', 'text', 'NO'),
        ('brand_attribute_type', 'name', 'text', 'NO'),
        ('brand_attribute_type', 'created_at', 'timestamp with time zone', 'NO'),
        ('brand_attribute_type', 'updated_at', 'timestamp with time zone', 'NO'),
        ('brand_attribute_type', 'deleted_at', 'timestamp with time zone', 'YES'),
        ('brand_attribute', 'id', 'text', 'NO'),
        ('brand_attribute', 'value', 'text', 'NO'),
        ('brand_attribute', 'attribute_type_id', 'text', 'NO'),
        ('brand_attribute', 'brand_id', 'text', 'NO'),
        ('brand_attribute', 'created_at', 'timestamp with time zone', 'NO'),
        ('brand_attribute', 'updated_at', 'timestamp with time zone', 'NO'),
        ('brand_attribute', 'deleted_at', 'timestamp with time zone', 'YES')
    ) AS expected(table_name, column_name, data_type, is_nullable)
    WHERE NOT EXISTS (
      SELECT 1
      FROM information_schema.columns actual
      WHERE actual.table_schema = current_schema()
        AND actual.table_name = expected.table_name
        AND actual.column_name = expected.column_name
        AND actual.data_type = expected.data_type
        AND actual.is_nullable = expected.is_nullable
    )
  ) OR EXISTS (
    SELECT 1
    FROM information_schema.columns actual
    WHERE actual.table_schema = current_schema()
      AND actual.table_name IN ('brand', 'brand_attribute_type', 'brand_attribute')
      AND NOT EXISTS (
        SELECT 1
        FROM (
          VALUES
            ('brand', 'id'),
            ('brand', 'title'),
            ('brand', 'handle'),
            ('brand', 'created_at'),
            ('brand', 'updated_at'),
            ('brand', 'deleted_at'),
            ('brand', 'gpsr_contact_email'),
            ('brand', 'gpsr_european_reseller_contact_email'),
            (
              'brand',
              'gpsr_european_reseller_manufacturing_company_name'
            ),
            ('brand', 'gpsr_european_reseller_postal_address'),
            ('brand', 'gpsr_manufactured_outside_eu'),
            ('brand', 'gpsr_manufacturing_company_name'),
            ('brand', 'gpsr_postal_address'),
            ('brand_attribute_type', 'id'),
            ('brand_attribute_type', 'name'),
            ('brand_attribute_type', 'created_at'),
            ('brand_attribute_type', 'updated_at'),
            ('brand_attribute_type', 'deleted_at'),
            ('brand_attribute', 'id'),
            ('brand_attribute', 'value'),
            ('brand_attribute', 'attribute_type_id'),
            ('brand_attribute', 'brand_id'),
            ('brand_attribute', 'created_at'),
            ('brand_attribute', 'updated_at'),
            ('brand_attribute', 'deleted_at')
        ) AS expected(table_name, column_name)
        WHERE expected.table_name = actual.table_name
          AND expected.column_name = actual.column_name
      )
  ) THEN
    RAISE EXCEPTION
      'Producer to brand migration verification failed: canonical brand column shape differs';
  END IF;

  IF (
    SELECT count(*)
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'brand'
      AND column_name IN (
        'gpsr_contact_email',
        'gpsr_european_reseller_contact_email',
        'gpsr_european_reseller_manufacturing_company_name',
        'gpsr_european_reseller_postal_address',
        'gpsr_manufactured_outside_eu',
        'gpsr_manufacturing_company_name',
        'gpsr_postal_address'
      )
  ) NOT IN (0, 7) OR EXISTS (
    SELECT 1
    FROM information_schema.columns actual
    WHERE actual.table_schema = current_schema()
      AND actual.table_name = 'brand'
      AND actual.column_name IN (
        'gpsr_contact_email',
        'gpsr_european_reseller_contact_email',
        'gpsr_european_reseller_manufacturing_company_name',
        'gpsr_european_reseller_postal_address',
        'gpsr_manufactured_outside_eu',
        'gpsr_manufacturing_company_name',
        'gpsr_postal_address'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM (
          VALUES
            ('gpsr_contact_email', 'text', 'YES', NULL::text),
            (
              'gpsr_european_reseller_contact_email',
              'text',
              'YES',
              NULL::text
            ),
            (
              'gpsr_european_reseller_manufacturing_company_name',
              'text',
              'YES',
              NULL::text
            ),
            (
              'gpsr_european_reseller_postal_address',
              'text',
              'YES',
              NULL::text
            ),
            (
              'gpsr_manufactured_outside_eu',
              'boolean',
              'NO',
              'false'
            ),
            ('gpsr_manufacturing_company_name', 'text', 'YES', NULL::text),
            ('gpsr_postal_address', 'text', 'YES', NULL::text)
        ) AS expected(column_name, data_type, is_nullable, column_default)
        WHERE expected.column_name = actual.column_name
          AND expected.data_type = actual.data_type
          AND expected.is_nullable = actual.is_nullable
          AND expected.column_default IS NOT DISTINCT FROM actual.column_default
      )
  ) THEN
    RAISE EXCEPTION
      'Producer to brand migration verification failed: retained GPSR column shape differs';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (
      VALUES
        ('brand', 'id', NULL::text),
        ('brand', 'title', NULL::text),
        ('brand', 'handle', NULL::text),
        ('brand', 'created_at', 'now()'),
        ('brand', 'updated_at', 'now()'),
        ('brand', 'deleted_at', NULL::text),
        ('brand_attribute_type', 'id', NULL::text),
        ('brand_attribute_type', 'name', NULL::text),
        ('brand_attribute_type', 'created_at', 'now()'),
        ('brand_attribute_type', 'updated_at', 'now()'),
        ('brand_attribute_type', 'deleted_at', NULL::text),
        ('brand_attribute', 'id', NULL::text),
        ('brand_attribute', 'value', NULL::text),
        ('brand_attribute', 'attribute_type_id', NULL::text),
        ('brand_attribute', 'brand_id', NULL::text),
        ('brand_attribute', 'created_at', 'now()'),
        ('brand_attribute', 'updated_at', 'now()'),
        ('brand_attribute', 'deleted_at', NULL::text)
    ) AS expected(table_name, column_name, column_default)
    JOIN information_schema.columns actual
      ON actual.table_schema = current_schema()
      AND actual.table_name = expected.table_name
      AND actual.column_name = expected.column_name
    WHERE expected.column_default IS DISTINCT FROM actual.column_default
  ) THEN
    RAISE EXCEPTION
      'Producer to brand migration verification failed: canonical column defaults differ';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'brand_attribute'
      AND column_name = 'brand_id'
  ) OR NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'brand_attribute'
      AND column_name = 'attribute_type_id'
  ) THEN
    RAISE EXCEPTION
      'Producer to brand migration verification failed: canonical brand columns are missing';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (
      VALUES
        (
          'brand_attribute_brand_id_foreign',
          'brand_id',
          'brand',
          'id'
        ),
        (
          'brand_attribute_attribute_type_id_foreign',
          'attribute_type_id',
          'brand_attribute_type',
          'id'
        )
    ) AS expected(constraint_name, local_column, target_table, target_column)
    WHERE NOT EXISTS (
      SELECT 1
      FROM pg_constraint constraint_record
      JOIN pg_class local_table
        ON local_table.oid = constraint_record.conrelid
      JOIN pg_namespace local_namespace
        ON local_namespace.oid = local_table.relnamespace
      JOIN pg_class target_table
        ON target_table.oid = constraint_record.confrelid
      JOIN pg_namespace target_namespace
        ON target_namespace.oid = target_table.relnamespace
      JOIN pg_attribute local_column
        ON local_column.attrelid = local_table.oid
        AND local_column.attnum = ANY (constraint_record.conkey)
      JOIN pg_attribute target_column
        ON target_column.attrelid = target_table.oid
        AND target_column.attnum = ANY (constraint_record.confkey)
      WHERE local_namespace.nspname = current_schema()
        AND local_table.relname = 'brand_attribute'
        AND constraint_record.conname = expected.constraint_name
        AND constraint_record.contype = 'f'
        AND cardinality(constraint_record.conkey) = 1
        AND cardinality(constraint_record.confkey) = 1
        AND local_column.attname = expected.local_column
        AND target_table.relname = expected.target_table
        AND target_namespace.nspname = current_schema()
        AND target_column.attname = expected.target_column
        AND constraint_record.confupdtype = 'c'
        AND constraint_record.confdeltype = 'a'
    )
  ) THEN
    RAISE EXCEPTION
      'Producer to brand migration verification failed: canonical foreign keys differ';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (
      VALUES
        ('brand_pkey', 'brand'),
        ('brand_attribute_type_pkey', 'brand_attribute_type'),
        ('brand_attribute_pkey', 'brand_attribute')
    ) AS expected(constraint_name, table_name)
    WHERE NOT EXISTS (
      SELECT 1
      FROM pg_constraint constraint_record
      JOIN pg_class table_record
        ON table_record.oid = constraint_record.conrelid
      JOIN pg_namespace table_namespace
        ON table_namespace.oid = table_record.relnamespace
      JOIN pg_attribute column_record
        ON column_record.attrelid = table_record.oid
        AND column_record.attnum = ANY (constraint_record.conkey)
      WHERE table_namespace.nspname = current_schema()
        AND table_record.relname = expected.table_name
        AND constraint_record.conname = expected.constraint_name
        AND constraint_record.contype = 'p'
        AND cardinality(constraint_record.conkey) = 1
        AND column_record.attname = 'id'
    )
  ) THEN
    RAISE EXCEPTION
      'Producer to brand migration verification failed: canonical primary keys differ';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (
      VALUES
        ('IDX_brand_deleted_at', 'brand', 'deleted_at', false),
        ('IDX_brand_handle_unique', 'brand', 'handle', true),
        (
          'IDX_brand_attribute_type_deleted_at',
          'brand_attribute_type',
          'deleted_at',
          false
        ),
        (
          'IDX_brand_attribute_type_name_unique',
          'brand_attribute_type',
          'name',
          true
        ),
        (
          'IDX_brand_attribute_attribute_type_id',
          'brand_attribute',
          'attribute_type_id',
          false
        ),
        ('IDX_brand_attribute_brand_id', 'brand_attribute', 'brand_id', false),
        (
          'IDX_brand_attribute_deleted_at',
          'brand_attribute',
          'deleted_at',
          false
        )
    ) AS expected(index_name, table_name, column_name, is_unique)
    WHERE NOT EXISTS (
      SELECT 1
      FROM pg_index index_record
      JOIN pg_class index_class ON index_class.oid = index_record.indexrelid
      JOIN pg_class table_class ON table_class.oid = index_record.indrelid
      JOIN pg_namespace table_namespace
        ON table_namespace.oid = table_class.relnamespace
      JOIN pg_attribute column_record
        ON column_record.attrelid = table_class.oid
        AND column_record.attnum = ANY (index_record.indkey::smallint[])
      WHERE table_namespace.nspname = current_schema()
        AND index_class.relname = expected.index_name
        AND table_class.relname = expected.table_name
        AND column_record.attname = expected.column_name
        AND index_record.indnkeyatts = 1
        AND index_record.indisunique = expected.is_unique
        AND pg_get_expr(index_record.indpred, index_record.indrelid) =
          '(deleted_at IS NULL)'
    )
  ) THEN
    RAISE EXCEPTION
      'Producer to brand migration verification failed: canonical indexes differ';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "brand_attribute" attribute
    LEFT JOIN "brand" brand ON brand.id = attribute.brand_id
    WHERE brand.id IS NULL
  ) OR EXISTS (
    SELECT 1
    FROM "brand_attribute" attribute
    LEFT JOIN "brand_attribute_type" attribute_type
      ON attribute_type.id = attribute.attribute_type_id
    WHERE attribute_type.id IS NULL
  ) THEN
    RAISE EXCEPTION
      'Producer to brand migration verification failed: orphan brand attributes exist';
  END IF;

  IF new_link_exists OR old_link_exists THEN
    SELECT link_descriptor::jsonb
    INTO tracked_descriptor
    FROM "link_module_migrations"
    WHERE table_name = '${BRAND_LINK_TABLE}';

    IF jsonb_typeof(tracked_descriptor) IS DISTINCT FROM 'object' OR
       tracked_descriptor ->> 'fromModule' IS DISTINCT FROM 'product' OR
       tracked_descriptor ->> 'fromModel' IS DISTINCT FROM 'product' OR
       tracked_descriptor ->> 'toModule' IS DISTINCT FROM 'brand' OR
       tracked_descriptor ->> 'toModel' IS DISTINCT FROM 'brand' THEN
      RAISE EXCEPTION
        'Producer to brand migration verification failed: unexpected brand link descriptor %',
          tracked_descriptor;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM (
        VALUES
          ('id', 'character varying', 255, 'NO', NULL::text),
          ('product_id', 'character varying', 255, 'NO', NULL::text),
          ('brand_id', 'character varying', 255, 'NO', NULL::text),
          (
            'created_at',
            'timestamp with time zone',
            NULL::integer,
            'NO',
            'CURRENT_TIMESTAMP'
          ),
          (
            'updated_at',
            'timestamp with time zone',
            NULL::integer,
            'NO',
            'CURRENT_TIMESTAMP'
          ),
          (
            'deleted_at',
            'timestamp with time zone',
            NULL::integer,
            'YES',
            NULL::text
          )
      ) AS expected(
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
      )
      WHERE NOT EXISTS (
        SELECT 1
        FROM information_schema.columns actual
        WHERE actual.table_schema = current_schema()
          AND actual.table_name = '${BRAND_LINK_TABLE}'
          AND actual.column_name = expected.column_name
          AND actual.data_type = expected.data_type
          AND actual.character_maximum_length
            IS NOT DISTINCT FROM expected.character_maximum_length
          AND actual.is_nullable = expected.is_nullable
          AND actual.column_default IS NOT DISTINCT FROM expected.column_default
      )
    ) OR EXISTS (
      SELECT 1
      FROM information_schema.columns actual
      WHERE actual.table_schema = current_schema()
        AND actual.table_name = '${BRAND_LINK_TABLE}'
        AND actual.column_name NOT IN (
          'id',
          'product_id',
          'brand_id',
          'created_at',
          'updated_at',
          'deleted_at'
        )
    ) OR NOT EXISTS (
      SELECT 1
      FROM pg_constraint constraint_record
      JOIN pg_class table_record
        ON table_record.oid = constraint_record.conrelid
      JOIN pg_namespace table_namespace
        ON table_namespace.oid = table_record.relnamespace
      WHERE table_namespace.nspname = current_schema()
        AND table_record.relname = '${BRAND_LINK_TABLE}'
        AND constraint_record.conname = 'product_product_brand_brand_pkey'
        AND constraint_record.contype = 'p'
        AND cardinality(constraint_record.conkey) = 2
        AND (
          SELECT count(*)
          FROM pg_attribute column_record
          WHERE column_record.attrelid = table_record.oid
            AND column_record.attnum = ANY (constraint_record.conkey)
            AND column_record.attname IN ('product_id', 'brand_id')
        ) = 2
    ) OR EXISTS (
      SELECT 1
      FROM (
        VALUES
          ('IDX_id_29c624132', 'id', NULL::text),
          (
            'IDX_product_id_29c624132',
            'product_id',
            '(deleted_at IS NULL)'
          ),
          ('IDX_brand_id_29c624132', 'brand_id', '(deleted_at IS NULL)'),
          ('IDX_deleted_at_29c624132', 'deleted_at', NULL::text)
      ) AS expected(index_name, column_name, predicate)
      WHERE NOT EXISTS (
        SELECT 1
        FROM pg_index index_record
        JOIN pg_class index_class
          ON index_class.oid = index_record.indexrelid
        JOIN pg_class table_class
          ON table_class.oid = index_record.indrelid
        JOIN pg_namespace table_namespace
          ON table_namespace.oid = table_class.relnamespace
        JOIN pg_attribute column_record
          ON column_record.attrelid = table_class.oid
          AND column_record.attnum = ANY (index_record.indkey::smallint[])
        WHERE table_namespace.nspname = current_schema()
          AND table_class.relname = '${BRAND_LINK_TABLE}'
          AND index_class.relname = expected.index_name
          AND index_record.indnkeyatts = 1
          AND NOT index_record.indisunique
          AND column_record.attname = expected.column_name
          AND pg_get_expr(index_record.indpred, index_record.indrelid)
            IS NOT DISTINCT FROM expected.predicate
      )
    ) THEN
      RAISE EXCEPTION
        'Producer to brand migration verification failed: canonical generated link schema differs';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM "${BRAND_LINK_TABLE}" link
      LEFT JOIN "product" product ON product.id = link.product_id
      WHERE product.id IS NULL
    ) OR EXISTS (
      SELECT 1
      FROM "${BRAND_LINK_TABLE}" link
      LEFT JOIN "brand" brand ON brand.id = link.brand_id
      WHERE brand.id IS NULL
    ) THEN
      RAISE EXCEPTION
        'Producer to brand migration verification failed: orphan brand product links exist';
    END IF;
  END IF;
END $$;
    `)
  }

  override async down(): Promise<void> {
    this.addConfiguredSearchPath()
    this.addSql(`
DO $$
DECLARE
  producer_table_count integer;
  brand_table_count integer;
  old_link_exists boolean;
  new_link_exists boolean;
  old_tracker_count integer;
  new_tracker_count integer;
  tracked_descriptor jsonb;
  not_null_mapping record;
  actual_not_null_name text;
BEGIN
  SELECT count(*) INTO producer_table_count
  FROM (VALUES ('producer'), ('producer_attribute_type'), ('producer_attribute')) AS names(name)
  WHERE to_regclass(format('%I.%I', current_schema(), name)) IS NOT NULL;

  SELECT count(*) INTO brand_table_count
  FROM (VALUES ('brand'), ('brand_attribute_type'), ('brand_attribute')) AS names(name)
  WHERE to_regclass(format('%I.%I', current_schema(), name)) IS NOT NULL;

  IF producer_table_count NOT IN (0, 3) OR brand_table_count NOT IN (0, 3) THEN
    RAISE EXCEPTION
      'Brand to producer rollback aborted: partial domain state (producer %, brand %)',
      producer_table_count,
      brand_table_count;
  END IF;

  IF producer_table_count = 3 AND brand_table_count = 3 THEN
    RAISE EXCEPTION
      'Brand to producer rollback aborted: both complete producer and brand domains exist';
  END IF;

  old_link_exists :=
    to_regclass(format('%I.%I', current_schema(), '${PRODUCER_LINK_TABLE}')) IS NOT NULL;
  new_link_exists :=
    to_regclass(format('%I.%I', current_schema(), '${BRAND_LINK_TABLE}')) IS NOT NULL;

  IF old_link_exists AND new_link_exists THEN
    RAISE EXCEPTION
      'Brand to producer rollback aborted: both generated link tables exist';
  END IF;

  IF to_regclass(format('%I.%I', current_schema(), 'link_module_migrations')) IS NOT NULL THEN
    SELECT
      count(*) FILTER (WHERE table_name = '${PRODUCER_LINK_TABLE}'),
      count(*) FILTER (WHERE table_name = '${BRAND_LINK_TABLE}')
    INTO old_tracker_count, new_tracker_count
    FROM "link_module_migrations";
  ELSE
    old_tracker_count := 0;
    new_tracker_count := 0;
  END IF;

  IF old_tracker_count > 1 OR new_tracker_count > 1 OR
     (old_tracker_count > 0 AND new_tracker_count > 0) OR
     old_link_exists <> (old_tracker_count = 1) OR
     new_link_exists <> (new_tracker_count = 1) THEN
    RAISE EXCEPTION
      'Brand to producer rollback aborted: ambiguous link table/tracker state';
  END IF;

  IF (producer_table_count = 3 AND new_link_exists) OR
     (brand_table_count = 3 AND old_link_exists) OR
     (producer_table_count = 0 AND brand_table_count = 0 AND
       (old_link_exists OR new_link_exists)) THEN
    RAISE EXCEPTION
      'Brand to producer rollback aborted: domain/link semantic state mismatch (producer tables %, brand tables %, producer link %, brand link %)',
      producer_table_count,
      brand_table_count,
      old_link_exists,
      new_link_exists;
  END IF;

  IF brand_table_count = 3 THEN
    IF EXISTS (
      SELECT 1
      FROM "brand_attribute" attribute
      LEFT JOIN "brand" brand ON brand.id = attribute.brand_id
      WHERE brand.id IS NULL
    ) OR EXISTS (
      SELECT 1
      FROM "brand_attribute" attribute
      LEFT JOIN "brand_attribute_type" attribute_type
        ON attribute_type.id = attribute.attribute_type_id
      WHERE attribute_type.id IS NULL
    ) THEN
      RAISE EXCEPTION
        'Brand to producer rollback aborted: orphan brand attributes exist';
    END IF;

    ALTER TABLE "brand" RENAME TO "producer";
    ALTER TABLE "brand_attribute_type" RENAME TO "producer_attribute_type";
    ALTER TABLE "brand_attribute" RENAME TO "producer_attribute";
    ALTER TABLE "producer_attribute" RENAME COLUMN "brand_id" TO "producer_id";

    ALTER TABLE "producer" RENAME CONSTRAINT "brand_pkey" TO "producer_pkey";
    ALTER INDEX "IDX_brand_deleted_at" RENAME TO "IDX_producer_deleted_at";
    ALTER INDEX "IDX_brand_handle_unique" RENAME TO "IDX_producer_handle_unique";

    ALTER TABLE "producer_attribute_type"
      RENAME CONSTRAINT "brand_attribute_type_pkey" TO "producer_attribute_type_pkey";
    ALTER INDEX "IDX_brand_attribute_type_deleted_at"
      RENAME TO "IDX_producer_attribute_type_deleted_at";
    ALTER INDEX "IDX_brand_attribute_type_name_unique"
      RENAME TO "IDX_producer_attribute_type_name_unique";

    ALTER TABLE "producer_attribute"
      RENAME CONSTRAINT "brand_attribute_pkey" TO "producer_attribute_pkey";
    ALTER TABLE "producer_attribute"
      RENAME CONSTRAINT "brand_attribute_attribute_type_id_foreign"
      TO "producer_attribute_attribute_type_id_foreign";
    ALTER TABLE "producer_attribute"
      RENAME CONSTRAINT "brand_attribute_brand_id_foreign"
      TO "producer_attribute_producer_id_foreign";
    ALTER INDEX "IDX_brand_attribute_attribute_type_id"
      RENAME TO "IDX_producer_attribute_attribute_type_id";
    ALTER INDEX "IDX_brand_attribute_brand_id"
      RENAME TO "IDX_producer_attribute_producer_id";
    ALTER INDEX "IDX_brand_attribute_deleted_at"
      RENAME TO "IDX_producer_attribute_deleted_at";

    IF new_link_exists THEN
      SELECT link_descriptor::jsonb
      INTO tracked_descriptor
      FROM "link_module_migrations"
      WHERE table_name = '${BRAND_LINK_TABLE}';

      IF jsonb_typeof(tracked_descriptor) IS DISTINCT FROM 'object' OR
         tracked_descriptor ->> 'fromModule' IS DISTINCT FROM 'product' OR
         tracked_descriptor ->> 'fromModel' IS DISTINCT FROM 'product' OR
         tracked_descriptor ->> 'toModule' IS DISTINCT FROM 'brand' OR
         tracked_descriptor ->> 'toModel' IS DISTINCT FROM 'brand' THEN
        RAISE EXCEPTION
          'Brand to producer rollback aborted: unexpected brand link descriptor %',
          tracked_descriptor;
      END IF;

      ALTER TABLE "${BRAND_LINK_TABLE}" RENAME TO "${PRODUCER_LINK_TABLE}";
      ALTER TABLE "${PRODUCER_LINK_TABLE}" RENAME COLUMN "brand_id" TO "producer_id";
      ALTER TABLE "${PRODUCER_LINK_TABLE}"
        RENAME CONSTRAINT "product_product_brand_brand_pkey"
        TO "product_product_producer_producer_pkey";
      ALTER INDEX "IDX_id_29c624132" RENAME TO "IDX_id_1de2c574c";
      ALTER INDEX "IDX_product_id_29c624132"
        RENAME TO "IDX_product_id_1de2c574c";
      ALTER INDEX "IDX_brand_id_29c624132"
        RENAME TO "IDX_producer_id_1de2c574c";
      ALTER INDEX "IDX_deleted_at_29c624132"
        RENAME TO "IDX_deleted_at_1de2c574c";

      UPDATE "link_module_migrations"
      SET
        table_name = '${PRODUCER_LINK_TABLE}',
        link_descriptor = (
          link_descriptor::jsonb ||
          '{"toModule": "producer", "toModel": "producer"}'::jsonb
        )
      WHERE table_name = '${BRAND_LINK_TABLE}';
    END IF;
  ELSIF producer_table_count = 0 THEN
    RETURN;
  END IF;

  FOR not_null_mapping IN
      SELECT *
      FROM (
        VALUES
          ('producer', 'id', 'brand_id_not_null', 'producer_id_not_null', false, false),
          ('producer', 'title', 'brand_title_not_null', 'producer_title_not_null', false, false),
          ('producer', 'handle', 'brand_handle_not_null', 'producer_handle_not_null', false, false),
          ('producer', 'created_at', 'brand_created_at_not_null', 'producer_created_at_not_null', false, false),
          ('producer', 'updated_at', 'brand_updated_at_not_null', 'producer_updated_at_not_null', false, false),
          (
            'producer',
            'gpsr_manufactured_outside_eu',
            'brand_gpsr_manufactured_outside_eu_not_null',
            'producer_gpsr_manufactured_outside_eu_not_null',
            false,
            true
          ),
          ('producer_attribute_type', 'id', 'brand_attribute_type_id_not_null', 'producer_attribute_type_id_not_null', false, false),
          ('producer_attribute_type', 'name', 'brand_attribute_type_name_not_null', 'producer_attribute_type_name_not_null', false, false),
          ('producer_attribute_type', 'created_at', 'brand_attribute_type_created_at_not_null', 'producer_attribute_type_created_at_not_null', false, false),
          ('producer_attribute_type', 'updated_at', 'brand_attribute_type_updated_at_not_null', 'producer_attribute_type_updated_at_not_null', false, false),
          ('producer_attribute', 'id', 'brand_attribute_id_not_null', 'producer_attribute_id_not_null', false, false),
          ('producer_attribute', 'value', 'brand_attribute_value_not_null', 'producer_attribute_value_not_null', false, false),
          ('producer_attribute', 'attribute_type_id', 'brand_attribute_attribute_type_id_not_null', 'producer_attribute_attribute_type_id_not_null', false, false),
          ('producer_attribute', 'producer_id', 'brand_attribute_brand_id_not_null', 'producer_attribute_producer_id_not_null', false, false),
          ('producer_attribute', 'created_at', 'brand_attribute_created_at_not_null', 'producer_attribute_created_at_not_null', false, false),
          ('producer_attribute', 'updated_at', 'brand_attribute_updated_at_not_null', 'producer_attribute_updated_at_not_null', false, false),
          ('${PRODUCER_LINK_TABLE}', 'product_id', '${BRAND_LINK_TABLE}_product_id_not_null', '${PRODUCER_LINK_TABLE}_product_id_not_null', true, false),
          ('${PRODUCER_LINK_TABLE}', 'producer_id', '${BRAND_LINK_TABLE}_brand_id_not_null', '${PRODUCER_LINK_TABLE}_producer_id_not_null', true, false),
          ('${PRODUCER_LINK_TABLE}', 'id', '${BRAND_LINK_TABLE}_id_not_null', '${PRODUCER_LINK_TABLE}_id_not_null', true, false),
          ('${PRODUCER_LINK_TABLE}', 'created_at', '${BRAND_LINK_TABLE}_created_at_not_null', '${PRODUCER_LINK_TABLE}_created_at_not_null', true, false),
          ('${PRODUCER_LINK_TABLE}', 'updated_at', '${BRAND_LINK_TABLE}_updated_at_not_null', '${PRODUCER_LINK_TABLE}_updated_at_not_null', true, false)
      ) AS mappings(
        table_name,
        column_name,
        brand_name,
        canonical_name,
        optional_table,
        optional_column
      )
    LOOP
      IF to_regclass(
        format('%I.%I', current_schema(), not_null_mapping.table_name)
      ) IS NULL THEN
        IF not_null_mapping.optional_table THEN
          CONTINUE;
        END IF;

        RAISE EXCEPTION
          'Brand to producer rollback verification failed: table % is missing while canonicalizing NOT NULL constraints',
          not_null_mapping.table_name;
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = not_null_mapping.table_name
          AND column_name = not_null_mapping.column_name
      ) THEN
        IF not_null_mapping.optional_column THEN
          CONTINUE;
        END IF;

        RAISE EXCEPTION
          'Brand to producer rollback verification failed: column %.% is missing while canonicalizing NOT NULL constraints',
          not_null_mapping.table_name,
          not_null_mapping.column_name;
      END IF;

      SELECT constraint_record.conname
      INTO actual_not_null_name
      FROM pg_constraint constraint_record
      JOIN pg_class table_record
        ON table_record.oid = constraint_record.conrelid
      JOIN pg_namespace table_namespace
        ON table_namespace.oid = table_record.relnamespace
      JOIN pg_attribute column_record
        ON column_record.attrelid = table_record.oid
        AND constraint_record.conkey = ARRAY[column_record.attnum]::smallint[]
      WHERE table_namespace.nspname = current_schema()
        AND table_record.relname = not_null_mapping.table_name
        AND column_record.attname = not_null_mapping.column_name
        AND constraint_record.contype = 'n';

      IF actual_not_null_name = not_null_mapping.brand_name THEN
        EXECUTE format(
          'ALTER TABLE %I.%I RENAME CONSTRAINT %I TO %I',
          current_schema(),
          not_null_mapping.table_name,
          actual_not_null_name,
          not_null_mapping.canonical_name
        );
      ELSIF actual_not_null_name IS DISTINCT FROM not_null_mapping.canonical_name THEN
        RAISE EXCEPTION
          'Brand to producer rollback verification failed: unexpected NOT NULL constraint for %.% (actual %, expected % or %)',
          not_null_mapping.table_name,
          not_null_mapping.column_name,
          actual_not_null_name,
          not_null_mapping.brand_name,
          not_null_mapping.canonical_name;
      END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM "producer_attribute" attribute
    LEFT JOIN "producer" producer ON producer.id = attribute.producer_id
    WHERE producer.id IS NULL
  ) OR EXISTS (
    SELECT 1
    FROM "producer_attribute" attribute
    LEFT JOIN "producer_attribute_type" attribute_type
      ON attribute_type.id = attribute.attribute_type_id
    WHERE attribute_type.id IS NULL
  ) THEN
    RAISE EXCEPTION
      'Brand to producer rollback verification failed: orphan producer attributes exist';
  END IF;
END $$;
    `)
  }
}
