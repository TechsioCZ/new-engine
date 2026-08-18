import type { SourceReadResult } from "../contracts"
import { UrlRegistryError } from "../errors"
import type { SqlClient, SqlPool } from "./sql"
import { isRetryablePostgresError, shouldDestroyClient } from "./transaction"

const sleep = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds))

type ReadAttempt<Value> =
  | Readonly<{ kind: "success"; value: Value }>
  | Readonly<{ kind: "failure"; error: unknown }>

const connectionError = (error: unknown) =>
  error instanceof Error
    ? error
    : new Error("PostgreSQL read connection is unusable")

const releaseQuietly = (client: SqlClient | null, cause?: Error) => {
  try {
    client?.release(cause)
  } catch {
    // Releasing a lease must not replace the read result.
  }
}

const readAttempt = async <Value>(
  pool: SqlPool,
  operation: (executor: SqlClient) => Promise<Value>
): Promise<ReadAttempt<Value>> => {
  let client: SqlClient | null = null
  let destroyWith: Error | undefined
  try {
    client = await pool.connect()
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY")
    await client.query("SET LOCAL statement_timeout = '5s'")
    await client.query("SET LOCAL idle_in_transaction_session_timeout = '5s'")
    const value = await operation(client)
    await client.query("COMMIT")
    return { kind: "success", value }
  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK")
      } catch {
        destroyWith = connectionError(error)
      }
      if (shouldDestroyClient(error)) {
        destroyWith = connectionError(error)
      }
    }
    return { kind: "failure", error }
  } finally {
    releaseQuietly(client, destroyWith)
  }
}

const mapReadError = <Value>(error: unknown): SourceReadResult<Value> => {
  if (isRetryablePostgresError(error) || hasDatabaseCode(error)) {
    return { kind: "unavailable" }
  }
  if (
    error instanceof UrlRegistryError &&
    error.code !== "INVARIANT_VIOLATION"
  ) {
    throw error
  }
  return { kind: "invalid-response", causeCode: "INVALID_DATABASE_RESPONSE" }
}

export const executePrimaryRead = async <Value>(
  pool: SqlPool,
  operation: (executor: SqlClient) => Promise<Value>
): Promise<SourceReadResult<Value>> => {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const result = await readAttempt(pool, operation)
    if (result.kind === "success") {
      return { kind: "found", value: result.value }
    }
    if (isRetryablePostgresError(result.error) && attempt < 3) {
      await sleep(Math.floor(Math.random() * 25 * 2 ** (attempt - 1)))
      continue
    }
    return mapReadError(result.error)
  }
  return { kind: "unavailable" }
}

const hasDatabaseCode = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  typeof (error as { code?: unknown }).code === "string"
