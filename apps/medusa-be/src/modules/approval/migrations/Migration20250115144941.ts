import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20250115144941 extends Migration {

  override async up(): Promise<void> {
    this.addSql('alter table if exists "approval" alter column "handled_by" type text using ("handled_by"::text);');
    this.addSql('alter table if exists "approval" alter column "handled_by" drop not null;');
  }

  override async down(): Promise<void> {
    this.addSql('alter table if exists "approval" alter column "handled_by" type text using ("handled_by"::text);');
    this.addSql('alter table if exists "approval" alter column "handled_by" set not null;');
  }

}
