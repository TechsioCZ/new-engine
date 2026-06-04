import { Migration } from "@mikro-orm/migrations"

export class Migration20260604120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "product_list" add column if not exists "access_type" text not null default 'private';`
    )
    this.addSql(
      `alter table if exists "product_list" add constraint "product_list_access_type_check" check ("access_type" in ('private', 'public'));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_product_list_access_type" ON "product_list" ("access_type") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_product_list_access_type";`)
    this.addSql(
      `alter table if exists "product_list" drop constraint if exists "product_list_access_type_check";`
    )
    this.addSql(
      `alter table if exists "product_list" drop column if exists "access_type";`
    )
  }
}
