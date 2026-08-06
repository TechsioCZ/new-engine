import "server-only"

import { readFile } from "node:fs/promises"
import type { UrlRecord } from "@/lib/url/types"
import type { UrlRegistry } from "./contracts"
import { UrlRegistryError } from "./errors"
import { InMemoryUrlRegistry } from "./memory"
import { PostgresUrlRegistry } from "./postgres"

let singleton: Promise<UrlRegistry> | null = null
let testRegistry: UrlRegistry | null = null

const loadFixtures = async (path: string): Promise<UrlRecord[]> => {
  const parsed = JSON.parse(await readFile(path, "utf8")) as Array<
    Omit<UrlRecord, "updatedAt"> & { updatedAt: string }
  >
  if (!Array.isArray(parsed)) {
    throw new UrlRegistryError(
      "CONFIGURATION_ERROR",
      "URL registry memory fixture must be a JSON array"
    )
  }
  return parsed.map((record) => ({
    ...record,
    updatedAt: new Date(record.updatedAt),
  }))
}

const createRegistry = async (): Promise<UrlRegistry> => {
  const driver = process.env.URL_REGISTRY_DRIVER ?? "postgres"
  if (driver === "memory") {
    const fixturePath = process.env.URL_REGISTRY_MEMORY_FIXTURE_PATH
    return new InMemoryUrlRegistry(
      fixturePath ? await loadFixtures(fixturePath) : []
    )
  }
  if (driver === "postgres") {
    const connectionString = process.env.URL_REGISTRY_DATABASE_URL
    if (!connectionString) {
      throw new UrlRegistryError(
        "CONFIGURATION_ERROR",
        "URL_REGISTRY_DATABASE_URL is required for the postgres driver"
      )
    }
    return new PostgresUrlRegistry({ connectionString })
  }
  throw new UrlRegistryError(
    "CONFIGURATION_ERROR",
    `Unsupported URL_REGISTRY_DRIVER: ${driver}`
  )
}

export const getUrlRegistry = (): Promise<UrlRegistry> => {
  if (testRegistry) {
    return Promise.resolve(testRegistry)
  }
  singleton ??= createRegistry()
  return singleton
}

export const setUrlRegistryForTests = (registry: UrlRegistry | null) => {
  if (process.env.NODE_ENV !== "test") {
    throw new UrlRegistryError(
      "CONFIGURATION_ERROR",
      "setUrlRegistryForTests is only available in tests"
    )
  }
  testRegistry = registry
}

export const resetUrlRegistryForTests = () => {
  if (process.env.NODE_ENV !== "test") {
    throw new UrlRegistryError(
      "CONFIGURATION_ERROR",
      "resetUrlRegistryForTests is only available in tests"
    )
  }
  testRegistry = null
  singleton = null
}
