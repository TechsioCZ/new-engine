import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import { describe, expect, it } from "vitest"
import {
  URL_REGISTRY_MIGRATION_MANIFEST_V1,
  URL_REGISTRY_MIGRATION_MANIFEST_V2,
  URL_REGISTRY_MIGRATION_MANIFEST_V3,
  URL_REGISTRY_MIGRATION_MANIFEST_V4,
  URL_REGISTRY_MIGRATION_MANIFEST_V5,
  URL_REGISTRY_MIGRATION_MANIFEST_V6,
  URL_REGISTRY_MIGRATION_MANIFEST_V7,
  URL_REGISTRY_MIGRATION_MANIFEST_V8,
  URL_REGISTRY_MIGRATION_MANIFEST_VERSION,
} from "./manifest"

const migrationUrls = [
  new URL("../migrations/0001_create_url_registry.sql", import.meta.url),
  new URL(
    "../migrations/0002_create_source_event_tracking.sql",
    import.meta.url
  ),
  new URL(
    "../migrations/0003_generalize_source_event_receipts.sql",
    import.meta.url
  ),
  new URL(
    "../migrations/0004_add_invalidation_delivery_diagnostics.sql",
    import.meta.url
  ),
  new URL(
    "../migrations/0005_allow_catalog_unpublish_retirement.sql",
    import.meta.url
  ),
  new URL("../migrations/0006_expand_entity_slug_length.sql", import.meta.url),
  new URL("../migrations/0007_align_entity_slug_grammar.sql", import.meta.url),
  new URL(
    "../migrations/0008_align_static_route_segment_grammar.sql",
    import.meta.url
  ),
] as const

describe("URL registry migration manifest", () => {
  it("is an immutable, versioned, contiguous manifest", () => {
    expect(URL_REGISTRY_MIGRATION_MANIFEST_VERSION).toBe(8)
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
    expect(URL_REGISTRY_MIGRATION_MANIFEST_V3).toHaveLength(3)
    expect(URL_REGISTRY_MIGRATION_MANIFEST_V3.slice(0, 2)).toEqual(
      URL_REGISTRY_MIGRATION_MANIFEST_V2
    )
    expect(URL_REGISTRY_MIGRATION_MANIFEST_V3[2]).toEqual({
      checksum:
        "sha256:203206facb95c7145b4ab6908faa027e54e06a1b1ce92c5c51bc3d28ead3277d",
      name: "0003_generalize_source_event_receipts.sql",
      version: 3,
    })
    expect(Object.isFrozen(URL_REGISTRY_MIGRATION_MANIFEST_V3)).toBe(true)
    expect(Object.isFrozen(URL_REGISTRY_MIGRATION_MANIFEST_V3[2])).toBe(true)
    expect(URL_REGISTRY_MIGRATION_MANIFEST_V4).toHaveLength(4)
    expect(URL_REGISTRY_MIGRATION_MANIFEST_V4.slice(0, 3)).toEqual(
      URL_REGISTRY_MIGRATION_MANIFEST_V3
    )
    expect(URL_REGISTRY_MIGRATION_MANIFEST_V4[3]).toEqual({
      checksum:
        "sha256:d8d646d9a93d23ada0a92d44bc887a231963ef1531690ece0d335f030e572e24",
      name: "0004_add_invalidation_delivery_diagnostics.sql",
      version: 4,
    })
    expect(Object.isFrozen(URL_REGISTRY_MIGRATION_MANIFEST_V4)).toBe(true)
    expect(Object.isFrozen(URL_REGISTRY_MIGRATION_MANIFEST_V4[3])).toBe(true)
    expect(URL_REGISTRY_MIGRATION_MANIFEST_V5).toHaveLength(5)
    expect(URL_REGISTRY_MIGRATION_MANIFEST_V5.slice(0, 4)).toEqual(
      URL_REGISTRY_MIGRATION_MANIFEST_V4
    )
    expect(URL_REGISTRY_MIGRATION_MANIFEST_V5[4]).toEqual({
      checksum:
        "sha256:2007ae50b9cecb18b5b539a8cd99da1a3eb8b7a83afa33058e7fa2ad52fa460a",
      name: "0005_allow_catalog_unpublish_retirement.sql",
      version: 5,
    })
    expect(Object.isFrozen(URL_REGISTRY_MIGRATION_MANIFEST_V5)).toBe(true)
    expect(Object.isFrozen(URL_REGISTRY_MIGRATION_MANIFEST_V5[4])).toBe(true)
    expect(URL_REGISTRY_MIGRATION_MANIFEST_V6).toHaveLength(6)
    expect(URL_REGISTRY_MIGRATION_MANIFEST_V6.slice(0, 5)).toEqual(
      URL_REGISTRY_MIGRATION_MANIFEST_V5
    )
    expect(URL_REGISTRY_MIGRATION_MANIFEST_V6[5]).toEqual({
      checksum:
        "sha256:68d60e23da47cd8eee53b064bd55a7216af15768e169ae55ef166e1ca82b433d",
      name: "0006_expand_entity_slug_length.sql",
      version: 6,
    })
    expect(Object.isFrozen(URL_REGISTRY_MIGRATION_MANIFEST_V6)).toBe(true)
    expect(Object.isFrozen(URL_REGISTRY_MIGRATION_MANIFEST_V6[5])).toBe(true)
    expect(URL_REGISTRY_MIGRATION_MANIFEST_V7).toHaveLength(7)
    expect(URL_REGISTRY_MIGRATION_MANIFEST_V7.slice(0, 6)).toEqual(
      URL_REGISTRY_MIGRATION_MANIFEST_V6
    )
    expect(URL_REGISTRY_MIGRATION_MANIFEST_V7[6]).toEqual({
      checksum:
        "sha256:577882389d27b2e71fd3b63af4fe5b5810e7865d0a74e8a0898c722a0368da93",
      name: "0007_align_entity_slug_grammar.sql",
      version: 7,
    })
    expect(Object.isFrozen(URL_REGISTRY_MIGRATION_MANIFEST_V7)).toBe(true)
    expect(Object.isFrozen(URL_REGISTRY_MIGRATION_MANIFEST_V7[6])).toBe(true)
    expect(URL_REGISTRY_MIGRATION_MANIFEST_V8).toHaveLength(8)
    expect(URL_REGISTRY_MIGRATION_MANIFEST_V8.slice(0, 7)).toEqual(
      URL_REGISTRY_MIGRATION_MANIFEST_V7
    )
    expect(URL_REGISTRY_MIGRATION_MANIFEST_V8[7]).toEqual({
      checksum:
        "sha256:9a73963668b1ec265436ed81ffb890247347f51fd3ea648c6b61f2c2fcfa3a4f",
      name: "0008_align_static_route_segment_grammar.sql",
      version: 8,
    })
    expect(Object.isFrozen(URL_REGISTRY_MIGRATION_MANIFEST_V8)).toBe(true)
    expect(Object.isFrozen(URL_REGISTRY_MIGRATION_MANIFEST_V8[7])).toBe(true)
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
      URL_REGISTRY_MIGRATION_MANIFEST_V8.map(({ checksum }) => checksum)
    )
  })
})
