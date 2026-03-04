import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260219113000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      'alter table if exists "company" add column if not exists "company_identification_number" text null;'
    );
    this.addSql(
      'alter table if exists "company" add column if not exists "vat_identification_number" text null;'
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      'alter table if exists "company" drop column if exists "company_identification_number";'
    );
    this.addSql(
      'alter table if exists "company" drop column if exists "vat_identification_number";'
    );
  }
}
