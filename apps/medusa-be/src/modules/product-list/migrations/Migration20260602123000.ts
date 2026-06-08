import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260602123000 extends Migration {
  override async up(): Promise<void> {
    // Kept intentionally empty after folding constraints into Migration20260601120000.
  }

  override async down(): Promise<void> {}
}
