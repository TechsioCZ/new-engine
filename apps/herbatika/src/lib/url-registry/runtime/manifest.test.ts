import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import { describe, expect, it } from "vitest"
import {
  URL_REGISTRY_MIGRATION_MANIFEST_V1,
  URL_REGISTRY_MIGRATION_MANIFEST_V2,
  URL_REGISTRY_MIGRATION_MANIFEST_VERSION,
} from "./manifest"

const migrationUrls = [
  new URL("../migrations/0001_create_url_registry.sql", import.meta.url),
  new URL(
    "../migrations/0002_create_source_event_tracking.sql",
    import.meta.url
  ),
] as const

describe("URL registry migration manifest", () => {
  it("is an immutable, versioned, contiguous manifest", () => {
    expect(URL_REGISTRY_MIGRATION_MANIFEST_VERSION).toBe(2)
    expect(URL_REGISTRY_MIGRATION_MANIFEST_V1).toEqual([
      {
        checksum:
          "sha256:a2982999a57c35e72cb305a0c5c6f066f0af97c99356220c448c61d0094e0d39",
        name: "0001_create_url_registry.sql",
        version: 1,
      },
    ])
    expect(Object.isFrozen(URL_REGISTRY_MIGRATION_MANIFEST_V1)).toBe(true)
    expect(Object.isFrozen(URL_REGISTRY_MIGRATION_MANIFEST_V1[0])).toBe(true)
    expect(URL_REGISTRY_MIGRATION_MANIFEST_V2).toHaveLength(2)
    expect(URL_REGISTRY_MIGRATION_MANIFEST_V2[0]).toEqual(
      URL_REGISTRY_MIGRATION_MANIFEST_V1[0]
    )
    expect(URL_REGISTRY_MIGRATION_MANIFEST_V2[1]).toEqual({
      checksum:
        "sha256:1de756b1ba2c69218c748867a86bc1fde5ecea0453ff82cdba5493fe9ea5010f",
      name: "0002_create_source_event_tracking.sql",
      version: 2,
    })
    expect(Object.isFrozen(URL_REGISTRY_MIGRATION_MANIFEST_V2)).toBe(true)
    expect(Object.isFrozen(URL_REGISTRY_MIGRATION_MANIFEST_V2[1])).toBe(true)
  })

  it("matches the normalized-LF SHA256 of the real migration", async () => {
    const checksums = await Promise.all(
      migrationUrls.map(async (migrationUrl) => {
        const sql = await readFile(migrationUrl, "utf8")
        const normalized = sql.replace(/\r\n?/g, "\n")
        return `sha256:${createHash("sha256")
          .update(normalized, "utf8")
          .digest("hex")}`
      })
    )

    expect(checksums).toEqual(
      URL_REGISTRY_MIGRATION_MANIFEST_V2.map(({ checksum }) => checksum)
    )
  })
})
