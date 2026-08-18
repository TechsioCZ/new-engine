import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { runUrlRegistryMigrationCli } from "./migrate.mjs"

const REQUIRED_DATABASE_URL = /URL_REGISTRY_MIGRATION_DATABASE_URL is required/

describe("runUrlRegistryMigrationCli", () => {
  it("creates one bounded pool and delegates the loaded plan to the owned runner", async () => {
    const plan = [{ name: "0001_create.sql", sql: "SELECT 1;" }]
    const pool = { marker: "owned-pool" }
    const observed = {}

    const result = await runUrlRegistryMigrationCli({
      environment: {
        URL_REGISTRY_MIGRATION_DATABASE_URL: "postgresql://urlr.example/db",
      },
      migrationsDirectory: "/urlr/migrations",
      loadPlan: (input) => {
        observed.loadInput = input
        return plan
      },
      createPool: (config) => {
        observed.poolConfig = config
        return pool
      },
      runMigrations: (input) => {
        observed.runInput = input
        return { applied: [plan[0].name], skipped: [] }
      },
      stdout: { write: () => 0 },
      stderr: { write: () => 0 },
    })

    assert.deepEqual(result, { applied: [plan[0].name], skipped: [] })
    assert.equal(observed.loadInput.migrationsDirectory, "/urlr/migrations")
    assert.equal(observed.poolConfig.max, 1)
    assert.equal(
      observed.poolConfig.connectionString,
      "postgresql://urlr.example/db"
    )
    assert.equal(observed.runInput.pool, pool)
    assert.equal(observed.runInput.plan, plan)
  })

  it("does not create a pool when the dedicated URL is absent", async () => {
    let createdPool = false

    await assert.rejects(
      runUrlRegistryMigrationCli({
        environment: { DATABASE_URL: "postgresql://wrong.example/db" },
        createPool: () => {
          createdPool = true
          return {}
        },
      }),
      REQUIRED_DATABASE_URL
    )
    assert.equal(createdPool, false)
  })
})
