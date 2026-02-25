import { SQL } from "bun"
import { assertSafeIdentifier, databaseExists, quoteIdentifier, quoteLiteral, roleExists } from "./pg-utils"

const DEFAULT_PG_PORT = 5432
const DEFAULT_PG_DATABASE = "postgres"
const DEFAULT_PG_SSLMODE = "disable"
const DEFAULT_TEMPLATE_DB = "template_medusa"

interface BootstrapConfig {
  adminDatabaseUrl: string
  adminDatabase: string
  templateDatabase: string
  targetRole: string
  targetPassword: string
  setTemplateOwner: boolean
  failIfTemplateMissing: boolean
  verifyIdempotent: boolean
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

function parseBoolean(rawValue: string | undefined, fallback: boolean, label: string): boolean {
  if (!rawValue) {
    return fallback
  }

  const normalized = rawValue.trim().toLowerCase()
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false
  }

  throw new Error(`${label} must be one of: 1,true,yes,on,0,false,no,off`)
}

function readFirstPresent(env: Environment, names: string[], label: string): string {
  for (const name of names) {
    const value = env[name]?.trim()
    if (value) {
      return value
    }
  }

  throw new Error(`${label} is required (${names.join(" or ")})`)
}

function readRequiredEnv(env: Environment, name: string): string {
  const value = env[name]?.trim()
  if (!value) {
    throw new Error(`${name} is required`)
  }

  return value
}

function buildAdminDatabaseUrl(env: Environment): { databaseUrl: string; database: string } {
  const host = readFirstPresent(env, ["BOOTSTRAP_ADMIN_PGHOST", "PGHOST"], "Postgres host")
  const port = parsePort(
    env.BOOTSTRAP_ADMIN_PGPORT ?? env.PGPORT,
    DEFAULT_PG_PORT,
    "BOOTSTRAP_ADMIN_PGPORT/PGPORT",
  )
  const user = readRequiredEnv(env, "BOOTSTRAP_ADMIN_PGUSER")
  const password = readRequiredEnv(env, "BOOTSTRAP_ADMIN_PGPASSWORD")
  const database = (env.BOOTSTRAP_ADMIN_PGDATABASE ?? env.PGDATABASE)?.trim() || DEFAULT_PG_DATABASE
  const sslMode = (env.BOOTSTRAP_ADMIN_PGSSLMODE ?? env.PGSSLMODE)?.trim() || DEFAULT_PG_SSLMODE

  assertSafeIdentifier(database, "BOOTSTRAP_ADMIN_PGDATABASE/PGDATABASE")

  const url = new URL("postgresql://placeholder")
  url.hostname = host
  url.port = String(port)
  url.username = user
  url.password = password
  url.pathname = `/${database}`
  url.searchParams.set("sslmode", sslMode)

  return { databaseUrl: url.toString(), database }
}

function loadBootstrapConfig(env: Environment = process.env): BootstrapConfig {
  const { databaseUrl, database } = buildAdminDatabaseUrl(env)

  const targetRole = readRequiredEnv(env, "PGUSER")
  const adminRole = readRequiredEnv(env, "BOOTSTRAP_ADMIN_PGUSER")
  if (targetRole === adminRole) {
    throw new Error(
      "PGUSER must not match BOOTSTRAP_ADMIN_PGUSER; refusing to bootstrap admin account as target role",
    )
  }
  const targetPassword = readRequiredEnv(env, "PGPASSWORD")
  const templateDatabase = env.BOOTSTRAP_TEMPLATE_DB?.trim() || env.DB_TEMPLATE_NAME?.trim() || DEFAULT_TEMPLATE_DB

  assertSafeIdentifier(targetRole, "PGUSER")
  assertSafeIdentifier(templateDatabase, "BOOTSTRAP_TEMPLATE_DB/DB_TEMPLATE_NAME")

  return {
    adminDatabaseUrl: databaseUrl,
    adminDatabase: database,
    templateDatabase,
    targetRole,
    targetPassword,
    setTemplateOwner: parseBoolean(env.BOOTSTRAP_SET_TEMPLATE_OWNER, true, "BOOTSTRAP_SET_TEMPLATE_OWNER"),
    failIfTemplateMissing: parseBoolean(
      env.BOOTSTRAP_FAIL_IF_TEMPLATE_MISSING,
      false,
      "BOOTSTRAP_FAIL_IF_TEMPLATE_MISSING",
    ),
    verifyIdempotent: parseBoolean(env.BOOTSTRAP_VERIFY_IDEMPOTENT, false, "BOOTSTRAP_VERIFY_IDEMPOTENT"),
  }
}

async function applyBootstrap(sql: Bun.SQL, config: BootstrapConfig): Promise<void> {
  const quotedTargetRole = quoteIdentifier(config.targetRole)
  const quotedTemplateDb = quoteIdentifier(config.templateDatabase)
  const quotedAdminDb = quoteIdentifier(config.adminDatabase)

  const needsCreation = !(await roleExists(sql, config.targetRole))
  if (needsCreation) {
    await sql.unsafe(`CREATE ROLE ${quotedTargetRole} LOGIN;`)
  }

  await sql.unsafe(
    `ALTER ROLE ${quotedTargetRole} WITH LOGIN NOSUPERUSER CREATEDB CREATEROLE NOBYPASSRLS INHERIT PASSWORD ${quoteLiteral(config.targetPassword)};`,
  )
  await sql.unsafe(`GRANT CONNECT ON DATABASE ${quotedAdminDb} TO ${quotedTargetRole};`)
  await sql.unsafe(`GRANT pg_signal_backend TO ${quotedTargetRole};`)

  const templateExists = await databaseExists(sql, config.templateDatabase)
  if (!templateExists) {
    if (config.failIfTemplateMissing) {
      throw new Error(`template database "${config.templateDatabase}" does not exist`)
    }

    console.info(
      JSON.stringify({
        event: "bootstrap.role.template_missing",
        template_db: config.templateDatabase,
      }),
    )
    return
  }

  await sql.unsafe(`GRANT CONNECT ON DATABASE ${quotedTemplateDb} TO ${quotedTargetRole};`)
  if (config.setTemplateOwner) {
    await sql.unsafe(`ALTER DATABASE ${quotedTemplateDb} OWNER TO ${quotedTargetRole};`)
  }
}

async function runBootstrapPass(sql: Bun.SQL, config: BootstrapConfig, pass: 1 | 2): Promise<void> {
  await applyBootstrap(sql, config)

  console.info(
    JSON.stringify({
      event: "bootstrap.role.pass_complete",
      pass,
      target_role: config.targetRole,
      template_db: config.templateDatabase,
      set_template_owner: config.setTemplateOwner,
    }),
  )
}

async function main(): Promise<void> {
  const config = loadBootstrapConfig(process.env)
  const sql = new SQL({
    url: config.adminDatabaseUrl,
    max: 2,
    idleTimeout: 10,
    connectionTimeout: 10,
  })

  try {
    await sql.connect()
    await runBootstrapPass(sql, config, 1)
    if (config.verifyIdempotent) {
      await runBootstrapPass(sql, config, 2)
    }
  } finally {
    await sql.close({ timeout: 5 })
  }
}

try {
  await main()
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(
    JSON.stringify({
      event: "bootstrap.role.failed",
      message,
    }),
  )
  process.exit(1)
}
