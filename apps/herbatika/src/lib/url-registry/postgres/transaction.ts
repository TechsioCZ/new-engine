import type { SqlClient, SqlPool } from "./sql"
import { postgresErrorField } from "./sql"

const MAX_ATTEMPTS = 3
const BASE_RETRY_DELAY_MS = 25
const MAX_RETRY_DELAY_MS = 250
const TRANSIENT_CODES = new Set(["40001", "40P01", "55P03", "57014"])
const AMBIGUOUS_SHUTDOWN_CODES = new Set(["57P01", "57P02", "57P03"])
const NODE_TRANSPORT_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "EPIPE",
  "ETIMEDOUT",
])
const PG_AMBIGUOUS_MESSAGES = new Set([
  "Connection terminated unexpectedly",
  "Query read timeout",
])

export type TransactionRetryOptions = Readonly<{
  maxAttempts?: number
  random?: () => number
  sleep?: (milliseconds: number) => Promise<void>
}>

const defaultSleep = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds))

export const isRetryablePostgresError = (error: unknown): boolean => {
  const code = postgresErrorField(error, "code")
  if (code === null) {
    return error instanceof Error && PG_AMBIGUOUS_MESSAGES.has(error.message)
  }
  if (
    TRANSIENT_CODES.has(code) ||
    AMBIGUOUS_SHUTDOWN_CODES.has(code) ||
    NODE_TRANSPORT_CODES.has(code) ||
    code.startsWith("08")
  ) {
    return true
  }
  return (
    code === "23503" &&
    postgresErrorField(error, "constraint") === "url_route_successor_foreign"
  )
}

const configureTransaction = async (client: SqlClient) => {
  await client.query("BEGIN ISOLATION LEVEL READ COMMITTED")
  await client.query("SET LOCAL lock_timeout = '2s'")
  await client.query("SET LOCAL statement_timeout = '5s'")
  await client.query("SET LOCAL idle_in_transaction_session_timeout = '5s'")
  await client.query("SET CONSTRAINTS ALL DEFERRED")
}

const rollbackQuietly = async (client: SqlClient): Promise<boolean> => {
  try {
    await client.query("ROLLBACK")
    return true
  } catch {
    // A severed connection or ambiguous COMMIT cannot be rolled back locally.
    // The retry starts on a fresh lease and resolves through the command ledger.
    return false
  }
}

export const shouldDestroyClient = (error: unknown): boolean => {
  const code = postgresErrorField(error, "code")
  if (code === null) {
    return error instanceof Error && PG_AMBIGUOUS_MESSAGES.has(error.message)
  }
  return (
    code.startsWith("08") ||
    AMBIGUOUS_SHUTDOWN_CODES.has(code) ||
    NODE_TRANSPORT_CODES.has(code)
  )
}

const releaseCause = (error: unknown): Error =>
  error instanceof Error
    ? error
    : new Error("PostgreSQL connection is unusable")

type Attempt<Value> =
  | Readonly<{ kind: "success"; value: Value }>
  | Readonly<{ kind: "failure"; error: unknown }>

const releaseQuietly = (client: SqlClient | null, cause?: Error) => {
  try {
    client?.release(cause)
  } catch {
    // Pool bookkeeping must not mask the mutation or COMMIT result.
  }
}

const executeAttempt = async <Value>(
  pool: SqlPool,
  operation: (client: SqlClient) => Promise<Value>
): Promise<Attempt<Value>> => {
  let client: SqlClient | null = null
  let destroyWith: Error | undefined
  try {
    client = await pool.connect()
    await configureTransaction(client)
    const value = await operation(client)
    await client.query("COMMIT")
    return { kind: "success", value }
  } catch (error) {
    if (client) {
      const rolledBack = await rollbackQuietly(client)
      if (!rolledBack || shouldDestroyClient(error)) {
        destroyWith = releaseCause(error)
      }
    }
    return { kind: "failure", error }
  } finally {
    releaseQuietly(client, destroyWith)
  }
}

const retryDelay = (attempt: number, random: () => number): number => {
  const jitter = random()
  if (!Number.isFinite(jitter) || jitter < 0 || jitter >= 1) {
    throw new RangeError("random must return a finite value in [0, 1)")
  }
  const ceiling = Math.min(
    MAX_RETRY_DELAY_MS,
    BASE_RETRY_DELAY_MS * 2 ** (attempt - 1)
  )
  return Math.floor(jitter * ceiling)
}

export const executeRetriableTransaction = async <Value>(
  pool: SqlPool,
  operation: (client: SqlClient) => Promise<Value>,
  options: TransactionRetryOptions = {}
): Promise<Value> => {
  const maxAttempts = options.maxAttempts ?? MAX_ATTEMPTS
  const random = options.random ?? Math.random
  const sleep = options.sleep ?? defaultSleep
  if (
    !Number.isInteger(maxAttempts) ||
    maxAttempts < 1 ||
    maxAttempts > MAX_ATTEMPTS
  ) {
    throw new RangeError(
      `maxAttempts must be an integer from 1 to ${MAX_ATTEMPTS}`
    )
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = await executeAttempt(pool, operation)
    if (result.kind === "success") {
      return result.value
    }
    if (!isRetryablePostgresError(result.error) || attempt === maxAttempts) {
      throw result.error
    }
    await sleep(retryDelay(attempt, random))
  }

  throw new Error("URL registry transaction exhausted its retry budget")
}
