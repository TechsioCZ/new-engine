import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260821120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "resend_config" add column if not exists "market_configurations" jsonb not null default '{}';`
    )
    this.addSql(
      `update "resend_config" set "is_enabled" = false where "is_enabled" = true and "market_configurations" = '{}'::jsonb;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      'alter table if exists "resend_config" drop column if exists "market_configurations";'
    )
  }
}
