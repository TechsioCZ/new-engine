import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260610090000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "review_token" ("id" text not null, "token" text not null, "order_id" text not null, "product_id" text not null, "customer_id" text null, "email" text not null, "used_at" timestamptz null, "expires_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "review_token_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_review_token_deleted_at" ON "review_token" (deleted_at) WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_review_token_token_unique" ON "review_token" ("token") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_review_token_order_product_email_unique" ON "review_token" ("order_id", "product_id", "email") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_review_token_order_id" ON "review_token" ("order_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_review_token_product_id" ON "review_token" ("product_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_review_token_customer_id" ON "review_token" ("customer_id") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "review_token" cascade;`)
  }
}
