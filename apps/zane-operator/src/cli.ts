import { SQL } from "bun"

import { buildPostgresConnectionUrl } from "./config"
import { BadRequestError, createOrUpdateDevRole } from "./db"

interface CliArgs {
  username: string
  password: string
  grantConnectToAllDatabases: boolean
  allowProdBroadGrants: boolean
}

function printUsage(): void {
  console.error("Usage:")
  console.error(
    "  bun src/cli.ts create-dev-user --username <name> --password <value> [--no-grant-connect-all-dbs] [--allow-prod-broad-grants]",
  )
}

function readFlagValue(args: string[], index: number, flag: string): string {
  const value = args[index + 1]
  if (!value || value.startsWith("--")) {
    throw new BadRequestError(`${flag} requires a value`)
  }
  return value
}

function parseCreateDevUserArgs(args: string[]): CliArgs {
  let username = ""
  let password = ""
  let grantConnectToAllDatabases = true
  let allowProdBroadGrants = false

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === "--username") {
      username = readFlagValue(args, index, "--username")
      index += 1
      continue
    }

    if (arg === "--password") {
      password = readFlagValue(args, index, "--password")
      index += 1
      continue
    }

    if (arg === "--no-grant-connect-all-dbs") {
      grantConnectToAllDatabases = false
      continue
    }

    if (arg === "--allow-prod-broad-grants") {
      allowProdBroadGrants = true
      continue
    }

    throw new BadRequestError(`unknown argument: ${arg}`)
  }

  if (!username) {
    throw new BadRequestError("--username is required")
  }

  if (!password) {
    throw new BadRequestError("--password is required")
  }

  return {
    username,
    password,
    grantConnectToAllDatabases,
    allowProdBroadGrants,
  }
}

async function runCreateDevUser(args: string[]): Promise<void> {
  const parsed = parseCreateDevUserArgs(args)
  const isProduction = process.env.NODE_ENV === "production"
  if (isProduction && parsed.grantConnectToAllDatabases && !parsed.allowProdBroadGrants) {
    throw new BadRequestError(
      "broad cross-database grants are blocked in production by default; use --no-grant-connect-all-dbs or explicitly pass --allow-prod-broad-grants",
    )
  }

  const databaseUrl = buildPostgresConnectionUrl(process.env)
  const sql = new SQL({
    url: databaseUrl,
    max: 2,
    idleTimeout: 10,
    connectionTimeout: 10,
  })

  try {
    await sql.connect()
    const result = await createOrUpdateDevRole(sql, {
      username: parsed.username,
      password: parsed.password,
      databaseUrl,
      grantConnectToAllDatabases: parsed.grantConnectToAllDatabases,
    })

    console.info(
      JSON.stringify({
        event: "cli.create-dev-user",
        username: result.username,
        created: result.created,
        connect_grants_applied: result.connectGrantsApplied,
        schema_grants_applied: result.schemaGrantsApplied,
        default_privilege_owners_applied: result.defaultPrivilegeOwnersApplied,
        default_privilege_owners_skipped: result.defaultPrivilegeOwnersSkipped,
        connect_grant_scope: parsed.grantConnectToAllDatabases ? "all_non_template_databases" : "none",
      }),
    )
  } finally {
    await sql.close({ timeout: 5 })
  }
}

async function main(argv: string[]): Promise<void> {
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
