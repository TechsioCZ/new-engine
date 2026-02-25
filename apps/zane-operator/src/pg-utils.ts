export const IDENTIFIER_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/
export const MAX_IDENTIFIER_LENGTH = 63

type ErrorFactory = (message: string) => Error

function defaultErrorFactory(message: string): Error {
  return new Error(message)
}

export function assertSafeIdentifier(
  value: string,
  label: string,
  errorFactory: ErrorFactory = defaultErrorFactory,
): void {
  if (!IDENTIFIER_REGEX.test(value)) {
    throw errorFactory(`${label} must match ${IDENTIFIER_REGEX.source}`)
  }

  if (value.length > MAX_IDENTIFIER_LENGTH) {
    throw errorFactory(`${label} must be at most ${MAX_IDENTIFIER_LENGTH} characters`)
  }
}

export function quoteIdentifier(
  identifier: string,
  label = "identifier",
  errorFactory: ErrorFactory = defaultErrorFactory,
): string {
  assertSafeIdentifier(identifier, label, errorFactory)
  return `"${identifier}"`
}

export function quoteLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`
}

export async function roleExists(sql: Bun.SQL, roleName: string): Promise<boolean> {
  const rows = await sql<{ exists: boolean }[]>`
    SELECT EXISTS(
      SELECT 1
      FROM pg_roles
      WHERE rolname = ${roleName}
    ) AS "exists"
  `

  return rows[0]?.exists === true
}

export async function databaseExists(sql: Bun.SQL, databaseName: string): Promise<boolean> {
  const rows = await sql<{ exists: boolean }[]>`
    SELECT EXISTS(
      SELECT 1
      FROM pg_database
      WHERE datname = ${databaseName}
    ) AS "exists"
  `

  return rows[0]?.exists === true
}
