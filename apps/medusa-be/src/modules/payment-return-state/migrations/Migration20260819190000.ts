import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260819190000 extends Migration {
  private addConfiguredSearchPath(): void {
    const schema = this.config.get("schema")

    if (
      typeof schema !== "string" ||
      !/^[A-Za-z_][A-Za-z0-9_$]*$/.test(schema)
    ) {
      throw new Error(
        "Payment-return migration requires a valid configured schema"
      )
    }

    this.addSql(`SET LOCAL search_path TO "${schema}", pg_catalog;`)
  }

  override async up(): Promise<void> {
    this.addConfiguredSearchPath()
    this.addSql(
      `create table if not exists "payment_return_state" ("id" text not null, "state_hash" text not null, "cart_id" text not null, "sales_channel_id" text not null, "provider_id" text not null, "payment_session_id" text null, "order_id" text null, "result_token_hash" text null, "result_expires_at" timestamptz null, "terminal_status" text null, "response_count" integer not null default 0, "expires_at" timestamptz not null, "used_at" timestamptz null, "last_seen_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "payment_return_state_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_payment_return_state_deleted_at" ON "payment_return_state" (deleted_at) WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_payment_return_state_hash_unique" ON "payment_return_state" ("state_hash") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_payment_return_cart_provider_unique" ON "payment_return_state" ("cart_id", "provider_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_payment_return_expires_at" ON "payment_return_state" ("expires_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_payment_return_result_token_hash_unique" ON "payment_return_state" ("result_token_hash") WHERE deleted_at IS NULL AND result_token_hash IS NOT NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addConfiguredSearchPath()
    this.addSql(`drop table if exists "payment_return_state" cascade;`)
  }
}
