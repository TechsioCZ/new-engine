import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260810101304 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "company" add column if not exists "application_status" text check ("application_status" in ('pending', 'approved', 'rejected')) not null default 'pending', add column if not exists "application_changed_at" timestamptz null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "company" drop column if exists "application_status", drop column if exists "application_changed_at";`);
  }

}
