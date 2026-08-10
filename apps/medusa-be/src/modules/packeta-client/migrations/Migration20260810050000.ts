import { Migration } from '@medusajs/framework/mikro-orm/migrations'

export class Migration20260810050000 extends Migration {
	override async up(): Promise<void> {
		this.addSql('alter table if exists "packeta_config" add column if not exists "widget_api_key" text null;')
		this.addSql('alter table if exists "packeta_config" add column if not exists "widget_countries" text[] null;')
		this.addSql('update "packeta_config" set "widget_countries" = array[]::text[] where "widget_countries" is null;')
		this.addSql('alter table if exists "packeta_config" alter column "widget_countries" set not null;')
	}

	override async down(): Promise<void> {
		this.addSql('alter table if exists "packeta_config" drop column if exists "widget_countries";')
		this.addSql('alter table if exists "packeta_config" drop column if exists "widget_api_key";')
	}
}
