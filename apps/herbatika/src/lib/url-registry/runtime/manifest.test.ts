import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import { describe, expect, it } from "vitest"
import {
  URL_REGISTRY_MIGRATION_MANIFEST_V1,
  URL_REGISTRY_MIGRATION_MANIFEST_VERSION,
} from "./manifest"

const migrationUrl = new URL(
  "../migrations/0001_create_url_registry.sql",
  import.meta.url
)

describe("URL registry migration manifest", () => {
  it("is an immutable, versioned, contiguous manifest", () => {
    expect(URL_REGISTRY_MIGRATION_MANIFEST_VERSION).toBe(1)
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
  })

  it("matches the normalized-LF SHA256 of the real migration", async () => {
    const sql = await readFile(migrationUrl, "utf8")
    const normalized = sql.replace(/\r\n?/g, "\n")
    const checksum = `sha256:${createHash("sha256")
      .update(normalized, "utf8")
      .digest("hex")}`

    expect(checksum).toBe(URL_REGISTRY_MIGRATION_MANIFEST_V1[0].checksum)
  })
})
