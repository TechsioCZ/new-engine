import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * The complete state-aware canonical schema transition is owned by
 * Migration20260622000000. This branch-new migration is retained as a no-op so
 * ordering remains explicit until the final generator reconciliation.
 */
export class Migration20260622000001 extends Migration {
  override async up(): Promise<void> {}

  override async down(): Promise<void> {}
}
