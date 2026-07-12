import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260712094103 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "brand" drop column if exists "gpsr_contact_email", drop column if exists "gpsr_european_reseller_contact_email", drop column if exists "gpsr_european_reseller_manufacturing_company_name", drop column if exists "gpsr_european_reseller_postal_address", drop column if exists "gpsr_manufacturing_company_name", drop column if exists "gpsr_postal_address";`);

    this.addSql(`alter table if exists "brand" add column if not exists "gpsrContactEmail" text null, add column if not exists "gpsrEuropeanResellerContactEmail" text null, add column if not exists "gpsrEuropeanResellerManufacturingCompanyName" text null, add column if not exists "gpsrEuropeanResellerPostalAddress" text null, add column if not exists "gpsrManufacturingCompanyName" text null, add column if not exists "gpsrPostalAddress" text null;`);
    this.addSql(`alter table if exists "brand" rename column "gpsr_manufactured_outside_eu" to "gpsrManufacturedOutsideEu";`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "brand" drop column if exists "gpsrContactEmail", drop column if exists "gpsrEuropeanResellerContactEmail", drop column if exists "gpsrEuropeanResellerManufacturingCompanyName", drop column if exists "gpsrEuropeanResellerPostalAddress", drop column if exists "gpsrManufacturingCompanyName", drop column if exists "gpsrPostalAddress";`);

    this.addSql(`alter table if exists "brand" add column if not exists "gpsr_contact_email" text null, add column if not exists "gpsr_european_reseller_contact_email" text null, add column if not exists "gpsr_european_reseller_manufacturing_company_name" text null, add column if not exists "gpsr_european_reseller_postal_address" text null, add column if not exists "gpsr_manufacturing_company_name" text null, add column if not exists "gpsr_postal_address" text null;`);
    this.addSql(`alter table if exists "brand" rename column "gpsrManufacturedOutsideEu" to "gpsr_manufactured_outside_eu";`);
  }

}
