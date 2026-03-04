import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20241014114520 extends Migration {

  override async up(): Promise<void> {
    this.addSql('alter table if exists "company" alter column "phone" type text using ("phone"::text);');
    this.addSql('alter table if exists "company" alter column "phone" drop not null;');
  }

  override async down(): Promise<void> {
    this.addSql('alter table if exists "company" alter column "phone" type text using ("phone"::text);');
    this.addSql('alter table if exists "company" alter column "phone" set not null;');
  }

}
