import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260518122326 extends Migration {

  override async up(): Promise<void> {
    // The generator emitted a public -> medusa table recreation because the
    // previous snapshot used public. Schema moves are handled by DB bootstrap;
    // this migration must only apply the producer model change.
    this.addSql(`
      DO $$
      DECLARE
        duplicate_names text;
      BEGIN
        SELECT string_agg(name, ', ' ORDER BY name)
        INTO duplicate_names
        FROM (
          SELECT name
          FROM "producer_attribute_type"
          WHERE deleted_at IS NULL
          GROUP BY name
          HAVING count(*) > 1
        ) duplicates;

        IF duplicate_names IS NOT NULL THEN
          RAISE EXCEPTION
            'Cannot create unique active producer attribute type name index; duplicate active names exist: %',
            duplicate_names;
        END IF;
      END $$;
    `);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_producer_attribute_type_name_unique" ON "producer_attribute_type" ("name") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "IDX_producer_attribute_type_name_unique";`);
  }

}
