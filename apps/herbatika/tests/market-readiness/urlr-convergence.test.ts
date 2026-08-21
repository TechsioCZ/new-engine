import { describe, expect, it } from "vitest"
import {
  POPULATION_CATALOG_KINDS,
  POPULATION_LOCALE_BY_MARKET,
  POPULATION_MARKETS,
} from "../../src/lib/url-registry/population/manifest-contracts"
import { hashPopulationStaticTaxonomy } from "../../src/lib/url-registry/population/static-taxonomy"
import {
  buildFourMarketUrlrConvergence,
  expectedUrlrCatalogProjections,
  hashFourMarketUrlrConvergenceFile,
  parseFourMarketUrlrConvergence,
  serializeFourMarketUrlrConvergence,
  type UrlrMarketHealth,
} from "./urlr-convergence"

const RAW_SHA256 = /^[a-f0-9]{64}$/
const MIGRATION_SHA256 = "b".repeat(64)

const manifestFixture = () => ({
  bindings: POPULATION_MARKETS.map((market) => ({
    locale: POPULATION_LOCALE_BY_MARKET[market],
    market,
    salesChannelId: `sc_${market}`,
  })),
  completeInventory: true,
  entities: POPULATION_MARKETS.flatMap((market) =>
    POPULATION_CATALOG_KINDS.map((kind) => ({
      authority:
        kind === "product"
          ? {
              kind: "medusa-product-publication",
              locale: POPULATION_LOCALE_BY_MARKET[market],
              metadataSchemaVersion: 1,
              publicationStatus: "published",
              salesChannelId: `sc_${market}`,
              sourceEntityExists: true,
              translationVerified: true,
            }
          : {
              assignmentId: `assignment:${kind}:${market}`,
              kind: "medusa-published-assignment",
              locale: POPULATION_LOCALE_BY_MARKET[market],
              publicationStatus: "published",
              salesChannelId: `sc_${market}`,
              sourceEntityExists: true,
              translationVerified: true,
            },
      equivalenceKey: `${kind}:shared-1`,
      indexPolicy: "indexable",
      kind,
      market,
      publicSlug: `${kind}-${market}`,
      sourceEventId: `export:${kind}:${market}:1`,
      sourceId: `${kind}_shared_1`,
      sourceVersion: "1",
    }))
  ),
  generatedAt: "2026-08-21T08:00:00.000Z",
  generator: "four-market-readiness-test",
  schemaVersion: 1,
  sourceSnapshotHash: `sha256:${"a".repeat(64)}`,
  taxonomyApproval: {
    hash: hashPopulationStaticTaxonomy(),
    markets: Object.fromEntries(
      POPULATION_MARKETS.map((market) => [
        market,
        {
          editorialApproval: `editorial:${market}:v1`,
          legalApproval: `legal:${market}:v1`,
        },
      ])
    ),
  },
})

const zeroHealth = (): UrlrMarketHealth[] =>
  POPULATION_MARKETS.map((market) => ({
    conflictCount: 0,
    failedCount: 0,
    market,
    pendingCount: 0,
    processingCount: 0,
  }))

const buildFixture = () => {
  const manifest = manifestFixture()
  return {
    manifest,
    proof: buildFourMarketUrlrConvergence({
      environmentId: "zane-production",
      generatedAt: "2026-08-21T08:05:00.000Z",
      health: zeroHealth(),
      manifest,
      migrationLedgerSha256: MIGRATION_SHA256,
      observedProjections: expectedUrlrCatalogProjections(manifest),
      releaseId: "release-2026-08-21",
    }),
  }
}

describe("four-market URLR convergence", () => {
  it("binds every catalog kind and market to the exact manifest authority", () => {
    const { manifest, proof } = buildFixture()

    expect(Object.keys(proof.markets)).toEqual(POPULATION_MARKETS)
    for (const market of POPULATION_MARKETS) {
      expect(proof.markets[market]).toMatchObject({
        binding: {
          locale: POPULATION_LOCALE_BY_MARKET[market],
          market,
          salesChannelId: `sc_${market}`,
        },
        conflictCount: 0,
        expectedCount: 4,
        extraCount: 0,
        failedCount: 0,
        missingCount: 0,
        observedCount: 4,
        pendingCount: 0,
        processingCount: 0,
      })
      expect(
        Object.fromEntries(
          POPULATION_CATALOG_KINDS.map((kind) => [
            kind,
            proof.markets[market].byKind[kind].count,
          ])
        )
      ).toEqual({ brand: 1, category: 1, collection: 1, product: 1 })
    }

    const bytes = serializeFourMarketUrlrConvergence(proof)
    expect(bytes.endsWith("\n")).toBe(true)
    expect(bytes.slice(0, -1)).toBe(JSON.stringify(JSON.parse(bytes)))
    expect(proof.aggregateSha256).toMatch(RAW_SHA256)
    expect(hashFourMarketUrlrConvergenceFile(proof)).toMatch(RAW_SHA256)
    expect(parseFourMarketUrlrConvergence(JSON.parse(bytes), manifest)).toEqual(
      proof
    )
    const recaptured = buildFourMarketUrlrConvergence({
      environmentId: "zane-production",
      generatedAt: "2026-08-21T08:06:00.000Z",
      health: zeroHealth(),
      manifest,
      migrationLedgerSha256: MIGRATION_SHA256,
      observedProjections: expectedUrlrCatalogProjections(manifest),
      releaseId: "release-2026-08-21",
    })
    expect(recaptured.aggregateSha256).toBe(proof.aggregateSha256)
    expect(hashFourMarketUrlrConvergenceFile(recaptured)).not.toBe(
      hashFourMarketUrlrConvergenceFile(proof)
    )
  })

  it.each([
    [
      "missing",
      (routes: ReturnType<typeof expectedUrlrCatalogProjections>) =>
        routes.slice(1),
    ],
    [
      "extra",
      (routes: ReturnType<typeof expectedUrlrCatalogProjections>) => [
        ...routes,
        { ...routes[0], sourceId: "unexpected" },
      ],
    ],
    [
      "conflict",
      (routes: ReturnType<typeof expectedUrlrCatalogProjections>) => [
        { ...routes[0], locale: "wrong-locale" },
        ...routes.slice(1),
      ],
    ],
  ])("rejects %s route projection drift", (_label, mutate) => {
    const manifest = manifestFixture()
    const routes = expectedUrlrCatalogProjections(manifest)
    expect(() =>
      buildFourMarketUrlrConvergence({
        environmentId: "zane-production",
        generatedAt: "2026-08-21T08:05:00.000Z",
        health: zeroHealth(),
        manifest,
        migrationLedgerSha256: MIGRATION_SHA256,
        observedProjections: mutate(routes),
        releaseId: "release-2026-08-21",
      })
    ).toThrow("is not converged")
  })

  it.each([
    "conflictCount",
    "failedCount",
    "pendingCount",
    "processingCount",
  ] as const)("rejects non-zero %s", (field) => {
    const manifest = manifestFixture()
    const health = zeroHealth()
    health[2] = { ...health[2], [field]: 1 }
    expect(() =>
      buildFourMarketUrlrConvergence({
        environmentId: "zane-production",
        generatedAt: "2026-08-21T08:05:00.000Z",
        health,
        manifest,
        migrationLedgerSha256: MIGRATION_SHA256,
        observedProjections: expectedUrlrCatalogProjections(manifest),
        releaseId: "release-2026-08-21",
      })
    ).toThrow("hu is not converged")
  })

  it("rejects aggregate, nested binding, and schema tampering", () => {
    const { manifest, proof } = buildFixture()
    for (const tampered of [
      { ...proof, aggregateSha256: "0".repeat(64) },
      { ...proof, environmentId: "other-environment" },
      { ...proof, migrationLedgerSha256: "0".repeat(64) },
      { ...proof, releaseId: "other-release" },
      {
        ...proof,
        markets: {
          ...proof.markets,
          cz: {
            ...proof.markets.cz,
            binding: { ...proof.markets.cz.binding, locale: "sk-SK" },
          },
        },
      },
      { ...proof, unexpected: true },
    ]) {
      expect(() => parseFourMarketUrlrConvergence(tampered, manifest)).toThrow()
    }
  })
})
