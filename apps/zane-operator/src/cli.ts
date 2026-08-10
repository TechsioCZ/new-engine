import { SQL } from "bun"

import { buildPostgresConnectionUrl } from "./config"
import { BadRequestError, createOrUpdateDevRole } from "./db"

interface CliArgs {
  username: string
  password: string
  grantConnectToAllDatabases: boolean
  allowProdBroadGrants: boolean
}

const printUsage = (): void => {
  console.error("Usage:")
  console.error(
    "  bun src/cli.ts create-dev-user --username <name> --password-env <ENV_VAR> [--no-grant-connect-all-dbs] [--allow-prod-broad-grants]",
  )
  console.error(
    "  plaintext --password is not supported; provide the password via environment variable",
  )
}

const readFlagValue = (args: string[], index: number, flag: string): string => {
  const value = args[index + 1]
  if (value === undefined || value === "" || value.startsWith("--")) {
    throw new BadRequestError(`${flag} requires a value`)
  }
  return value
}

const parseCreateDevUserArgs = (args: string[]): CliArgs => {
  let username = ""
  let passwordEnvVar = ""
  let grantConnectToAllDatabases = true
  let allowProdBroadGrants = false

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === "--username") {
      username = readFlagValue(args, index, "--username")
      index += 1
    } else if (arg === "--password-env") {
      passwordEnvVar = readFlagValue(args, index, "--password-env")
      index += 1
    } else if (arg === "--password") {
      throw new BadRequestError(
        "plaintext --password is not supported; use --password-env <ENV_VAR>",
      )
    } else if (arg === "--no-grant-connect-all-dbs") {
      grantConnectToAllDatabases = false
    } else if (arg === "--allow-prod-broad-grants") {
      allowProdBroadGrants = true
    } else {
      throw new BadRequestError(`unknown argument: ${arg}`)
    }
  }

  if (username === "") {
    throw new BadRequestError("--username is required")
  }

  if (passwordEnvVar === "") {
    throw new BadRequestError("--password-env is required")
  }

  const password = process.env[passwordEnvVar]
  if (password === undefined || password === "") {
    throw new BadRequestError(
      `environment variable ${passwordEnvVar} is required and must be non-empty when using --password-env`,
    )
  }

  if (password !== password.trim()) {
    console.warn(
      `warning: environment variable ${passwordEnvVar} contains leading/trailing whitespace and will be used as-is`,
    )
  }

  return {
    allowProdBroadGrants,
    grantConnectToAllDatabases,
    password,
    username,
  }
}

const runCreateDevUser = async (args: string[]): Promise<void> => {
  const parsed = parseCreateDevUserArgs(args)
  const isProduction = process.env.NODE_ENV === "production"
  if (
    isProduction &&
    parsed.grantConnectToAllDatabases &&
    !parsed.allowProdBroadGrants
  ) {
    throw new BadRequestError(
      "broad cross-database grants are blocked in production by default; use --no-grant-connect-all-dbs or explicitly pass --allow-prod-broad-grants",
    )
  }

  const databaseUrl = buildPostgresConnectionUrl(process.env)
  const sql = new SQL({
    connectionTimeout: 10,
    idleTimeout: 10,
    max: 2,
    url: databaseUrl,
  })

  try {
    await sql.connect()
    const result = await createOrUpdateDevRole(sql, {
      databaseUrl,
      grantConnectToAllDatabases: parsed.grantConnectToAllDatabases,
      password: parsed.password,
      username: parsed.username,
    })

    console.info(
      JSON.stringify({
        connect_grant_scope: parsed.grantConnectToAllDatabases
          ? "all_non_template_databases"
          : "none",
        connect_grants_applied: result.connectGrantsApplied,
        connect_grants_revoked: result.connectGrantsRevoked,
        created: result.created,
        default_privilege_owners_applied: result.defaultPrivilegeOwnersApplied,
        default_privilege_owners_skipped: result.defaultPrivilegeOwnersSkipped,
        event: "cli.create-dev-user",
        schema_grants_applied: result.schemaGrantsApplied,
        username: result.username,
      }),
    )
  } finally {
    await sql.close({ timeout: 5 })
  }
}

const main = async (argv: string[]): Promise<void> => {
  const [command, ...args] = argv
  if (command !== "create-dev-user") {
    printUsage()
    process.exit(1)
  }

  await runCreateDevUser(args)
}

try {
  await main(process.argv.slice(2))
} catch (error: unknown) {
  if (error instanceof BadRequestError) {
    console.error(error.message)
    printUsage()
    process.exit(1)
  }

  const message = error instanceof Error ? error.message : String(error)
  console.error(message)
  process.exit(1)
}
