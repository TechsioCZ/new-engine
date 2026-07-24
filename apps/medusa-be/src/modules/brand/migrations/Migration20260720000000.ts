import { Migration } from "@medusajs/framework/mikro-orm/migrations"

const LEGACY_PRODUCER_ENTITY = "Producer"
const LEGACY_PRODUCT_PRODUCER_LINK_ENTITY =
  "LinkProductProductProducerProducer"

export class Migration20260720000000 extends Migration {
  private addConfiguredSearchPath(): void {
    const schema = this.config.get("schema")

    if (
      typeof schema !== "string" ||
      !/^[A-Za-z_][A-Za-z0-9_$]*$/.test(schema)
    ) {
      throw new Error("Brand migration requires a valid configured schema")
    }

    // Queue the resolved schema inside MigrationRunner's transaction. Medusa
    // 2.16's automatic SET LOCAL runs before that transaction and is not retained.
    this.addSql(`SET LOCAL search_path TO "${schema}", pg_catalog;`)
  }

  override async up(): Promise<void> {
    this.addConfiguredSearchPath()
    this.addSql(`
DO $$
DECLARE
  brand_table_count integer;
  producer_table_count integer;
  partition_mapping record;
  partition_oid oid;
  parent_oid oid;
BEGIN
  SELECT count(*) INTO brand_table_count
  FROM (VALUES ('brand'), ('brand_attribute_type'), ('brand_attribute')) AS names(name)
  WHERE to_regclass(format('%I.%I', current_schema(), name)) IS NOT NULL;

  SELECT count(*) INTO producer_table_count
  FROM (VALUES ('producer'), ('producer_attribute_type'), ('producer_attribute')) AS names(name)
  WHERE to_regclass(format('%I.%I', current_schema(), name)) IS NOT NULL;

  IF brand_table_count <> 3 OR producer_table_count <> 0 THEN
    RAISE EXCEPTION
      'Producer Index cleanup aborted: expected complete Brand domain and no Producer domain (brand tables %, producer tables %)',
      brand_table_count,
      producer_table_count;
  END IF;

  IF to_regclass(
    format(
      '%I.%I',
      current_schema(),
      'product_product_producer_producer'
    )
  ) IS NOT NULL THEN
    RAISE EXCEPTION
      'Producer Index cleanup aborted: legacy Producer product link still exists';
  END IF;

  IF to_regclass(format('%I.%I', current_schema(), 'index_relation')) IS NOT NULL THEN
    DELETE FROM "index_relation"
    WHERE pivot IN (
      '${LEGACY_PRODUCER_ENTITY}',
      '${LEGACY_PRODUCT_PRODUCER_LINK_ENTITY}'
    )
       OR parent_name IN (
         '${LEGACY_PRODUCER_ENTITY}',
         '${LEGACY_PRODUCT_PRODUCER_LINK_ENTITY}'
       )
       OR child_name IN (
         '${LEGACY_PRODUCER_ENTITY}',
         '${LEGACY_PRODUCT_PRODUCER_LINK_ENTITY}'
       );
  END IF;

  IF to_regclass(format('%I.%I', current_schema(), 'index_data')) IS NOT NULL THEN
    DELETE FROM "index_data"
    WHERE name IN (
      '${LEGACY_PRODUCER_ENTITY}',
      '${LEGACY_PRODUCT_PRODUCER_LINK_ENTITY}'
    );
  END IF;

  IF to_regclass(format('%I.%I', current_schema(), 'index_metadata')) IS NOT NULL THEN
    DELETE FROM "index_metadata"
    WHERE entity IN (
      '${LEGACY_PRODUCER_ENTITY}',
      '${LEGACY_PRODUCT_PRODUCER_LINK_ENTITY}'
    );
  END IF;

  IF to_regclass(format('%I.%I', current_schema(), 'index_sync')) IS NOT NULL THEN
    DELETE FROM "index_sync"
    WHERE entity IN (
      '${LEGACY_PRODUCER_ENTITY}',
      '${LEGACY_PRODUCT_PRODUCER_LINK_ENTITY}'
    );
  END IF;

  FOR partition_mapping IN
    SELECT *
    FROM (
      VALUES
        (
          'cat_pivot_linkproductproductproducerproducerproducer',
          'index_relation',
          1
        ),
        (
          'cat_pivot_linkproductproductproducerproducerproduct',
          'index_relation',
          2
        ),
        (
          'cat_pivot_productlinkproductproductproducerproducer',
          'index_relation',
          3
        ),
        ('cat_producer', 'index_data', 4),
        ('cat_linkproductproductproducerproducer', 'index_data', 5)
    ) AS expected(partition_name, parent_name, cleanup_order)
    ORDER BY cleanup_order
  LOOP
    partition_oid := to_regclass(
      format('%I.%I', current_schema(), partition_mapping.partition_name)
    );

    IF partition_oid IS NULL THEN
      CONTINUE;
    END IF;

    parent_oid := to_regclass(
      format('%I.%I', current_schema(), partition_mapping.parent_name)
    );

    IF parent_oid IS NULL OR NOT EXISTS (
      SELECT 1
      FROM pg_inherits inheritance
      WHERE inheritance.inhrelid = partition_oid
        AND inheritance.inhparent = parent_oid
    ) THEN
      RAISE EXCEPTION
        'Producer Index cleanup aborted: %.% is not a partition of %.%',
        current_schema(),
        partition_mapping.partition_name,
        current_schema(),
        partition_mapping.parent_name;
    END IF;

    EXECUTE format(
      'DROP TABLE %I.%I',
      current_schema(),
      partition_mapping.partition_name
    );
  END LOOP;

  FOR partition_mapping IN
    SELECT
      root.root_name,
      partition_namespace.nspname AS schema_name,
      partition_class.relname AS partition_name
    FROM (VALUES ('index_data'), ('index_relation')) AS root(root_name)
    CROSS JOIN LATERAL pg_partition_tree(
      to_regclass(format('%I.%I', current_schema(), root.root_name))
    ) AS partition_tree
    JOIN pg_class AS partition_class
      ON partition_class.oid = partition_tree.relid
    JOIN pg_namespace AS partition_namespace
      ON partition_namespace.oid = partition_class.relnamespace
    WHERE to_regclass(
      format('%I.%I', current_schema(), root.root_name)
    ) IS NOT NULL
      AND partition_tree.level > 0
      AND lower(
        coalesce(
          pg_get_expr(
            partition_class.relpartbound,
            partition_class.oid,
            true
          ),
          ''
        )
      ) LIKE '%producer%'
  LOOP
    RAISE EXCEPTION
      'Producer Index cleanup aborted: unexpected Producer-bound partition %.% remains under %',
      partition_mapping.schema_name,
      partition_mapping.partition_name,
      partition_mapping.root_name;
  END LOOP;
END $$;
    `)
  }

  override async down(): Promise<void> {
    // Index data is derived runtime state. Recreating Producer partitions or
    // documents here would manufacture stale data; the active application's
    // Index Module recreates the partitions appropriate for its current graph.
  }
}
