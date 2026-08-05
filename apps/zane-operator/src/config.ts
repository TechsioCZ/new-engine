const DEFAULT_PORT = 8080
const DEFAULT_PG_PORT = 5432
const DEFAULT_PG_DATABASE = "postgres"
const DEFAULT_PG_SSL_MODE = "disable"
const DEFAULT_DB_TEMPLATE_NAME = "template_medusa"
const DEFAULT_DB_PREVIEW_PREFIX = "medusa_pr_"
const DEFAULT_DB_PREVIEW_APP_USER_PREFIX = "medusa_pr_app_"
const DEFAULT_DB_PREVIEW_DEV_ROLE = "medusa_dev"
const DEFAULT_DB_APP_SCHEMA = "medusa"
const BASE_PROTECTED_DB_NAMES = ["postgres", "template0", "template1"]

const IDENTIFIER_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/u
const INTEGER_PREFIX_REGEX = /^\s*[+-]?\d+/u

export interface AppConfig {
  port: number
  apiAuthToken: string
  databaseUrl: string
  defaultTemplateName: string
  previewPrefix: string
  previewOwner: string
  previewAppUserPrefix: string
  previewDevRole: string
  appSchema: string
  previewAppPasswordSecret: string
  protectedDbNames: Set<string>
  zaneBaseUrl: string | null
  zaneConnectBaseUrl: string | null
  zaneConnectHostHeader: string | null
  zaneUsername: string | null
  zanePassword: string | null
}

interface Environment extends Record<string, string | undefined> {
  API_AUTH_TOKEN?: string
  DB_APP_SCHEMA?: string
  DB_PREVIEW_APP_PASSWORD_SECRET?: string
  DB_PREVIEW_APP_USER_PREFIX?: string
  DB_PREVIEW_DEV_ROLE?: string
  DB_PREVIEW_PREFIX?: string
  DB_PROTECTED_NAMES?: string
  DB_TEMPLATE_NAME?: string
  PGDATABASE?: string
  PGHOST?: string
  PGPASSWORD?: string
  PGPORT?: string
  PGSSLMODE?: string
  PGUSER?: string
  PORT?: string
  ZANE_BASE_URL?: string
  ZANE_CONNECT_BASE_URL?: string
  ZANE_CONNECT_HOST_HEADER?: string
  ZANE_PASSWORD?: string
  ZANE_USERNAME?: string
}

const parsePort = (
  rawValue: string | undefined,
  fallback: number,
  label: string,
): number => {
  if (rawValue === undefined || rawValue.length === 0) {
    return fallback
  }

  const integerPrefix = INTEGER_PREFIX_REGEX.exec(rawValue)?.[0]
  const parsed =
    integerPrefix === undefined ? Number.NaN : Number(integerPrefix)

  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65_535) {
    throw new Error(`${label} must be a valid TCP port (1-65535)`)
  }

  return parsed
}

const readRequiredEnv = (env: Environment, name: string): string => {
  const value = env[name]?.trim()
  if (value === undefined || value.length === 0) {
    throw new Error(`${name} is required`)
  }
  return value
}

const readOptionalEnv = (env: Environment, name: string): string | null => {
  const value = env[name]?.trim()
  return value === undefined || value.length === 0 ? null : value
}

const readEnvWithFallback = (
  value: string | undefined,
  fallback: string,
): string => {
  const trimmedValue = value?.trim()
  return trimmedValue === undefined || trimmedValue.length === 0
    ? fallback
    : trimmedValue
}

const assertSafeIdentifier = (value: string, label: string): void => {
  if (!IDENTIFIER_REGEX.test(value)) {
    throw new Error(`${label} must match ${IDENTIFIER_REGEX.source}`)
  }
}

const parseProtectedDatabaseNames = (
  rawValue: string | undefined,
  requiredNames: string[],
): Set<string> => {
  const protectedNames = new Set<string>(
    BASE_PROTECTED_DB_NAMES.map((name) => name.toLowerCase()),
  )

  for (const requiredName of requiredNames) {
    const normalized = requiredName.trim().toLowerCase()
    if (normalized.length > 0) {
      protectedNames.add(normalized)
    }
  }

  if (rawValue === undefined || rawValue.length === 0) {
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

export const buildPostgresConnectionUrl = (env: Environment): string => {
  const host = readRequiredEnv(env, "PGHOST")
  const port = parsePort(env.PGPORT, DEFAULT_PG_PORT, "PGPORT")
  const user = readRequiredEnv(env, "PGUSER")
  const password = readRequiredEnv(env, "PGPASSWORD")
  const database = readEnvWithFallback(env.PGDATABASE, DEFAULT_PG_DATABASE)
  const sslMode = readEnvWithFallback(env.PGSSLMODE, DEFAULT_PG_SSL_MODE)

  const url = new URL("postgresql://placeholder")
  url.hostname = host
  url.port = String(port)
  url.username = user
  url.password = password
  url.pathname = `/${database}`
  url.searchParams.set("sslmode", sslMode)

  return url.toString()
}

export const loadConfig = (env: Environment = process.env): AppConfig => {
  const connectionUser = readRequiredEnv(env, "PGUSER")

  const previewPrefix = readEnvWithFallback(
    env.DB_PREVIEW_PREFIX,
    DEFAULT_DB_PREVIEW_PREFIX,
  )
  const defaultTemplateName = readEnvWithFallback(
    env.DB_TEMPLATE_NAME,
    DEFAULT_DB_TEMPLATE_NAME,
  )
  const previewOwner = connectionUser
  const previewAppUserPrefix = readEnvWithFallback(
    env.DB_PREVIEW_APP_USER_PREFIX,
    DEFAULT_DB_PREVIEW_APP_USER_PREFIX,
  )
  const previewDevRole = readEnvWithFallback(
    env.DB_PREVIEW_DEV_ROLE,
    DEFAULT_DB_PREVIEW_DEV_ROLE,
  )
  const appSchema = readEnvWithFallback(
    env.DB_APP_SCHEMA,
    DEFAULT_DB_APP_SCHEMA,
  )
  const apiAuthToken = readRequiredEnv(env, "API_AUTH_TOKEN")
  const previewAppPasswordSecret = readRequiredEnv(
    env,
    "DB_PREVIEW_APP_PASSWORD_SECRET",
  )
  const connectionDatabase = readEnvWithFallback(
    env.PGDATABASE,
    DEFAULT_PG_DATABASE,
  )
  const zaneBaseUrl = readOptionalEnv(env, "ZANE_BASE_URL")
  const zaneConnectBaseUrl = readOptionalEnv(env, "ZANE_CONNECT_BASE_URL")
  const zaneConnectHostHeader = readOptionalEnv(env, "ZANE_CONNECT_HOST_HEADER")
  const zaneUsername = readOptionalEnv(env, "ZANE_USERNAME")
  const zanePassword = readOptionalEnv(env, "ZANE_PASSWORD")

  assertSafeIdentifier(connectionUser, "PGUSER")
  assertSafeIdentifier(previewPrefix, "DB_PREVIEW_PREFIX")
  assertSafeIdentifier(defaultTemplateName, "DB_TEMPLATE_NAME")
  assertSafeIdentifier(previewAppUserPrefix, "DB_PREVIEW_APP_USER_PREFIX")
  assertSafeIdentifier(previewDevRole, "DB_PREVIEW_DEV_ROLE")
  assertSafeIdentifier(appSchema, "DB_APP_SCHEMA")

  return {
    apiAuthToken,
    appSchema,
    databaseUrl: buildPostgresConnectionUrl(env),
    defaultTemplateName,
    port: parsePort(env.PORT, DEFAULT_PORT, "PORT"),
    previewAppPasswordSecret,
    previewAppUserPrefix,
    previewDevRole,
    previewOwner,
    previewPrefix,
    protectedDbNames: parseProtectedDatabaseNames(env.DB_PROTECTED_NAMES, [
      connectionDatabase,
      defaultTemplateName,
    ]),
    zaneBaseUrl,
    zaneConnectBaseUrl,
    zaneConnectHostHeader,
    zanePassword,
    zaneUsername,
  }
}
