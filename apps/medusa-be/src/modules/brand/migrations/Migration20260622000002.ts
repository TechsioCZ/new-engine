import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260622000002 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table if exists "brand" add column if not exists "gpsr_contact_email" text null;`)
    this.addSql(`alter table if exists "brand" add column if not exists "gpsr_european_reseller_contact_email" text null;`)
    this.addSql(`alter table if exists "brand" add column if not exists "gpsr_european_reseller_manufacturing_company_name" text null;`)
    this.addSql(`alter table if exists "brand" add column if not exists "gpsr_european_reseller_postal_address" text null;`)
    this.addSql(`alter table if exists "brand" add column if not exists "gpsr_manufactured_outside_eu" boolean not null default false;`)
    this.addSql(`alter table if exists "brand" add column if not exists "gpsr_manufacturing_company_name" text null;`)
    this.addSql(`alter table if exists "brand" add column if not exists "gpsr_postal_address" text null;`)
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "brand" drop column if exists "gpsr_postal_address";`)
    this.addSql(`alter table if exists "brand" drop column if exists "gpsr_manufacturing_company_name";`)
    this.addSql(`alter table if exists "brand" drop column if exists "gpsr_manufactured_outside_eu";`)
    this.addSql(`alter table if exists "brand" drop column if exists "gpsr_european_reseller_postal_address";`)
    this.addSql(`alter table if exists "brand" drop column if exists "gpsr_european_reseller_manufacturing_company_name";`)
    this.addSql(`alter table if exists "brand" drop column if exists "gpsr_european_reseller_contact_email";`)
    this.addSql(`alter table if exists "brand" drop column if exists "gpsr_contact_email";`)
  }
}
