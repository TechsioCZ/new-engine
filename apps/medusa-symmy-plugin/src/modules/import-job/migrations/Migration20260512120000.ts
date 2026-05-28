import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260512120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "symmy_import_job" ("id" text not null, "type" text not null, "status" text not null, "payload" jsonb not null, "result" jsonb null, "error" text null, "total" integer not null default 0, "processed" integer not null default 0, "failed" integer not null default 0, "attempts" integer not null default 0, "idempotency_key" text null, "started_at" timestamptz null, "finished_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "symmy_import_job_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_symmy_import_job_deleted_at" ON "symmy_import_job" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_symmy_import_job_type" ON "symmy_import_job" ("type") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_symmy_import_job_status" ON "symmy_import_job" ("status") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_symmy_import_job_type_idempotency_key_unique" ON "symmy_import_job" ("type", "idempotency_key") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "symmy_import_job" cascade;`)
  }
}
