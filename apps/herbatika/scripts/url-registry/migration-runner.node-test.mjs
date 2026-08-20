import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { buildMigrationPlan } from "./migration-plan.mjs"
import { runUrlRegistryMigrations } from "./migration-runner.mjs"

const CHECKSUM_MISMATCH = /checksum mismatch.*0001_create_registry\.sql/i
const FIVE_MILLISECOND_TIMEOUT = /timed out after 5ms/i
const TWENTY_FIVE_MILLISECOND_TIMEOUT = /timed out after 25ms/i

const createFakePool = ({ onQuery, releaseError, endError } = {}) => {
  const calls = []
  const client = {
    async query(text, values) {
      calls.push({ type: "query", text, values })
      return (
        (await onQuery?.({ text, values, calls })) ?? {
          rows: [],
          rowCount: 0,
        }
      )
    },
    release(error) {
      calls.push({ type: "release", error })
      if (releaseError) {
        throw releaseError
      }
    },
  }
  const pool = {
    connect() {
      calls.push({ type: "connect" })
      return client
    },
    end() {
      calls.push({ type: "end" })
      if (endError) {
        throw endError
      }
    },
  }
  return { calls, pool }
}

const plan = buildMigrationPlan([
  { name: "0001_create_registry.sql", sql: "SELECT 1;\r\n" },
])

describe("runUrlRegistryMigrations", () => {
  it("locks, bootstraps, and applies each new migration in its own transaction", async () => {
    const events = []
    const { calls, pool } = createFakePool({
      onQuery: ({ text }) => {
        if (text.includes("pg_try_advisory_lock")) {
          return { rows: [{ acquired: true }], rowCount: 1 }
        }
        if (text.includes("SELECT name, checksum")) {
          return { rows: [], rowCount: 0 }
        }
        if (text.includes("pg_advisory_unlock")) {
          return { rows: [{ released: true }], rowCount: 1 }
        }
      },
    })

    const result = await runUrlRegistryMigrations({
      pool,
      plan,
      onEvent: (event) => events.push(event),
    })

    assert.deepEqual(result, {
      applied: ["0001_create_registry.sql"],
      skipped: [],
    })
    assert.deepEqual(events, [
      { type: "applied", name: "0001_create_registry.sql" },
    ])
    const queryTexts = calls
      .filter((call) => call.type === "query")
      .map((call) => call.text.trim())
    assert.ok(queryTexts[0].includes("pg_try_advisory_lock"))
    assert.ok(
      queryTexts.indexOf("CREATE SCHEMA IF NOT EXISTS url_registry") > 0
    )
    assert.deepEqual(
      queryTexts.filter((text) =>
        ["BEGIN", "COMMIT", "ROLLBACK"].includes(text)
      ),
      ["BEGIN", "COMMIT"]
    )
    assert.ok(queryTexts.includes("SELECT 1;"))
    assert.equal(calls.filter((call) => call.type === "connect").length, 1)
    assert.equal(calls.filter((call) => call.type === "release").length, 1)
    assert.equal(calls.filter((call) => call.type === "end").length, 1)
  })

  it("verifies an applied prefix and makes an exact reapply a no-op", async () => {
    const events = []
    const { calls, pool } = createFakePool({
      onQuery: ({ text }) => {
        if (text.includes("pg_try_advisory_lock")) {
          return { rows: [{ acquired: true }] }
        }
        if (text.includes("SELECT name, checksum")) {
          return {
            rows: [{ name: plan[0].name, checksum: plan[0].checksum }],
          }
        }
        if (text.includes("pg_advisory_unlock")) {
          return { rows: [{ released: true }] }
        }
      },
    })

    const result = await runUrlRegistryMigrations({
      pool,
      plan,
      onEvent: (event) => events.push(event),
    })

    assert.deepEqual(result, { applied: [], skipped: [plan[0].name] })
    assert.deepEqual(events, [{ type: "skipped", name: plan[0].name }])
    assert.equal(
      calls.some(
        (call) => call.type === "query" && call.text.trim() === "BEGIN"
      ),
      false
    )
  })

  it("fails before applying when an immutable checksum changed", async () => {
    const { calls, pool } = createFakePool({
      onQuery: ({ text }) => {
        if (text.includes("pg_try_advisory_lock")) {
          return { rows: [{ acquired: true }] }
        }
        if (text.includes("SELECT name, checksum")) {
          return {
            rows: [
              { name: plan[0].name, checksum: `sha256:${"f".repeat(64)}` },
            ],
          }
        }
        if (text.includes("pg_advisory_unlock")) {
          return { rows: [{ released: true }] }
        }
      },
    })

    await assert.rejects(
      runUrlRegistryMigrations({ pool, plan }),
      CHECKSUM_MISMATCH
    )
    assert.equal(
      calls.some(
        (call) => call.type === "query" && call.text.trim() === "BEGIN"
      ),
      false
    )
  })

  it("checks every applied checksum even when the latest migration matches", async () => {
    const twoMigrationPlan = buildMigrationPlan([
      { name: "0001_create_registry.sql", sql: "SELECT 1;" },
      { name: "0002_add_index.sql", sql: "SELECT 2;" },
    ])
    const { pool } = createFakePool({
      onQuery: ({ text }) => {
        if (text.includes("pg_try_advisory_lock")) {
          return { rows: [{ acquired: true }] }
        }
        if (text.includes("SELECT name, checksum")) {
          return {
            rows: [
              {
                name: twoMigrationPlan[0].name,
                checksum: `sha256:${"0".repeat(64)}`,
              },
              {
                name: twoMigrationPlan[1].name,
                checksum: twoMigrationPlan[1].checksum,
              },
            ],
          }
        }
        if (text.includes("pg_advisory_unlock")) {
          return { rows: [{ released: true }] }
        }
      },
    })

    await assert.rejects(
      runUrlRegistryMigrations({ pool, plan: twoMigrationPlan }),
      CHECKSUM_MISMATCH
    )
  })

  it("rolls back and preserves the primary error through every cleanup failure", async () => {
    const primaryError = new Error("migration exploded")
    const cleanupErrors = []
    const { calls, pool } = createFakePool({
      releaseError: new Error("release failed"),
      endError: new Error("end failed"),
      onQuery: ({ text }) => {
        if (text.includes("pg_try_advisory_lock")) {
          return { rows: [{ acquired: true }] }
        }
        if (text.includes("SELECT name, checksum")) {
          return { rows: [] }
        }
        if (text.trim() === "SELECT 1;") {
          throw primaryError
        }
        if (text.trim() === "ROLLBACK") {
          throw new Error("rollback failed")
        }
        if (text.includes("pg_advisory_unlock")) {
          throw new Error("unlock failed")
        }
      },
    })

    await assert.rejects(
      runUrlRegistryMigrations({
        pool,
        plan,
        onCleanupError: (failure) => cleanupErrors.push(failure),
      }),
      (error) => error === primaryError
    )
    assert.deepEqual(
      cleanupErrors.map(({ phase, error }) => [phase, error.message]),
      [
        ["rollback", "rollback failed"],
        ["unlock", "unlock failed"],
        ["release", "release failed"],
        ["pool-end", "end failed"],
      ]
    )
    assert.ok(
      calls.some(
        (call) => call.type === "query" && call.text.trim() === "ROLLBACK"
      )
    )
  })

  it("normalizes a thrown undefined value and does not let cleanup mask it", async () => {
    const { pool } = createFakePool({
      endError: new Error("end failed"),
      onQuery: ({ text }) => {
        if (text.includes("pg_try_advisory_lock")) {
          return { rows: [{ acquired: true }] }
        }
        if (text.includes("SELECT name, checksum")) {
          return { rows: [] }
        }
        if (text.trim() === "SELECT 1;") {
          // biome-ignore lint/style/useThrowOnlyError: Exercises a hostile driver boundary.
          throw undefined
        }
        if (text.includes("pg_advisory_unlock")) {
          return { rows: [{ released: true }] }
        }
      },
    })

    await assert.rejects(
      runUrlRegistryMigrations({ pool, plan }),
      (error) =>
        error instanceof Error &&
        error.message ===
          "URL registry migration threw a non-Error value (undefined)" &&
        error.cause === undefined
    )
  })

  it("uses a monotonic default clock when the wall clock moves backwards", async () => {
    const originalDateNow = Date.now
    Date.now = () => -Number.MAX_SAFE_INTEGER
    const { calls, pool } = createFakePool({
      onQuery: ({ text }) => {
        if (text.includes("pg_try_advisory_lock")) {
          return { rows: [{ acquired: false }] }
        }
      },
    })

    try {
      await assert.rejects(
        runUrlRegistryMigrations({
          pool,
          plan,
          lockTimeoutMs: 5,
          lockPollIntervalMs: 1,
        }),
        FIVE_MILLISECOND_TIMEOUT
      )
    } finally {
      Date.now = originalDateNow
    }

    assert.ok(
      calls.filter(
        (call) =>
          call.type === "query" && call.text.includes("pg_try_advisory_lock")
      ).length >= 2
    )
  })

  it("times out without bootstrapping when another session keeps the lock", async () => {
    let currentTime = 0
    const { calls, pool } = createFakePool({
      onQuery: ({ text }) => {
        if (text.includes("pg_try_advisory_lock")) {
          return { rows: [{ acquired: false }] }
        }
      },
    })

    await assert.rejects(
      runUrlRegistryMigrations({
        pool,
        plan,
        lockTimeoutMs: 25,
        lockPollIntervalMs: 10,
        now: () => currentTime,
        sleep: (milliseconds) => {
          currentTime += milliseconds
          return currentTime
        },
      }),
      TWENTY_FIVE_MILLISECOND_TIMEOUT
    )

    const queryTexts = calls
      .filter((call) => call.type === "query")
      .map((call) => call.text)
    assert.equal(
      queryTexts.some((text) => text.includes("CREATE SCHEMA")),
      false
    )
    assert.equal(
      queryTexts.some((text) => text.includes("advisory_unlock")),
      false
    )
    assert.equal(calls.filter((call) => call.type === "release").length, 1)
    assert.equal(calls.filter((call) => call.type === "end").length, 1)
  })

  it("serializes concurrent runners so the second reapply executes no SQL", async () => {
    const appliedLedger = new Map()
    let lockOwner = null
    let migrationExecutions = 0
    let signalMigrationStarted
    let releaseFirstMigration
    const migrationStarted = new Promise((resolve) => {
      signalMigrationStarted = resolve
    })
    const firstMigrationMayFinish = new Promise((resolve) => {
      releaseFirstMigration = resolve
    })

    const makeConcurrentPool = (owner) => {
      let pendingLedgerEntry = null
      const client = {
        // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: This stateful fake models the complete advisory-lock transaction protocol.
        async query(text, values) {
          if (text.includes("pg_try_advisory_lock")) {
            if (lockOwner === null) {
              lockOwner = owner
              return { rows: [{ acquired: true }] }
            }
            return { rows: [{ acquired: false }] }
          }
          if (text.includes("pg_advisory_unlock")) {
            assert.equal(lockOwner, owner)
            lockOwner = null
            return { rows: [{ released: true }] }
          }
          if (text.includes("SELECT name, checksum")) {
            return {
              rows: [...appliedLedger].map(([name, checksum]) => ({
                name,
                checksum,
              })),
            }
          }
          if (text.includes("INSERT INTO url_registry.schema_migrations")) {
            pendingLedgerEntry = values
            return { rows: [], rowCount: 1 }
          }
          if (text.trim() === "SELECT 1;") {
            migrationExecutions += 1
            if (owner === "first") {
              signalMigrationStarted()
              await firstMigrationMayFinish
            }
          }
          if (text.trim() === "COMMIT" && pendingLedgerEntry) {
            appliedLedger.set(pendingLedgerEntry[0], pendingLedgerEntry[1])
            pendingLedgerEntry = null
          }
          return { rows: [], rowCount: 0 }
        },
        release() {
          return null
        },
      }
      return {
        connect: () => client,
        end: () => null,
      }
    }

    const first = runUrlRegistryMigrations({
      pool: makeConcurrentPool("first"),
      plan,
    })
    await migrationStarted
    const second = runUrlRegistryMigrations({
      pool: makeConcurrentPool("second"),
      plan,
      lockTimeoutMs: 1000,
      lockPollIntervalMs: 1,
      sleep: () => new Promise((resolve) => setImmediate(resolve)),
    })
    releaseFirstMigration()

    assert.deepEqual(await first, { applied: [plan[0].name], skipped: [] })
    assert.deepEqual(await second, { applied: [], skipped: [plan[0].name] })
    assert.equal(migrationExecutions, 1)
  })
})
