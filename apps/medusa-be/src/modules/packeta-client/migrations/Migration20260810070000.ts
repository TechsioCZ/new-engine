import { Migration } from '@medusajs/framework/mikro-orm/migrations'

export class Migration20260810070000 extends Migration {
	override async up(): Promise<void> {
		this.addSql('alter table if exists "packeta_config" alter column "widget_countries" set default array[]::text[];')
	}

	override async down(): Promise<void> {
		this.addSql('alter table if exists "packeta_config" alter column "widget_countries" drop default;')
	}
}
