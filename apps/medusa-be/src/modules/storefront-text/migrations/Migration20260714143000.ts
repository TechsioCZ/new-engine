import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260714143000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "storefront_text" add column if not exists "default_value" text null;`
    )
    this.addSql(
      `alter table if exists "storefront_text" add column if not exists "override_value" text null;`
    )
    this.addSql(
      `update "storefront_text" set "default_value" = "value", "override_value" = "value" where "default_value" is null;`
    )
    this.addSql(
      `alter table if exists "storefront_text" alter column "default_value" set not null;`
    )
    this.addSql(
      `alter table if exists "storefront_text" drop column if exists "value";`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "storefront_text" add column if not exists "value" text null;`
    )
    this.addSql(
      `update "storefront_text" set "value" = coalesce("override_value", "default_value") where "value" is null;`
    )
    this.addSql(
      `alter table if exists "storefront_text" alter column "value" set not null;`
    )
    this.addSql(
      `alter table if exists "storefront_text" drop column if exists "override_value";`
    )
    this.addSql(
      `alter table if exists "storefront_text" drop column if exists "default_value";`
    )
  }
}
