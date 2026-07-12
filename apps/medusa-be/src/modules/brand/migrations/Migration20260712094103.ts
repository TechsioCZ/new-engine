import { Migration } from "@medusajs/framework/mikro-orm/migrations"

const renameColumnIfPresent = (
  tableName: string,
  fromColumn: string,
  toColumn: string,
  columnType: string
) => `
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = '${tableName}'
      AND column_name = '${fromColumn}'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = '${tableName}'
      AND column_name = '${toColumn}'
  ) THEN
    ALTER TABLE "${tableName}" RENAME COLUMN "${fromColumn}" TO "${toColumn}";
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = '${tableName}'
      AND column_name = '${toColumn}'
  ) THEN
    ALTER TABLE "${tableName}" ADD COLUMN "${toColumn}" ${columnType} null;
  END IF;
END $$;
`

export class Migration20260712094103 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      renameColumnIfPresent(
        "brand",
        "gpsr_contact_email",
        "gpsrContactEmail",
        "text"
      )
    )
    this.addSql(
      renameColumnIfPresent(
        "brand",
        "gpsr_european_reseller_contact_email",
        "gpsrEuropeanResellerContactEmail",
        "text"
      )
    )
    this.addSql(
      renameColumnIfPresent(
        "brand",
        "gpsr_european_reseller_manufacturing_company_name",
        "gpsrEuropeanResellerManufacturingCompanyName",
        "text"
      )
    )
    this.addSql(
      renameColumnIfPresent(
        "brand",
        "gpsr_european_reseller_postal_address",
        "gpsrEuropeanResellerPostalAddress",
        "text"
      )
    )
    this.addSql(
      renameColumnIfPresent(
        "brand",
        "gpsr_manufacturing_company_name",
        "gpsrManufacturingCompanyName",
        "text"
      )
    )
    this.addSql(
      renameColumnIfPresent(
        "brand",
        "gpsr_postal_address",
        "gpsrPostalAddress",
        "text"
      )
    )
    this.addSql(
      renameColumnIfPresent(
        "brand",
        "gpsr_manufactured_outside_eu",
        "gpsrManufacturedOutsideEu",
        "boolean"
      )
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      renameColumnIfPresent(
        "brand",
        "gpsrContactEmail",
        "gpsr_contact_email",
        "text"
      )
    )
    this.addSql(
      renameColumnIfPresent(
        "brand",
        "gpsrEuropeanResellerContactEmail",
        "gpsr_european_reseller_contact_email",
        "text"
      )
    )
    this.addSql(
      renameColumnIfPresent(
        "brand",
        "gpsrEuropeanResellerManufacturingCompanyName",
        "gpsr_european_reseller_manufacturing_company_name",
        "text"
      )
    )
    this.addSql(
      renameColumnIfPresent(
        "brand",
        "gpsrEuropeanResellerPostalAddress",
        "gpsr_european_reseller_postal_address",
        "text"
      )
    )
    this.addSql(
      renameColumnIfPresent(
        "brand",
        "gpsrManufacturingCompanyName",
        "gpsr_manufacturing_company_name",
        "text"
      )
    )
    this.addSql(
      renameColumnIfPresent(
        "brand",
        "gpsrPostalAddress",
        "gpsr_postal_address",
        "text"
      )
    )
    this.addSql(
      renameColumnIfPresent(
        "brand",
        "gpsrManufacturedOutsideEu",
        "gpsr_manufactured_outside_eu",
        "boolean"
      )
    )
  }
}
