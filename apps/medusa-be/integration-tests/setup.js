require("ts-node/register/transpile-only")

const { createRequire } = require("node:module")
const { MetadataStorage } = require("@medusajs/framework/mikro-orm/core")

const PATCHED_MIGRATOR = Symbol.for("medusa-be.test.patch-migrator-schema")

const patchMigrator = (requireFromPackage) => {
  const { Migrator } = requireFromPackage("@medusajs/framework/migrations")

  if (Migrator.prototype[PATCHED_MIGRATOR]) {
    return
  }

  const ensureMigrationsTable = Migrator.prototype.ensureMigrationsTable

  Migrator.prototype.createMigrationTable = async function () {
    await this.pgConnection.raw('CREATE SCHEMA IF NOT EXISTS "public";')
    await this.pgConnection.raw(`
      CREATE TABLE IF NOT EXISTS "public"."${this.migration_table_name}" (
        id serial PRIMARY KEY,
        name varchar(255),
        executed_at timestamptz DEFAULT CURRENT_TIMESTAMP
      )
    `)
  }

  Migrator.prototype.ensureMigrationsTable = async function (...args) {
    await this.pgConnection.raw('CREATE SCHEMA IF NOT EXISTS "public";')

    return ensureMigrationsTable.apply(this, args)
  }
  Migrator.prototype[PATCHED_MIGRATOR] = true
}

patchMigrator(require)
patchMigrator(createRequire(require.resolve("@medusajs/test-utils")))

MetadataStorage.clear()
