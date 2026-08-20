const POSTGRES_PROTOCOLS = new Set(["postgres:", "postgresql:"])

type Environment = Readonly<Record<string, string | undefined>>

export type UrlRegistryRuntimeConfig =
  | Readonly<{ enabled: false }>
  | Readonly<{ databaseUrl: string; enabled: true }>

const requireDatabaseUrl = (environment: Environment): string => {
  const value = environment.URL_REGISTRY_DATABASE_URL
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("URL_REGISTRY_DATABASE_URL is required")
  }
  if (value.trim() !== value) {
    throw new Error("URL_REGISTRY_DATABASE_URL must be a PostgreSQL URL")
  }

  try {
    const parsed = new URL(value)
    if (!POSTGRES_PROTOCOLS.has(parsed.protocol)) {
      throw new Error("Unsupported database URL protocol")
    }
  } catch {
    throw new Error("URL_REGISTRY_DATABASE_URL must be a PostgreSQL URL")
  }
  return value
}

export const parseUrlRegistryRuntimeConfig = (
  environment: Environment
): UrlRegistryRuntimeConfig => {
  const enabled = environment.URL_REGISTRY_ENABLED
  if (enabled === undefined || enabled === "0") {
    return Object.freeze({ enabled: false })
  }
  if (enabled !== "1") {
    throw new Error("URL_REGISTRY_ENABLED must be exactly 0 or 1")
  }
  return Object.freeze({
    databaseUrl: requireDatabaseUrl(environment),
    enabled: true,
  })
}
