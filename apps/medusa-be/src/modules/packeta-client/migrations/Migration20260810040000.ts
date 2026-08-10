import { Migration } from '@medusajs/framework/mikro-orm/migrations'

export class Migration20260810040000 extends Migration {
	override async up(): Promise<void> {
		this.addSql('alter table if exists "packeta_config" add column if not exists "is_active" boolean not null default false;')
		this.addSql('alter table if exists "packeta_config" add column if not exists "allow_live_operations" boolean not null default false;')
		this.addSql('update "packeta_config" set "is_active" = true where "environment" = \'testing\' and "deleted_at" is null and not exists (select 1 from "packeta_config" where "is_active" = true and "deleted_at" is null);')
		this.addSql('create unique index if not exists "IDX_packeta_config_active_unique" on "packeta_config" ("is_active") where "is_active" = true and "deleted_at" is null;')
	}

	override async down(): Promise<void> {
		this.addSql('drop index if exists "IDX_packeta_config_active_unique";')
		this.addSql('alter table if exists "packeta_config" drop column if exists "allow_live_operations";')
		this.addSql('alter table if exists "packeta_config" drop column if exists "is_active";')
	}
}
