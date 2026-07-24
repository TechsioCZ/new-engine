import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260724122650 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "api_store" add column if not exists "is_internal" boolean not null default false, add column if not exists "access_token_expires_at" timestamptz null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "api_store" drop column if exists "is_internal", drop column if exists "access_token_expires_at";`);
  }

}
