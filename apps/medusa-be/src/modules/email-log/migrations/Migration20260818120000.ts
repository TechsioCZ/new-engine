import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260818120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      'alter table "email_webhook_event" add column "event_id" text null;'
    )
    this.addSql(
      'create unique index "IDX_email_webhook_event_event_id_unique" on "email_webhook_event" ("event_id") where "deleted_at" is null and "event_id" is not null;'
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      'drop index "IDX_email_webhook_event_event_id_unique";'
    )
    this.addSql(
      'alter table "email_webhook_event" drop column "event_id";'
    )
  }
}
