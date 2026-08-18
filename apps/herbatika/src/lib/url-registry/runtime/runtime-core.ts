import type { UrlRegistryRuntimeConfig } from "./config"

type OwnedPool = Readonly<{ end(): Promise<void> }>

type RuntimeDependencies<Registry, Pool extends OwnedPool> = Readonly<{
  createPool(databaseUrl: string): Pool
  createRegistry(pool: Pool): Registry
  verifyMigrations(pool: Pool): Promise<void>
}>

export type UrlRegistryRuntime<Registry> =
  | Readonly<{
      close(): Promise<void>
      enabled: false
      registry: null
    }>
  | Readonly<{
      close(): Promise<void>
      enabled: true
      registry: Registry
    }>

const disabledRuntime = Object.freeze({
  close: () => Promise.resolve(),
  enabled: false as const,
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
  Pool extends OwnedPool,
>(
  config: UrlRegistryRuntimeConfig,
  dependencies: RuntimeDependencies<Registry, Pool>
): Promise<UrlRegistryRuntime<Registry>> => {
  if (!config.enabled) {
    return disabledRuntime
  }

  const pool = dependencies.createPool(config.databaseUrl)
  try {
    await dependencies.verifyMigrations(pool)
    const registry = dependencies.createRegistry(pool)
    return Object.freeze({
      close: createClose(pool),
      enabled: true as const,
      registry,
    })
  } catch (error) {
    await closeWithoutMasking(pool)
    throw error
  }
}
