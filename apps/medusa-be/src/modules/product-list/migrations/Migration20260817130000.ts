import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * Reconciles the schema after two historical migrations shared the name
 * Migration20260604120000. MikroORM recorded only one of them, so an
 * environment can be missing either the password-reset table or the
 * product-list access-type column.
 */
export class Migration20260817130000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "auth_password_reset_token" ("id" text not null, "auth_identity_id" text not null, "provider_identity_id" text not null, "entity_id" text not null, "token_hash" text not null, "expires_at" timestamptz not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "auth_password_reset_token_pkey" primary key ("id"));`
    )
    this.addSql(
      `create index if not exists "IDX_auth_password_reset_token_auth_identity_id" on "auth_password_reset_token" ("auth_identity_id") where deleted_at is null;`
    )
    this.addSql(
      `create index if not exists "IDX_auth_password_reset_token_provider_identity_id" on "auth_password_reset_token" ("provider_identity_id") where deleted_at is null;`
    )
    this.addSql(
      `create index if not exists "IDX_auth_password_reset_token_token_hash" on "auth_password_reset_token" ("token_hash") where deleted_at is null;`
    )
    this.addSql(
      `create index if not exists "IDX_auth_password_reset_token_expires_at" on "auth_password_reset_token" ("expires_at") where deleted_at is null;`
    )
    this.addSql(
      `create index if not exists "IDX_auth_password_reset_token_deleted_at" on "auth_password_reset_token" ("deleted_at") where deleted_at is null;`
    )
    this.addSql(
      `do $$ begin if not exists (select 1 from pg_constraint constraint_record join pg_class table_record on table_record.oid = constraint_record.conrelid join pg_namespace namespace_record on namespace_record.oid = table_record.relnamespace where constraint_record.conname = 'auth_password_reset_token_auth_identity_id_foreign' and table_record.relname = 'auth_password_reset_token' and namespace_record.nspname = current_schema()) then alter table "auth_password_reset_token" add constraint "auth_password_reset_token_auth_identity_id_foreign" foreign key ("auth_identity_id") references "auth_identity" ("id") on update cascade on delete cascade; end if; end $$;`
    )
    this.addSql(
      `do $$ begin if not exists (select 1 from pg_constraint constraint_record join pg_class table_record on table_record.oid = constraint_record.conrelid join pg_namespace namespace_record on namespace_record.oid = table_record.relnamespace where constraint_record.conname = 'auth_password_reset_token_provider_identity_id_foreign' and table_record.relname = 'auth_password_reset_token' and namespace_record.nspname = current_schema()) then alter table "auth_password_reset_token" add constraint "auth_password_reset_token_provider_identity_id_foreign" foreign key ("provider_identity_id") references "provider_identity" ("id") on update cascade on delete cascade; end if; end $$;`
    )

    this.addSql(
      `alter table if exists "product_list" add column if not exists "access_type" text not null default 'private';`
    )
    this.addSql(
      `do $$ begin if not exists (select 1 from pg_constraint constraint_record join pg_class table_record on table_record.oid = constraint_record.conrelid join pg_namespace namespace_record on namespace_record.oid = table_record.relnamespace where constraint_record.conname = 'product_list_access_type_check' and table_record.relname = 'product_list' and namespace_record.nspname = current_schema()) then alter table if exists "product_list" add constraint "product_list_access_type_check" check ("access_type" in ('private', 'public')); end if; end $$;`
    )
    this.addSql(
      `create index if not exists "IDX_product_list_access_type" on "product_list" ("access_type") where deleted_at is null;`
    )
  }

  override async down(): Promise<void> {
    // Intentionally empty: these objects are owned by the two historical
    // migrations, and removing either side would corrupt a reconciled schema.
  }
}
