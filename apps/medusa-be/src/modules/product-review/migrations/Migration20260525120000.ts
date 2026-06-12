import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260525120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "review" ("id" text not null, "title" text not null, "content" text not null, "rating" integer not null, "status" text not null default 'pending', "product_id" text not null, "customer_id" text not null, "first_name" text null, "last_name" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "review_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_review_deleted_at" ON "review" (deleted_at) WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_review_product_id" ON "review" (product_id) WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_review_customer_product_unique" ON "review" (customer_id, product_id) WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_review_status_product_id" ON "review" (status, product_id) WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `alter table if exists "review" add constraint "CHK_review_rating_range" check ("rating" >= 1 AND "rating" <= 5);`
    )
    this.addSql(
      `alter table if exists "review" add constraint "CHK_review_status" check ("status" IN ('pending', 'approved', 'rejected'));`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "review" drop constraint if exists "CHK_review_status";`
    )
    this.addSql(
      `alter table if exists "review" drop constraint if exists "CHK_review_rating_range";`
    )
    this.addSql(`drop table if exists "review" cascade;`)
  }
}
