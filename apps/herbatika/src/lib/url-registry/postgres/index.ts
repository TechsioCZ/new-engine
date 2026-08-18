import { PostgresProductLifecycleConsumer as LifecycleConsumer } from "./product-lifecycle-consumer"
import { isProductLifecycleConsumerError as isLifecycleError } from "./product-lifecycle-consumer-support"
import { PostgresUrlRegistry as Registry } from "./registry"

export type PostgresProductLifecycleConsumerOptions =
  import("./product-lifecycle-consumer").PostgresProductLifecycleConsumerOptions
export type ProductLifecycleConsumeResult =
  import("./product-lifecycle-consumer").ProductLifecycleConsumeResult
export type ProductLifecycleSourceReader =
  import("./product-lifecycle-consumer").ProductLifecycleSourceReader
export type ProductLifecycleConsumerError =
  import("./product-lifecycle-consumer-support").ProductLifecycleConsumerError
export type ProductLifecycleConsumerErrorCode =
  import("./product-lifecycle-consumer-support").ProductLifecycleConsumerErrorCode
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

export const createPostgresProductLifecycleConsumer = (
  pool: SqlPool,
  options: PostgresProductLifecycleConsumerOptions
) => new LifecycleConsumer(pool, options)

export const isProductLifecycleConsumerError = (
  value: unknown
): value is ProductLifecycleConsumerError => isLifecycleError(value)
