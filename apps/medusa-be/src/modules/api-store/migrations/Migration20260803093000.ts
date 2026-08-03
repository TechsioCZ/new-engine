import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260803093000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      'alter table if exists "api_store" add column if not exists "enabled" boolean not null default true;'
    )
  }

  override async down(): Promise<void> {
    this.addSql('alter table if exists "api_store" drop column if exists "enabled";')
  }
}
