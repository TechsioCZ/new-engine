import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20250107125154 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      'CREATE INDEX IF NOT EXISTS "IDX_company_deleted_at" ON "company" (deleted_at) WHERE deleted_at IS NULL;'
    );
    this.addSql(
      'CREATE INDEX IF NOT EXISTS "IDX_employee_deleted_at" ON "employee" (deleted_at) WHERE deleted_at IS NULL;'
    );
  }

  override async down(): Promise<void> {
    this.addSql('DROP INDEX IF EXISTS "IDX_company_deleted_at";');
    this.addSql('DROP INDEX IF EXISTS "IDX_employee_deleted_at";');
  }
}
