import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260712094104 extends Migration {
  override async up(): Promise<void> {
    // ReviewToken is already created by the applied Migration20260610090000.
    // The wanted model delta is removal of the review status default only.
    this.addSql(
      `alter table if exists "review" alter column "status" drop default;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "review" alter column "status" set default 'pending';`
    )
  }
}
