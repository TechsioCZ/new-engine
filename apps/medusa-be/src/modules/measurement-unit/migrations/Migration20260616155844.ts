import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260616155844 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "product_variant_measurement" drop constraint if exists "product_variant_measurement_variant_id_product_measurement_id_unique";`);
    this.addSql(`alter table if exists "product_measurement" drop constraint if exists "product_measurement_product_id_unit_id_unique";`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_product_measurement_product_id_unit_id_unique" ON "product_measurement" ("product_id", "measurement_unit_id") WHERE deleted_at IS NULL;`);

    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_product_variant_measurement_variant_id_product_measurement_id_unique" ON "product_variant_measurement" ("product_variant_id", "product_measurement_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_product_measurement_product_id_unit_id_unique";`);

    this.addSql(`drop index if exists "IDX_product_variant_measurement_variant_id_product_measurement_id_unique";`);
  }

}
