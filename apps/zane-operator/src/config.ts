const DEFAULT_PORT = 8080
const DEFAULT_PG_PORT = 5432
const DEFAULT_PG_DATABASE = "postgres"
const DEFAULT_PG_SSL_MODE = "disable"
const DEFAULT_DB_TEMPLATE_NAME = "template_medusa"
const DEFAULT_DB_PREVIEW_PREFIX = "medusa_pr_"
const DEFAULT_DB_PREVIEW_OWNER = "zane_operator"
const DEFAULT_DB_PREVIEW_APP_USER_PREFIX = "medusa_pr_app_"
const DEFAULT_DB_PREVIEW_DEV_ROLE = "medusa_dev"
const DEFAULT_PROTECTED_DB_NAMES = [
  "demo",
  "postgres",
  "template0",
  "template1",
  "template_medusa",
]

const IDENTIFIER_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/

export interface AppConfig {
  port: number
  apiAuthToken: string
  databaseUrl: string
  defaultTemplateName: string
  previewPrefix: string
  previewOwner: string
  previewAppUserPrefix: string
  previewDevRole: string
  previewAppPasswordSecret: string
  protectedDbNames: Set<string>
}

type Environment = Record<string, string | undefined>

function parsePort(rawValue: string | undefined, fallback: number, label: string): number {
  if (!rawValue) {
    return fallback
  }

  const parsed = Number.parseInt(rawValue, 10)

  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65_535) {
    throw new Error(`${label} must be a valid TCP port (1-65535)`)
  }

  return parsed
}

function readRequiredEnv(env: Environment, name: string): string {
  const value = env[name]?.trim()
  if (!value) {
    throw new Error(`${name} is required`)
  }
  return value
}

function assertSafeIdentifier(value: string, label: string): void {
  if (!IDENTIFIER_REGEX.test(value)) {
    throw new Error(`${label} must match ${IDENTIFIER_REGEX.source}`)
  }
}

function parseProtectedDatabaseNames(rawValue: string | undefined): Set<string> {
  const protectedNames = new Set<string>(DEFAULT_PROTECTED_DB_NAMES.map((name) => name.toLowerCase()))

  if (!rawValue) {
    return protectedNames
  }

  const extras = rawValue
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)

  for (const entry of extras) {
    assertSafeIdentifier(entry, "DB_PROTECTED_NAMES entry")
    protectedNames.add(entry.toLowerCase())
  }

  return protectedNames
}

function buildPostgresConnectionUrl(env: Environment): string {
  const host = readRequiredEnv(env, "PGHOST")
  const port = parsePort(env.PGPORT, DEFAULT_PG_PORT, "PGPORT")
  const user = readRequiredEnv(env, "PGUSER")
  const password = readRequiredEnv(env, "PGPASSWORD")
  const database = env.PGDATABASE?.trim() || DEFAULT_PG_DATABASE
  const sslMode = env.PGSSLMODE?.trim() || DEFAULT_PG_SSL_MODE

  const url = new URL("postgresql://placeholder")
  url.hostname = host
  url.port = String(port)
  url.username = user
  url.password = password
  url.pathname = `/${database}`
  url.searchParams.set("sslmode", sslMode)

  return url.toString()
}

export function loadConfig(env: Environment = process.env): AppConfig {
  const previewPrefix = env.DB_PREVIEW_PREFIX?.trim() || DEFAULT_DB_PREVIEW_PREFIX
  const defaultTemplateName = env.DB_TEMPLATE_NAME?.trim() || DEFAULT_DB_TEMPLATE_NAME
  const previewOwner = env.DB_PREVIEW_OWNER?.trim() || DEFAULT_DB_PREVIEW_OWNER
  const previewAppUserPrefix = env.DB_PREVIEW_APP_USER_PREFIX?.trim() || DEFAULT_DB_PREVIEW_APP_USER_PREFIX
  const previewDevRole = env.DB_PREVIEW_DEV_ROLE?.trim() || DEFAULT_DB_PREVIEW_DEV_ROLE
  const apiAuthToken = readRequiredEnv(env, "API_AUTH_TOKEN")
  const previewAppPasswordSecret = env.DB_PREVIEW_APP_PASSWORD_SECRET?.trim() || apiAuthToken

  assertSafeIdentifier(previewPrefix, "DB_PREVIEW_PREFIX")
  assertSafeIdentifier(defaultTemplateName, "DB_TEMPLATE_NAME")
  assertSafeIdentifier(previewOwner, "DB_PREVIEW_OWNER")
  assertSafeIdentifier(previewAppUserPrefix, "DB_PREVIEW_APP_USER_PREFIX")
  assertSafeIdentifier(previewDevRole, "DB_PREVIEW_DEV_ROLE")

  return {
    port: parsePort(env.PORT, DEFAULT_PORT, "PORT"),
    apiAuthToken,
    databaseUrl: buildPostgresConnectionUrl(env),
    defaultTemplateName,
    previewPrefix,
    previewOwner,
    previewAppUserPrefix,
    previewDevRole,
    previewAppPasswordSecret,
    protectedDbNames: parseProtectedDatabaseNames(env.DB_PROTECTED_NAMES),
  }
}
