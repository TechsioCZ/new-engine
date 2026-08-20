import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260819170000 extends Migration {
  private addConfiguredSearchPath(): void {
    const schema = this.config.get("schema")

    if (
      typeof schema !== "string" ||
      !/^[A-Za-z_][A-Za-z0-9_$]*$/.test(schema)
    ) {
      throw new Error(
        "Order-confirmation migration requires a valid configured schema"
      )
    }

    this.addSql(`SET LOCAL search_path TO "${schema}", pg_catalog;`)
  }

  override async up(): Promise<void> {
    this.addConfiguredSearchPath()
    this.addSql(
      `create table if not exists "order_confirmation_access" ("id" text not null, "order_id" text not null, "public_order_id" text not null, "sales_channel_id" text not null, "customer_id" text null, "token_hash" text not null, "expires_at" timestamptz not null, "used_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "order_confirmation_access_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_order_confirmation_access_deleted_at" ON "order_confirmation_access" (deleted_at) WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_order_confirmation_access_order_unique" ON "order_confirmation_access" ("order_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_order_confirmation_access_public_order_unique" ON "order_confirmation_access" ("public_order_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_order_confirmation_access_token_hash" ON "order_confirmation_access" ("token_hash") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_order_confirmation_access_expires_at" ON "order_confirmation_access" ("expires_at") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addConfiguredSearchPath()
    this.addSql(`drop table if exists "order_confirmation_access" cascade;`)
  }
}
