import { Migration } from '@medusajs/framework/mikro-orm/migrations'

export class Migration20260730173000 extends Migration {
	override async up(): Promise<void> {
		this.addSql('create table if not exists "search_profile" ("id" text not null, "key" text not null, "shop" text not null, "domain" text not null, "locale" text not null, "sales_channel_ids" jsonb not null, "strict" boolean not null default false, "separate_variant_results" boolean not null default false, "minimum_ranking_score" real null, "availability" text not null default \'all\', "autocomplete_product_limit" integer not null default 6, "autocomplete_category_limit" integer not null default 3, "autocomplete_brand_limit" integer not null default 3, "autocomplete_content_limit" integer not null default 3, "full_search_limit" integer not null default 500, "max_results_per_page" integer not null default 100, "popular_limit" integer not null default 12, "last_sync_status" text not null default \'never\', "last_sync_mode" text null, "last_sync_started_at" timestamptz null, "last_synced_at" timestamptz null, "last_sync_error" text null, "last_indexed_count" integer not null default 0, "last_deleted_count" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "search_profile_pkey" primary key ("id"));')
		this.addSql('create index if not exists "IDX_search_profile_deleted_at" on "search_profile" ("deleted_at") where deleted_at is null;')
		this.addSql('create unique index if not exists "IDX_search_profile_key_unique" on "search_profile" ("key") where deleted_at is null;')
		this.addSql('create unique index if not exists "IDX_search_profile_scope_unique" on "search_profile" ("shop", "domain", "locale") where deleted_at is null;')
		this.addSql('alter table if exists "search_profile" add constraint "search_profile_availability_check" check ("availability" in (\'all\', \'in-stock\'));')
		this.addSql('alter table if exists "search_profile" add constraint "search_profile_minimum_ranking_score_check" check ("minimum_ranking_score" is null or ("minimum_ranking_score" >= 0 and "minimum_ranking_score" <= 1));')
		this.addSql('alter table if exists "search_profile" add constraint "search_profile_sync_status_check" check ("last_sync_status" in (\'never\', \'running\', \'succeeded\', \'failed\'));')
		this.addSql('alter table if exists "search_profile" add constraint "search_profile_sync_mode_check" check ("last_sync_mode" is null or "last_sync_mode" in (\'normal\', \'full\'));')
	}

	override async down(): Promise<void> {
		this.addSql('drop table if exists "search_profile" cascade;')
	}
}
