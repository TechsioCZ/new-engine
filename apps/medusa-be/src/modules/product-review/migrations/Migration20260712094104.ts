import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260712094104 extends Migration {
  private addConfiguredSearchPath(): void {
    const schema = this.config.get("schema")

    if (
      typeof schema !== "string" ||
      !/^[A-Za-z_][A-Za-z0-9_$]*$/.test(schema)
    ) {
      throw new Error(
        "Product-review migration requires a valid configured schema"
      )
    }

    // Queue the resolved schema inside MigrationRunner's transaction. Medusa
    // 2.16's automatic SET LOCAL runs before that transaction and is not retained.
    this.addSql(`SET LOCAL search_path TO "${schema}", pg_catalog;`)
  }

  override async up(): Promise<void> {
    this.addConfiguredSearchPath()
    // ReviewToken is already created by the applied Migration20260610090000.
    // The wanted model delta is removal of the review status default only.
    this.addSql(
      `alter table if exists "review" alter column "status" drop default;`
    )
  }

  override async down(): Promise<void> {
    this.addConfiguredSearchPath()
    this.addSql(
      `alter table if exists "review" alter column "status" set default 'pending';`
    )
  }
}
