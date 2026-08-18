import { PostgresUrlRegistry as Registry } from "./registry"

export type PostgresUrlRegistryOptions =
  import("./registry").PostgresUrlRegistryOptions
export type PostgresUrlRegistry = import("./registry").PostgresUrlRegistry
export type SqlClient = import("./sql").SqlClient
export type SqlExecutor = import("./sql").SqlExecutor
export type SqlPool = import("./sql").SqlPool
export type SqlQueryResult = import("./sql").SqlQueryResult

export const createPostgresUrlRegistry = (
  pool: SqlPool,
  options?: PostgresUrlRegistryOptions
) => new Registry(pool, options)
