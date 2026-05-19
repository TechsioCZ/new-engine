import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260519093000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `DROP INDEX IF EXISTS "IDX_qr_payment_config_environment_unique";`
    )
    this.addSql(`
      WITH ranked_configs AS (
        SELECT
          id,
          row_number() OVER (
            ORDER BY
              (iban IS NOT NULL) DESC,
              updated_at DESC,
              created_at DESC,
              id DESC
          ) AS row_number
        FROM "qr_payment_config"
        WHERE deleted_at IS NULL
      )
      UPDATE "qr_payment_config"
      SET deleted_at = now()
      WHERE id IN (
        SELECT id
        FROM ranked_configs
        WHERE row_number > 1
      );
    `)
    this.addSql(
      `ALTER TABLE IF EXISTS "qr_payment_config" DROP COLUMN IF EXISTS "environment";`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_qr_payment_config_single_active" ON "qr_payment_config" ((1)) WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "IDX_qr_payment_config_single_active";`)
    this.addSql(
      `ALTER TABLE IF EXISTS "qr_payment_config" ADD COLUMN IF NOT EXISTS "environment" text not null default 'default';`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_qr_payment_config_environment_unique" ON "qr_payment_config" ("environment") WHERE deleted_at IS NULL;`
    )
  }
}
