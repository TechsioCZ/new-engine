import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260817090908 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "claim_case" drop constraint if exists "claim_case_number_unique";`);
    this.addSql(`create table if not exists "claim_access" ("id" text not null, "order_id" text not null, "email" text not null, "code_hash" text not null, "access_token_hash" text null, "expires_at" timestamptz not null, "verified_at" timestamptz null, "used_at" timestamptz null, "attempts" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "claim_access_pkey" primary key ("id"), constraint CHK_claim_access_attempts check (attempts >= 0));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_claim_access_deleted_at" ON "claim_access" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_claim_access_order_email" ON "claim_access" ("order_id", "email") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_claim_access_token_hash" ON "claim_access" ("access_token_hash") WHERE deleted_at IS NULL AND access_token_hash IS NOT NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_claim_access_expires_at" ON "claim_access" ("expires_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "claim_case" ("id" text not null, "case_number" text not null, "type" text check ("type" in ('return', 'complaint')) not null, "status" text check ("status" in ('submitted', 'in_review', 'waiting_for_customer', 'resolved', 'rejected')) not null default 'submitted', "email" text not null, "order_id" text null, "order_display_id" text null, "customer_id" text null, "reason" text null, "defect_description" text null, "defect_discovered_at" timestamptz null, "requested_resolution" text check ("requested_resolution" in ('repair', 'replacement', 'discount', 'refund')) null, "purchase_details" text null, "attachment_urls" jsonb null, "deadline_at" timestamptz null, "submitted_at" timestamptz not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "claim_case_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_claim_case_deleted_at" ON "claim_case" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_claim_case_number_unique" ON "claim_case" ("case_number") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_claim_case_order_id" ON "claim_case" ("order_id") WHERE deleted_at IS NULL AND order_id IS NOT NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_claim_case_email" ON "claim_case" ("email") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_claim_case_status" ON "claim_case" ("status") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "claim_item" ("id" text not null, "claim_id" text not null, "order_item_id" text null, "product_id" text null, "variant_id" text null, "title" text not null, "quantity" integer not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "claim_item_pkey" primary key ("id"), constraint CHK_claim_item_quantity check (quantity >= 1));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_claim_item_claim_id" ON "claim_item" ("claim_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_claim_item_deleted_at" ON "claim_item" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_claim_item_order_item_id" ON "claim_item" ("order_item_id") WHERE deleted_at IS NULL AND order_item_id IS NOT NULL;`);

    this.addSql(`alter table if exists "claim_item" add constraint "claim_item_claim_id_foreign" foreign key ("claim_id") references "claim_case" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "claim_item" drop constraint if exists "claim_item_claim_id_foreign";`);

    this.addSql(`drop table if exists "claim_access" cascade;`);

    this.addSql(`drop table if exists "claim_case" cascade;`);

    this.addSql(`drop table if exists "claim_item" cascade;`);
  }

}
