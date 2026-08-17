import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260804170000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      'alter table if exists "ppl_config" add column if not exists "is_active" boolean not null default false;'
    )
    this.addSql(
      'update "ppl_config" set "is_active" = true where "id" = (select "id" from "ppl_config" where "deleted_at" is null order by "created_at" asc limit 1) and not exists (select 1 from "ppl_config" where "deleted_at" is null and "is_active" = true);'
    )
    this.addSql(
      'create unique index if not exists "IDX_ppl_config_active_unique" on "ppl_config" ("is_active") where "is_active" = true and "deleted_at" is null;'
    )
  }

  override async down(): Promise<void> {
    this.addSql('drop index if exists "IDX_ppl_config_active_unique";')
    this.addSql(
      'alter table if exists "ppl_config" drop column if exists "is_active";'
    )
  }
}
