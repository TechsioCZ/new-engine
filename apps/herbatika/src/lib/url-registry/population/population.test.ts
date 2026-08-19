import { describe, expect, it } from "vitest"
import { createUrlRegistryCommand } from "../command-fingerprint"
import { InMemoryUrlRegistry } from "../memory"
import { parsePopulationManifest } from "./manifest"
import { PopulationManifestError } from "./manifest-contracts"
import {
  applyUrlRegistryPopulation,
  PopulationApplyError,
} from "./population-apply"
import { planUrlRegistryPopulation } from "./population-plan"
import {
  buildPopulationStaticTaxonomy,
  hashPopulationStaticTaxonomy,
} from "./static-taxonomy"

const HASH = `sha256:${"a".repeat(64)}` as `sha256:${string}`

const inputManifest = () => ({
  bindings: [
    { locale: "sk-SK", market: "sk", salesChannelId: "sc_sk" },
    { locale: "cs-CZ", market: "cz", salesChannelId: "sc_cz" },
    { locale: "hu-HU", market: "hu", salesChannelId: "sc_hu" },
    { locale: "ro-RO", market: "ro", salesChannelId: "sc_ro" },
  ],
  completeInventory: true,
  entities: [
    {
      authority: {
        kind: "medusa-product-publication",
        locale: "sk-SK",
        metadataSchemaVersion: 1,
        publicationStatus: "published",
        salesChannelId: "sc_sk",
        sourceEntityExists: true,
        translationVerified: true,
      },
      equivalenceKey: "product:prod_1",
      indexPolicy: "indexable",
      kind: "product",
      market: "sk",
      publicSlug: "zeleny-caj",
      sourceEventId: "population-export:product:prod_1:sk:7",
      sourceId: "prod_1",
      sourceVersion: "7",
    },
    {
      authority: {
        documentStatus: "published",
        kind: "payload-published-document",
        locale: "cs-CZ",
        slugMappingId: "approved-cms-url-map:article:42:cz:v1",
        stableIdVerified: true,
      },
      equivalenceKey: "article:payload-42",
      indexPolicy: "indexable",
      kind: "article",
      market: "cz",
      publicSlug: "jak-vybrat-caj",
      sourceEventId: "population-export:article:42:cz:3",
      sourceId: "42",
      sourceVersion: "3",
    },
  ],
  generatedAt: "2026-08-19T08:00:00.000Z",
  generator: "medusa-payload-authoritative-export-v1",
  schemaVersion: 1,
  sourceSnapshotHash: HASH,
  taxonomyApproval: {
    hash: hashPopulationStaticTaxonomy(),
    markets: Object.fromEntries(
      ["sk", "cz", "hu", "ro"].map((market) => [
        market,
        {
          editorialApproval: `editorial:${market}:2026-08-19`,
          legalApproval: `legal:${market}:2026-08-19`,
        },
      ])
    ),
  },
})

describe("initial URLR population manifest", () => {
  it("accepts only complete authoritative market/channel/locale evidence", () => {
    const manifest = parsePopulationManifest(inputManifest())
    expect(manifest.entities).toHaveLength(2)
    expect(manifest.taxonomyApproval.hash).toBe(hashPopulationStaticTaxonomy())
  })

  it("rejects Store fallback and wrong-channel catalog evidence", () => {
    const input = inputManifest()
    const catalog = input.entities[0]
    if (!catalog) {
      throw new Error("Fixture has no catalog entity")
    }
    catalog.authority.salesChannelId = "sc_other"
    expect(() => parsePopulationManifest(input)).toThrow(
      "authority is not authoritative product publication metadata"
    )
  })

  it("rejects legacy-handle provenance fields instead of deriving a slug", () => {
    const input = inputManifest()
    const catalog = input.entities[0]
    if (!catalog) {
      throw new Error("Fixture has no catalog entity")
    }
    Object.assign(catalog, { legacyHandle: "zeleny-caj" })
    expect(() => parsePopulationManifest(input)).toThrow(
      PopulationManifestError
    )
  })

  it("requires the exact build taxonomy hash and omits campaigns", () => {
    expect(
      buildPopulationStaticTaxonomy().some(({ routeKey }) =>
        routeKey.includes("campaigns")
      )
    ).toBe(false)
    const input = inputManifest()
    input.taxonomyApproval.hash = HASH
    expect(() => parsePopulationManifest(input)).toThrow(
      "taxonomyApproval.hash does not match this build"
    )
  })
})

describe("initial URLR population execution", () => {
  it("dry-runs without writes, applies bounded creates, and converges on rerun", async () => {
    const registry = new InMemoryUrlRegistry()
    const manifest = parsePopulationManifest(inputManifest())
    const firstPlan = await planUrlRegistryPopulation(manifest, registry)

    expect(firstPlan.blockers).toEqual([])
    expect(firstPlan.creates).toHaveLength(
      buildPopulationStaticTaxonomy().length + manifest.entities.length
    )
    await expect(
      registry.findEntityRoute({
        market: "sk",
        sourceId: "prod_1",
        sourceSystem: "medusa",
        sourceType: "product",
      })
    ).resolves.toEqual({ kind: "missing" })

    const applied = await applyUrlRegistryPopulation(manifest, registry, {
      batchSize: 1,
    })
    expect(applied.applied).toBe(firstPlan.creates.length)
    expect(applied.auditIds).toHaveLength(firstPlan.creates.length)

    const converged = await planUrlRegistryPopulation(manifest, registry)
    expect(converged).toMatchObject({ blockers: [], creates: [] })
    expect(converged.noops).toHaveLength(firstPlan.creates.length)

    const rerun = await applyUrlRegistryPopulation(manifest, registry, {
      batchSize: 100,
    })
    expect(rerun).toMatchObject({ applied: 0, replayed: 0 })
    expect(rerun.noops).toBe(firstPlan.creates.length)
  })

  it("fails closed and emits a retirement plan for unmanaged active routes", async () => {
    const registry = new InMemoryUrlRegistry()
    await registry.createEntityRoute(
      createUrlRegistryCommand({
        idempotencyKey: "test:unmanaged",
        request: {
          commandType: "create-entity-route",
          expectedVersion: 0,
          route: {
            equivalenceKey: "product:unmanaged",
            identity: {
              sourceId: "prod_unmanaged",
              sourceSystem: "medusa",
              sourceType: "product",
              staticRouteKey: null,
              targetType: "entity",
            },
            indexPolicy: "indexable",
            kind: "product",
            market: "sk",
          },
          slug: { normalizationVersion: 1, normalizedSlug: "unmanaged" },
          source: {
            producer: "test",
            sourceEventId: "test:unmanaged:event",
            sourceId: "prod_unmanaged",
            sourceSystem: "medusa",
            sourceType: "product",
            sourceVersion: "1",
          },
        },
      })
    )
    const manifest = parsePopulationManifest(inputManifest())
    const plan = await planUrlRegistryPopulation(manifest, registry)

    expect(plan.retirementPlan).toContain("sk:product:prod_unmanaged")
    await expect(
      applyUrlRegistryPopulation(manifest, registry, { batchSize: 25 })
    ).rejects.toBeInstanceOf(PopulationApplyError)
  })

  it("detects a public slug reserved by a different URLR identity", async () => {
    const registry = new InMemoryUrlRegistry()
    await registry.createEntityRoute(
      createUrlRegistryCommand({
        idempotencyKey: "test:reserved-slug",
        request: {
          commandType: "create-entity-route",
          expectedVersion: 0,
          route: {
            equivalenceKey: "product:other",
            identity: {
              sourceId: "prod_other",
              sourceSystem: "medusa",
              sourceType: "product",
              staticRouteKey: null,
              targetType: "entity",
            },
            indexPolicy: "indexable",
            kind: "product",
            market: "sk",
          },
          slug: { normalizationVersion: 1, normalizedSlug: "zeleny-caj" },
          source: {
            producer: "test",
            sourceEventId: "test:reserved-slug:event",
            sourceId: "prod_other",
            sourceSystem: "medusa",
            sourceType: "product",
            sourceVersion: "1",
          },
        },
      })
    )

    const plan = await planUrlRegistryPopulation(
      parsePopulationManifest(inputManifest()),
      registry
    )
    expect(plan.blockers).toContainEqual(
      expect.objectContaining({
        code: "EXISTING_ROUTE_CONFLICT",
        identity: "sk:product:prod_1",
      })
    )
  })
})
