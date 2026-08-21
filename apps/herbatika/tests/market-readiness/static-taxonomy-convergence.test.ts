import { describe, expect, it } from "vitest"
import {
  POPULATION_LOCALE_BY_MARKET,
  POPULATION_MARKETS,
} from "../../src/lib/url-registry/population/manifest-contracts"
import { hashPopulationStaticTaxonomy } from "../../src/lib/url-registry/population/static-taxonomy"
import {
  buildFourMarketStaticTaxonomyConvergence,
  expectedStaticTaxonomyProjections,
  hashFourMarketStaticTaxonomyConvergenceFile,
  parseFourMarketStaticTaxonomyConvergence,
  type StaticTaxonomyMarketHealth,
  serializeFourMarketStaticTaxonomyConvergence,
} from "./static-taxonomy-convergence"

const RAW_SHA256 = /^[a-f0-9]{64}$/
const MIGRATION_SHA256 = "b".repeat(64)
const segmentRegistryByMarket = Object.fromEntries(
  POPULATION_MARKETS.map((market) => [
    market,
    { ref: `segment-registry-g1/${market}.json`, sha256: "c".repeat(64) },
  ])
) as Record<
  (typeof POPULATION_MARKETS)[number],
  Readonly<{ ref: string; sha256: string }>
>

const manifestFixture = () => ({
  bindings: POPULATION_MARKETS.map((market) => ({
    locale: POPULATION_LOCALE_BY_MARKET[market],
    market,
    salesChannelId: `sc_${market}`,
  })),
  completeInventory: true,
  entities: [],
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

const zeroHealth = (): StaticTaxonomyMarketHealth[] =>
  POPULATION_MARKETS.map((market) => ({
    conflictCount: 0,
    failedCount: 0,
    market,
    pendingCount: 0,
  }))

const buildFixture = () => {
  const manifest = manifestFixture()
  return {
    manifest,
    proof: buildFourMarketStaticTaxonomyConvergence({
      environmentId: "zane-production",
      generatedAt: "2026-08-21T08:05:00.000Z",
      health: zeroHealth(),
      manifest,
      migrationLedgerSha256: MIGRATION_SHA256,
      observedProjections: expectedStaticTaxonomyProjections(),
      releaseId: "release-2026-08-21",
      segmentRegistryByMarket,
    }),
  }
}

describe("four-market static taxonomy convergence", () => {
  it("contains every build route, resolved path, and exact market binding", () => {
    const { manifest, proof } = buildFixture()
    const expected = expectedStaticTaxonomyProjections()

    expect(proof.taxonomySha256).toBe(
      hashPopulationStaticTaxonomy().slice("sha256:".length)
    )
    expect(proof.aggregateSha256).toMatch(RAW_SHA256)
    for (const market of POPULATION_MARKETS) {
      const marketExpected = expected.filter((item) => item.market === market)
      expect(proof.markets[market]).toMatchObject({
        approval: {
          editorialApproval: `editorial:${market}:v1`,
          legalApproval: `legal:${market}:v1`,
        },
        binding: {
          locale: POPULATION_LOCALE_BY_MARKET[market],
          market,
          salesChannelId: `sc_${market}`,
        },
        conflictCount: 0,
        expectedCount: marketExpected.length,
        extraCount: 0,
        failedCount: 0,
        missingCount: 0,
        observedCount: marketExpected.length,
        pendingCount: 0,
        segmentRegistry: segmentRegistryByMarket[market],
      })
      expect(proof.markets[market].projections).toEqual(marketExpected)
      expect(
        proof.markets[market].projections.every(({ path }) =>
          path.startsWith("/")
        )
      ).toBe(true)
    }
    expect(
      expected.some(({ routeKey }) => routeKey.includes("campaigns"))
    ).toBe(false)

    const bytes = serializeFourMarketStaticTaxonomyConvergence(proof)
    expect(bytes.endsWith("\n")).toBe(true)
    expect(bytes.slice(0, -1)).toBe(JSON.stringify(JSON.parse(bytes)))
    expect(hashFourMarketStaticTaxonomyConvergenceFile(proof)).toMatch(
      RAW_SHA256
    )
    expect(
      parseFourMarketStaticTaxonomyConvergence(JSON.parse(bytes), manifest)
    ).toEqual(proof)
    const recaptured = buildFourMarketStaticTaxonomyConvergence({
      environmentId: "zane-production",
      generatedAt: "2026-08-21T08:06:00.000Z",
      health: zeroHealth(),
      manifest,
      migrationLedgerSha256: MIGRATION_SHA256,
      observedProjections: expectedStaticTaxonomyProjections(),
      releaseId: "release-2026-08-21",
      segmentRegistryByMarket,
    })
    expect(recaptured.aggregateSha256).toBe(proof.aggregateSha256)
    expect(hashFourMarketStaticTaxonomyConvergenceFile(recaptured)).not.toBe(
      hashFourMarketStaticTaxonomyConvergenceFile(proof)
    )
  })

  it.each([
    [
      "missing",
      (routes: ReturnType<typeof expectedStaticTaxonomyProjections>) =>
        routes.slice(1),
    ],
    [
      "extra",
      (routes: ReturnType<typeof expectedStaticTaxonomyProjections>) => [
        ...routes,
        {
          ...routes[0],
          path: "/unexpected",
          routeKey: "root:unexpected",
        },
      ],
    ],
    [
      "conflict",
      (routes: ReturnType<typeof expectedStaticTaxonomyProjections>) => [
        { ...routes[0], segment: "wrong-segment" },
        ...routes.slice(1),
      ],
    ],
  ])("rejects %s static projection drift", (_label, mutate) => {
    const manifest = manifestFixture()
    expect(() =>
      buildFourMarketStaticTaxonomyConvergence({
        environmentId: "zane-production",
        generatedAt: "2026-08-21T08:05:00.000Z",
        health: zeroHealth(),
        manifest,
        migrationLedgerSha256: MIGRATION_SHA256,
        observedProjections: mutate(expectedStaticTaxonomyProjections()),
        releaseId: "release-2026-08-21",
        segmentRegistryByMarket,
      })
    ).toThrow("is not converged")
  })

  it.each([
    "conflictCount",
    "failedCount",
    "pendingCount",
  ] as const)("rejects non-zero %s", (field) => {
    const health = zeroHealth()
    health[3] = { ...health[3], [field]: 1 }
    expect(() =>
      buildFourMarketStaticTaxonomyConvergence({
        environmentId: "zane-production",
        generatedAt: "2026-08-21T08:05:00.000Z",
        health,
        manifest: manifestFixture(),
        migrationLedgerSha256: MIGRATION_SHA256,
        observedProjections: expectedStaticTaxonomyProjections(),
        releaseId: "release-2026-08-21",
        segmentRegistryByMarket,
      })
    ).toThrow("ro is not converged")
  })

  it("rejects aggregate, binding, build taxonomy, and schema tampering", () => {
    const { manifest, proof } = buildFixture()
    for (const tampered of [
      { ...proof, aggregateSha256: "0".repeat(64) },
      { ...proof, environmentId: "other-environment" },
      { ...proof, migrationLedgerSha256: "0".repeat(64) },
      { ...proof, releaseId: "other-release" },
      { ...proof, taxonomySha256: "0".repeat(64) },
      {
        ...proof,
        markets: {
          ...proof.markets,
          hu: {
            ...proof.markets.hu,
            binding: { ...proof.markets.hu.binding, locale: "sk-SK" },
          },
        },
      },
      {
        ...proof,
        markets: {
          ...proof.markets,
          ro: {
            ...proof.markets.ro,
            approval: {
              ...proof.markets.ro.approval,
              legalApproval: "unreviewed",
            },
          },
        },
      },
      {
        ...proof,
        markets: {
          ...proof.markets,
          sk: {
            ...proof.markets.sk,
            segmentRegistry: {
              ...proof.markets.sk.segmentRegistry,
              sha256: "0".repeat(64),
            },
          },
        },
      },
      { ...proof, unexpected: true },
    ]) {
      expect(() =>
        parseFourMarketStaticTaxonomyConvergence(tampered, manifest)
      ).toThrow()
    }
  })
})
