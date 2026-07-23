import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * This branch was never migrated in any environment. GPSR columns remain
 * snake_case and are added only by Migration20260622000002.
 */
export class Migration20260712094103 extends Migration {
  override async up(): Promise<void> {}

  override async down(): Promise<void> {}
}
