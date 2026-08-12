import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260727152408 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_measurement_unit_id_deleted" ON "product_measurement" ("measurement_unit_id") WHERE deleted_at IS NOT NULL;`);

    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_variant_measurement_product_id_deleted" ON "product_variant_measurement" ("product_measurement_id") WHERE deleted_at IS NOT NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_product_measurement_unit_id_deleted";`);

    this.addSql(`drop index if exists "IDX_product_variant_measurement_product_id_deleted";`);
  }

}
