import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260622000003 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table if exists "brand" add column if not exists "gpsrContactEmail" text null;`)
    this.addSql(`alter table if exists "brand" add column if not exists "gpsrEuropeanResellerContactEmail" text null;`)
    this.addSql(`alter table if exists "brand" add column if not exists "gpsrEuropeanResellerManufacturingCompanyName" text null;`)
    this.addSql(`alter table if exists "brand" add column if not exists "gpsrEuropeanResellerPostalAddress" text null;`)
    this.addSql(`alter table if exists "brand" add column if not exists "gpsrManufacturedOutsideEu" boolean not null default false;`)
    this.addSql(`alter table if exists "brand" add column if not exists "gpsrManufacturingCompanyName" text null;`)
    this.addSql(`alter table if exists "brand" add column if not exists "gpsrPostalAddress" text null;`)
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "brand" drop column if exists "gpsrPostalAddress";`)
    this.addSql(`alter table if exists "brand" drop column if exists "gpsrManufacturingCompanyName";`)
    this.addSql(`alter table if exists "brand" drop column if exists "gpsrManufacturedOutsideEu";`)
    this.addSql(`alter table if exists "brand" drop column if exists "gpsrEuropeanResellerPostalAddress";`)
    this.addSql(`alter table if exists "brand" drop column if exists "gpsrEuropeanResellerManufacturingCompanyName";`)
    this.addSql(`alter table if exists "brand" drop column if exists "gpsrEuropeanResellerContactEmail";`)
    this.addSql(`alter table if exists "brand" drop column if exists "gpsrContactEmail";`)
  }
}
