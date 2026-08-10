import { Migration } from '@medusajs/framework/mikro-orm/migrations'

export class Migration20260804143806 extends Migration {
	override async up(): Promise<void> {
		this.addSql('alter table if exists "gls_config" add column if not exists "is_active" boolean not null default false;')
		this.addSql('alter table if exists "gls_config" add column if not exists "supported_countries" text[] null;')
		this.addSql('update "gls_config" set "supported_countries" = array[]::text[] where "supported_countries" is null;')
		this.addSql('alter table if exists "gls_config" alter column "supported_countries" set not null;')
		this.addSql('alter table if exists "gls_config" alter column "supported_countries" set default array[]::text[];')
		this.addSql('update "gls_config" set "is_active" = true where "environment" = \'testing\' and "deleted_at" is null and not exists (select 1 from "gls_config" where "is_active" = true and "deleted_at" is null);')
		this.addSql('create unique index if not exists "IDX_gls_config_active_unique" on "gls_config" ("is_active") where "is_active" = true and "deleted_at" is null;')
		this.addSql('create table if not exists "gls_fulfillment_attempt" ("id" text not null, "operation_key" text not null, "client_reference" text not null, "generation" integer not null default 1, "status" text check ("status" in (\'pending\', \'completed\', \'cancelled\')) not null default \'pending\', "fulfillment_id" text null, "parcel_id" text null, "parcel_number" text null, "barcode" text null, "last_error" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "gls_fulfillment_attempt_pkey" primary key ("id"));')
		this.addSql('create index if not exists "IDX_gls_fulfillment_attempt_deleted_at" on "gls_fulfillment_attempt" ("deleted_at") where "deleted_at" is null;')
		this.addSql('create unique index if not exists "IDX_gls_fulfillment_attempt_operation_key_generation_unique" on "gls_fulfillment_attempt" ("operation_key", "generation") where "deleted_at" is null;')
		this.addSql('create unique index if not exists "IDX_gls_fulfillment_attempt_client_reference_unique" on "gls_fulfillment_attempt" ("client_reference") where "deleted_at" is null;')
	}

	override async down(): Promise<void> {
		this.addSql('drop table if exists "gls_fulfillment_attempt" cascade;')
		this.addSql('drop index if exists "IDX_gls_config_active_unique";')
		this.addSql('alter table if exists "gls_config" drop column if exists "supported_countries";')
		this.addSql('alter table if exists "gls_config" drop column if exists "is_active";')
	}
}
