import { Pool } from "pg"
import { readProductRouteSourceFromMedusa } from "@/lib/storefront/product-route-source.server"
import {
  createPostgresProductLifecycleConsumer,
  createPostgresUrlRegistry,
} from "../postgres"
import { parseUrlRegistryRuntimeConfig } from "./config"
import { verifyUrlRegistryMigrations } from "./migration-verifier"
import { initializeUrlRegistryRuntime } from "./runtime-core"

// Pages Router rejects the App-Router-only `server-only` marker. Consumers
// must remain inside getServerSideProps or another server entry point.

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
    ReturnType<typeof createPostgresProductLifecycleConsumer>,
    Pool
  >(parseUrlRegistryRuntimeConfig(environment), {
    createPool,
    createProductLifecycleConsumer: (pool) =>
      createPostgresProductLifecycleConsumer(pool, {
        readProduct: readProductRouteSourceFromMedusa,
      }),
    createRegistry: createPostgresUrlRegistry,
    verifyMigrations: verifyUrlRegistryMigrations,
  })
