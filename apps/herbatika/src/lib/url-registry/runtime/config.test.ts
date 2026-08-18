import { describe, expect, it } from "vitest"
import { parseUrlRegistryRuntimeConfig } from "./config"

describe("parseUrlRegistryRuntimeConfig", () => {
  it.each([
    undefined,
    "0",
  ])("keeps URLR disabled for the default gate value %s", (enabled) => {
    expect(
      parseUrlRegistryRuntimeConfig({
        URL_REGISTRY_DATABASE_URL: "not parsed while disabled",
        URL_REGISTRY_ENABLED: enabled,
      })
    ).toEqual({ enabled: false })
  })

  it.each([
    "",
    "true",
    "false",
    " 1",
    "1 ",
    "yes",
  ])("rejects the non-exact gate value %j", (enabled) => {
    expect(() =>
      parseUrlRegistryRuntimeConfig({ URL_REGISTRY_ENABLED: enabled })
    ).toThrow("URL_REGISTRY_ENABLED must be exactly 0 or 1")
  })

  it("requires the dedicated private database URL when enabled", () => {
    expect(() =>
      parseUrlRegistryRuntimeConfig({
        DATABASE_URL: "postgresql://fallback:secret@db/main",
        NEXT_PUBLIC_URL_REGISTRY_DATABASE_URL:
          "postgresql://public:secret@db/main",
        URL_REGISTRY_ENABLED: "1",
      })
    ).toThrow("URL_REGISTRY_DATABASE_URL is required")
  })

  it.each([
    "postgres://urlr:secret@db/urlr",
    "postgresql://db/urlr",
  ])("accepts a private PostgreSQL URL", (databaseUrl) => {
    expect(
      parseUrlRegistryRuntimeConfig({
        URL_REGISTRY_DATABASE_URL: databaseUrl,
        URL_REGISTRY_ENABLED: "1",
      })
    ).toEqual({ databaseUrl, enabled: true })
  })

  it.each([
    " postgres://urlr:secret@db/urlr",
    "postgres://urlr:secret@db/urlr ",
    "https://db/urlr",
    "not-a-url",
  ])("rejects an invalid private database URL without echoing it", (value) => {
    let message = ""
    try {
      parseUrlRegistryRuntimeConfig({
        URL_REGISTRY_DATABASE_URL: value,
        URL_REGISTRY_ENABLED: "1",
      })
    } catch (error) {
      message = error instanceof Error ? error.message : String(error)
    }

    expect(message).toBe("URL_REGISTRY_DATABASE_URL must be a PostgreSQL URL")
    expect(message).not.toContain(value)
  })
})
