import type { UrlRegistryRuntimeConfig } from "./config"

type OwnedPool = Readonly<{ end(): Promise<void> }>

type RuntimeDependencies<
  Registry,
  ProductLifecycleConsumer,
  InvalidationOutboxStore,
  Pool extends OwnedPool,
> = Readonly<{
  createPool(databaseUrl: string): Pool
  createRegistry(pool: Pool): Registry
  createProductLifecycleConsumer(pool: Pool): ProductLifecycleConsumer
  createInvalidationOutboxStore(pool: Pool): InvalidationOutboxStore
  verifyMigrations(pool: Pool): Promise<void>
}>

export type UrlRegistryRuntime<
  Registry,
  ProductLifecycleConsumer,
  InvalidationOutboxStore,
> =
  | Readonly<{
      close(): Promise<void>
      enabled: false
      invalidationOutboxStore: null
      productLifecycleConsumer: null
      registry: null
    }>
  | Readonly<{
      close(): Promise<void>
      enabled: true
      invalidationOutboxStore: InvalidationOutboxStore
      productLifecycleConsumer: ProductLifecycleConsumer
      registry: Registry
    }>

const disabledRuntime = Object.freeze({
  close: () => Promise.resolve(),
  enabled: false as const,
  invalidationOutboxStore: null,
  productLifecycleConsumer: null,
  registry: null,
})

const closeWithoutMasking = async (pool: OwnedPool) => {
  try {
    await pool.end()
  } catch {
    // The initialization failure is the actionable startup error.
  }
}

const createClose = (pool: OwnedPool) => {
  let closing: Promise<void> | undefined
  return (): Promise<void> => {
    closing ??= Promise.resolve().then(() => pool.end())
    return closing
  }
}

export const initializeUrlRegistryRuntime = async <
  Registry,
  ProductLifecycleConsumer,
  InvalidationOutboxStore,
  Pool extends OwnedPool,
>(
  config: UrlRegistryRuntimeConfig,
  dependencies: RuntimeDependencies<
    Registry,
    ProductLifecycleConsumer,
    InvalidationOutboxStore,
    Pool
  >
): Promise<
  UrlRegistryRuntime<
    Registry,
    ProductLifecycleConsumer,
    InvalidationOutboxStore
  >
> => {
  if (!config.enabled) {
    return disabledRuntime
  }

  const pool = dependencies.createPool(config.databaseUrl)
  try {
    await dependencies.verifyMigrations(pool)
    const registry = dependencies.createRegistry(pool)
    const productLifecycleConsumer =
      dependencies.createProductLifecycleConsumer(pool)
    const invalidationOutboxStore =
      dependencies.createInvalidationOutboxStore(pool)
    return Object.freeze({
      close: createClose(pool),
      enabled: true as const,
      invalidationOutboxStore,
      productLifecycleConsumer,
      registry,
    })
  } catch (error) {
    await closeWithoutMasking(pool)
    throw error
  }
}
