import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260804180000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      'alter table if exists "ppl_config" add column if not exists "widget_api_key" text null;'
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      'alter table if exists "ppl_config" drop column if exists "widget_api_key";'
    )
  }
}
