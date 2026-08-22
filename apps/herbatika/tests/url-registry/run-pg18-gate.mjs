import { randomUUID } from "node:crypto"
import { fileURLToPath } from "node:url"
import {
  assertLegacyCatalogUnpublishedReceipt,
  assertPostgres181,
  bootstrapDedicatedDatabase,
  createDockerCredentialSet,
  grantRuntimeAccess,
  migrateUrlRegistry,
  seedLegacyCatalogUnpublishedReceipt,
  waitForPostgres,
} from "./pg18-database.mjs"
import { runProcess } from "./pg18-process.mjs"

const appDirectory = fileURLToPath(new URL("../..", import.meta.url))
const vitestCli = fileURLToPath(
  new URL("../../node_modules/vitest/vitest.mjs", import.meta.url)
)
const DOCKER_IMAGE = "postgres:18.1-alpine"
const MIGRATION_URL_ENV = "URL_REGISTRY_PG18_TEST_MIGRATION_DATABASE_URL"
const RUNTIME_URL_ENV = "URL_REGISTRY_PG18_TEST_RUNTIME_DATABASE_URL"
const DOCKER_PORT_MAPPING = /^127\.0\.0\.1:(\d+)$/m
const MISSING_CONTAINER = /no such container/i

const readExternalUrls = () => {
  const migrationUrl = process.env[MIGRATION_URL_ENV]
  const runtimeUrl = process.env[RUNTIME_URL_ENV]
  if (Boolean(migrationUrl) !== Boolean(runtimeUrl)) {
    throw new Error(
      `${MIGRATION_URL_ENV} and ${RUNTIME_URL_ENV} must be set together`
    )
  }
  return migrationUrl && runtimeUrl ? { migrationUrl, runtimeUrl } : null
}

const dockerPort = async (containerName) => {
  const { stdout } = await runProcess(
    "docker",
    ["port", containerName, "5432/tcp"],
    { timeoutMs: 10_000 }
  )
  const match = stdout.trim().match(DOCKER_PORT_MAPPING)
  if (!match) {
    throw new Error(
      `Docker returned an invalid PostgreSQL port mapping: ${stdout.trim()}`
    )
  }
  return Number(match[1])
}

const containerNameFor = (token) =>
  `herbatika-urlr-pg18-${token.replaceAll("-", "").slice(0, 12).toLowerCase()}`

const startDockerDatabase = async (token, containerName) => {
  const suffix = token.replaceAll("-", "").slice(0, 12).toLowerCase()
  const bootstrapUser = `urlr_bootstrap_${suffix}`
  const bootstrapPassword = randomUUID().replaceAll("-", "")
  await runProcess(
    "docker",
    [
      "run",
      "--detach",
      "--name",
      containerName,
      "--env",
      `POSTGRES_USER=${bootstrapUser}`,
      "--env",
      "POSTGRES_PASSWORD",
      "--env",
      "POSTGRES_DB=postgres",
      "--publish",
      "127.0.0.1::5432",
      DOCKER_IMAGE,
    ],
    {
      env: { ...process.env, POSTGRES_PASSWORD: bootstrapPassword },
      timeoutMs: 180_000,
    }
  )
  const port = await dockerPort(containerName)
  const credentials = createDockerCredentialSet({
    host: "127.0.0.1",
    port,
    token,
  })
  const bootstrapUrl = new URL("postgresql://localhost")
  bootstrapUrl.hostname = "127.0.0.1"
  bootstrapUrl.port = String(port)
  bootstrapUrl.username = bootstrapUser
  bootstrapUrl.password = bootstrapPassword
  bootstrapUrl.pathname = "/postgres"
  bootstrapUrl.searchParams.set("sslmode", "disable")
  await waitForPostgres(bootstrapUrl.toString())
  await bootstrapDedicatedDatabase({
    bootstrapUrl: bootstrapUrl.toString(),
    credentials,
  })
  return {
    migrationUrl: credentials.migrationUrl,
    runtimeUrl: credentials.runtimeUrl,
  }
}

const stopContainer = async (containerName) => {
  try {
    await runProcess("docker", ["rm", "--force", containerName], {
      timeoutMs: 30_000,
    })
  } catch (error) {
    if (error instanceof Error && MISSING_CONTAINER.test(error.message)) {
      return
    }
    throw error
  }
}

const main = async () => {
  const external = readExternalUrls()
  let containerName = null
  let cleanupPromise = null
  const cleanup = () => {
    if (!containerName) {
      return Promise.resolve()
    }
    cleanupPromise ??= stopContainer(containerName)
    return cleanupPromise
  }
  const onSignal = (signal) => {
    cleanup()
      .catch((error) =>
        process.stderr.write(
          `${error instanceof Error ? error.message : String(error)}\n`
        )
      )
      .finally(() => process.exit(signal === "SIGINT" ? 130 : 143))
  }
  process.once("SIGINT", () => onSignal("SIGINT"))
  process.once("SIGTERM", () => onSignal("SIGTERM"))

  let primaryError = null
  try {
    const token = randomUUID()
    if (!external) {
      containerName = containerNameFor(token)
    }
    const database =
      external ?? (await startDockerDatabase(token, containerName))
    await assertPostgres181(database.migrationUrl)
    await assertPostgres181(database.runtimeUrl)
    const v4MigrationResult = await migrateUrlRegistry(database.migrationUrl, {
      throughVersion: 4,
    })
    const legacySourceId = await seedLegacyCatalogUnpublishedReceipt(
      database.migrationUrl
    )
    const v7MigrationResult = await migrateUrlRegistry(database.migrationUrl)
    await assertLegacyCatalogUnpublishedReceipt(
      database.migrationUrl,
      legacySourceId
    )
    await grantRuntimeAccess(database)
    process.stdout.write(
      `PostgreSQL 18.1 ready; V4 applied=${v4MigrationResult.applied.length}, V7 applied=${v7MigrationResult.applied.length}, skipped=${v7MigrationResult.skipped.length}; legacy catalog receipt preserved\n`
    )
    await runProcess(
      process.execPath,
      [
        vitestCli,
        "run",
        "--config",
        "tests/url-registry/vitest.pg18.config.mts",
      ],
      {
        cwd: appDirectory,
        env: {
          ...process.env,
          [MIGRATION_URL_ENV]: database.migrationUrl,
          [RUNTIME_URL_ENV]: database.runtimeUrl,
        },
        inheritOutput: true,
        timeoutMs: 600_000,
      }
    )
  } catch (error) {
    primaryError = error
  }

  let cleanupError = null
  try {
    await cleanup()
  } catch (error) {
    cleanupError = error
  }
  if (primaryError) {
    if (cleanupError) {
      process.stderr.write(
        `URL registry PostgreSQL cleanup also failed: ${
          cleanupError instanceof Error
            ? cleanupError.message
            : String(cleanupError)
        }\n`
      )
    }
    throw primaryError
  }
  if (cleanupError) {
    throw cleanupError
  }
}

main().catch((error) => {
  process.stderr.write(
    `URL registry PostgreSQL 18.1 gate failed: ${
      error instanceof Error ? error.stack : String(error)
    }\n`
  )
  process.exitCode = 1
})
