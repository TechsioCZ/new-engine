import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260804220000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "resend_config" add column if not exists "template_mappings" jsonb not null default '{}';`
    )
    this.addSql(
      'alter table if exists "resend_config" add column if not exists "product_review_request_delay_minutes" integer not null default 10080;'
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      'alter table if exists "resend_config" drop column if exists "template_mappings";'
    )
    this.addSql(
      'alter table if exists "resend_config" drop column if exists "product_review_request_delay_minutes";'
    )
  }
}
