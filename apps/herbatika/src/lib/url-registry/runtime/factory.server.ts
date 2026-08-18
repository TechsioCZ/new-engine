import "server-only"

import { Pool } from "pg"
import { createPostgresUrlRegistry } from "../postgres"
import { parseUrlRegistryRuntimeConfig } from "./config"
import { verifyUrlRegistryMigrations } from "./migration-verifier"
import { initializeUrlRegistryRuntime } from "./runtime-core"

const createPool = (connectionString: string) =>
  new Pool({
    allowExitOnIdle: true,
    application_name: "herbatika-url-registry-runtime",
    connectionString,
    connectionTimeoutMillis: 2000,
    idle_in_transaction_session_timeout: 5000,
    idleTimeoutMillis: 30_000,
    lock_timeout: 2000,
    max: 10,
    maxLifetimeSeconds: 300,
    min: 0,
    query_timeout: 6000,
    statement_timeout: 5000,
  })

export const createUrlRegistryRuntime = (
  environment: NodeJS.ProcessEnv = process.env
) =>
  initializeUrlRegistryRuntime<
    ReturnType<typeof createPostgresUrlRegistry>,
    Pool
  >(parseUrlRegistryRuntimeConfig(environment), {
    createPool,
    createRegistry: createPostgresUrlRegistry,
    verifyMigrations: verifyUrlRegistryMigrations,
  })
