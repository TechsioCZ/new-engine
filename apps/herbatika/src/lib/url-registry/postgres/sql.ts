export type SqlQueryResult = Readonly<{
  rows: readonly unknown[]
  rowCount: number | null
}>

// Deliberately narrower than `pg`: the URL registry does not own a pool and
// cannot depend on driver-specific row coercion or connection configuration.
export type SqlExecutor = {
  query(sql: string, values?: readonly unknown[]): Promise<SqlQueryResult>
}

export type SqlClient = SqlExecutor & {
  release(error?: Error | boolean): void
}

export type SqlPool = SqlExecutor & {
  connect(): Promise<SqlClient>
}

export type PostgresErrorShape = Readonly<{
  code?: unknown
  constraint?: unknown
  message?: unknown
}>

export const postgresErrorField = (
  error: unknown,
  field: keyof PostgresErrorShape
): string | null => {
  if (typeof error !== "object" || error === null || !(field in error)) {
    return null
  }
  const value = (error as PostgresErrorShape)[field]
  return typeof value === "string" ? value : null
}
