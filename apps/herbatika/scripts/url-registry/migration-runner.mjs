import { performance } from "node:perf_hooks"
import {
  readAppliedMigrationNames,
  recordAppliedMigration,
} from "./migration-ledger.mjs"
import { buildMigrationPlan } from "./migration-plan.mjs"

const MIGRATION_LOCK_NAME = "herbatika:url-registry:migrations:v1"
const DEFAULT_LOCK_TIMEOUT_MS = 30_000
const DEFAULT_LOCK_POLL_INTERVAL_MS = 100
const noOperation = () => null
const monotonicNow = () => performance.now()

const normalizeThrownValue = (value, context) =>
  value instanceof Error
    ? value
    : new Error(`${context} threw a non-Error value (${String(value)})`, {
        cause: value,
      })

const TRY_LOCK_SQL = `
  SELECT pg_try_advisory_lock(
    hashtextextended($1::text, 0)
  ) AS acquired
`
const UNLOCK_SQL = `
  SELECT pg_advisory_unlock(
    hashtextextended($1::text, 0)
  ) AS released
`
const CREATE_MIGRATION_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS url_registry.schema_migrations (
    name text PRIMARY KEY,
    checksum text NOT NULL CHECK (
      checksum ~ '^sha256:[0-9a-f]{64}$'
    ),
    applied_at timestamptz NOT NULL DEFAULT clock_timestamp()
  )
`

const defaultSleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds))

const positiveSafeInteger = (value, label) => {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${label} must be a positive safe integer`)
  }
}

const readClock = (now) => {
  const value = now()
  if (!Number.isFinite(value)) {
    throw new Error("Migration lock clock returned an invalid value")
  }
  return value
}

const acquireMigrationLock = async ({
  client,
  lockTimeoutMs,
  lockPollIntervalMs,
  now,
  sleep,
}) => {
  const deadline = readClock(now) + lockTimeoutMs
  while (true) {
    const result = await client.query(TRY_LOCK_SQL, [MIGRATION_LOCK_NAME])
    const acquired = result?.rows?.[0]?.acquired
    if (acquired === true) {
      return
    }
    if (acquired !== false) {
      throw new Error("Postgres returned an invalid migration-lock result")
    }

    const remainingMs = deadline - readClock(now)
    if (remainingMs <= 0) {
      throw new Error(
        `Timed out after ${lockTimeoutMs}ms waiting for the URL registry migration lock`
      )
    }
    await sleep(Math.min(lockPollIntervalMs, remainingMs))
  }
}

const applyMigration = async (client, migration, state) => {
  await client.query("BEGIN")
  state.transactionOpen = true
  await client.query(migration.sql)
  await recordAppliedMigration(client, migration)
  await client.query("COMMIT")
  state.transactionOpen = false
}

const executeMigrationPlan = async ({ client, plan, onEvent, state }) => {
  await client.query("CREATE SCHEMA IF NOT EXISTS url_registry")
  await client.query(CREATE_MIGRATION_TABLE_SQL)
  const appliedNames = await readAppliedMigrationNames(client, plan)
  const result = { applied: [], skipped: [] }

  for (const migration of plan) {
    if (appliedNames.has(migration.name)) {
      result.skipped.push(migration.name)
      onEvent({ type: "skipped", name: migration.name })
    } else {
      await applyMigration(client, migration, state)
      result.applied.push(migration.name)
      onEvent({ type: "applied", name: migration.name })
    }
  }
  return result
}

const attemptCleanup = async (phase, operation, recordCleanupError) => {
  try {
    await operation()
    return { failed: false }
  } catch (thrownValue) {
    const error = normalizeThrownValue(
      thrownValue,
      `URL registry migration ${phase} cleanup`
    )
    recordCleanupError(phase, error)
    return { error, failed: true }
  }
}

const rollbackOpenTransaction = async (state, recordCleanupError) => {
  if (!(state.transactionOpen && state.client)) {
    return
  }
  const cleanup = await attemptCleanup(
    "rollback",
    () => state.client.query("ROLLBACK"),
    recordCleanupError
  )
  if (cleanup.failed) {
    state.releaseCause = cleanup.error
  } else {
    state.transactionOpen = false
  }
}

const releaseResources = async ({ pool, state, recordCleanupError }) => {
  if (state.lockAcquired && state.client) {
    const unlockCleanup = await attemptCleanup(
      "unlock",
      async () => {
        const result = await state.client.query(UNLOCK_SQL, [
          MIGRATION_LOCK_NAME,
        ])
        if (result?.rows?.[0]?.released !== true) {
          throw new Error("Postgres did not release the URL migration lock")
        }
      },
      recordCleanupError
    )
    if (unlockCleanup.failed) {
      state.releaseCause ??= unlockCleanup.error
    }
  }

  if (state.client && typeof state.client.release === "function") {
    await attemptCleanup(
      "release",
      () => state.client.release(state.releaseCause),
      recordCleanupError
    )
  }
  await attemptCleanup("pool-end", () => pool.end(), recordCleanupError)
}

export const runUrlRegistryMigrations = async ({
  pool,
  plan: requestedPlan,
  lockTimeoutMs = DEFAULT_LOCK_TIMEOUT_MS,
  lockPollIntervalMs = DEFAULT_LOCK_POLL_INTERVAL_MS,
  now = monotonicNow,
  sleep = defaultSleep,
  onEvent = noOperation,
  onCleanupError = noOperation,
}) => {
  if (
    !pool ||
    typeof pool.connect !== "function" ||
    typeof pool.end !== "function"
  ) {
    throw new TypeError("An owned SQL pool is required to run URL migrations")
  }

  const state = {
    client: undefined,
    lockAcquired: false,
    transactionOpen: false,
    hasPrimaryError: false,
    primaryError: undefined,
    releaseCause: undefined,
  }
  const cleanupReporter =
    typeof onCleanupError === "function" ? onCleanupError : noOperation
  const recordCleanupError = (phase, error) => {
    try {
      cleanupReporter({ phase, error })
    } catch {
      // A diagnostic callback must never replace a database failure.
    }
    if (!state.hasPrimaryError) {
      state.hasPrimaryError = true
      state.primaryError = error
    }
  }

  let result
  try {
    const plan = buildMigrationPlan(requestedPlan)
    positiveSafeInteger(lockTimeoutMs, "lockTimeoutMs")
    positiveSafeInteger(lockPollIntervalMs, "lockPollIntervalMs")
    if (
      typeof now !== "function" ||
      typeof sleep !== "function" ||
      typeof onEvent !== "function" ||
      typeof onCleanupError !== "function"
    ) {
      throw new TypeError("Migration runner dependencies must be functions")
    }

    state.client = await pool.connect()
    if (!state.client || typeof state.client.query !== "function") {
      throw new TypeError("SQL pool returned an invalid dedicated client")
    }
    await acquireMigrationLock({
      client: state.client,
      lockTimeoutMs,
      lockPollIntervalMs,
      now,
      sleep,
    })
    state.lockAcquired = true
    result = await executeMigrationPlan({
      client: state.client,
      plan,
      onEvent,
      state,
    })
  } catch (thrownValue) {
    state.hasPrimaryError = true
    state.primaryError = normalizeThrownValue(
      thrownValue,
      "URL registry migration"
    )
    await rollbackOpenTransaction(state, recordCleanupError)
  } finally {
    await releaseResources({ pool, state, recordCleanupError })
  }

  if (state.hasPrimaryError) {
    throw state.primaryError
  }
  return result
}
