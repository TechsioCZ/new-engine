import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20250915181739 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "producer" drop constraint if exists "producer_handle_unique";`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_producer_handle_unique" ON "producer" (handle) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_producer_handle_unique";`);
  }

}
