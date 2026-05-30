import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260521153000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "symmy_customer_group_code" ("id" text not null, "code" text null, "erp_code" text null, "customer_group_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "symmy_customer_group_code_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_symmy_customer_group_code_deleted_at" ON "symmy_customer_group_code" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_symmy_customer_group_code_code_unique" ON "symmy_customer_group_code" ("code") WHERE deleted_at IS NULL AND code IS NOT NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_symmy_customer_group_code_erp_code_unique" ON "symmy_customer_group_code" ("erp_code") WHERE deleted_at IS NULL AND erp_code IS NOT NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_symmy_customer_group_code_group_id_unique" ON "symmy_customer_group_code" ("customer_group_id") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "symmy_customer_group_code" cascade;`)
  }
}
