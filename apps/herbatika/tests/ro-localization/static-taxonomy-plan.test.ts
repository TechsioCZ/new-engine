import { describe, expect, it } from "vitest"
import {
  buildPopulationStaticTaxonomy,
  hashPopulationStaticTaxonomy,
} from "../../src/lib/url-registry/population/static-taxonomy"
import {
  APPROVED_STATIC_CUTOVER_PLAN_HASH,
  assertApprovedStaticCutoverPlan,
  RO_DEMO_STATIC_APPROVAL,
  RO_DEMO_STATIC_ROOTS,
} from "./static-taxonomy-approval"
import { parseStaticTaxonomyGenerateOptions } from "./static-taxonomy-generate"
import { buildStaticTaxonomyCutoverPlan } from "./static-taxonomy-plan"
import { refreshStaticTaxonomyPopulationManifest } from "./static-taxonomy-population-manifest"

const HASH = `sha256:${"a".repeat(64)}`
const SHA256_PATTERN = /^sha256:[a-f0-9]{64}$/
const MANIFEST_PATH_PATTERN = /manifest\.json$/
const PLAN_PATH_PATTERN = /plan\.json$/

const manifestFixture = () => ({
  bindings: [
    { locale: "sk-SK", market: "sk", salesChannelId: "sc_sk" },
    { locale: "cs-CZ", market: "cz", salesChannelId: "sc_cz" },
    { locale: "hu-HU", market: "hu", salesChannelId: "sc_hu" },
    { locale: "ro-RO", market: "ro", salesChannelId: "sc_ro" },
  ],
  completeInventory: true,
  entities: [],
  generatedAt: "2026-08-20T00:00:00.000Z",
  generator: "authoritative-catalog-export/v1",
  schemaVersion: 1,
  sourceSnapshotHash: HASH,
  taxonomyApproval: {
    hash: HASH,
    markets: {
      cz: { editorialApproval: "editorial:cz", legalApproval: "legal:cz" },
      hu: { editorialApproval: "editorial:hu", legalApproval: "legal:hu" },
      ro: { editorialApproval: "old:ro", legalApproval: "old:ro" },
      sk: { editorialApproval: "editorial:sk", legalApproval: "legal:sk" },
    },
  },
})

describe("RO static taxonomy population plan", () => {
  it("binds exactly 11 Romanian demo roots to noindex", () => {
    const plan = buildStaticTaxonomyCutoverPlan()

    expect(plan.demoPolicy).toMatchObject({
      indexPolicy: "noindex",
      market: "ro",
      rootCount: 11,
    })
    expect(plan.demoPolicy.roots).toEqual(
      RO_DEMO_STATIC_ROOTS.map(([pageKey, path]) => ({
        pageKey,
        path,
        routeKey: `root:${pageKey}`,
      }))
    )
    expect(plan.taxonomyApprovalHash).toBe(hashPopulationStaticTaxonomy())
    expect(plan.planHash).toBe(APPROVED_STATIC_CUTOVER_PLAN_HASH)
  })

  it("keeps every Romanian root noindex and isolates other markets", () => {
    const routes = buildPopulationStaticTaxonomy()
    // Owner decision: the G1 gate is retired, so about/faq are Payload-operated
    // noindex roots like every other root static.
    for (const pageKey of ["about", "faq"]) {
      expect(
        routes.find(
          (route) =>
            route.market === "ro" && route.routeKey === `root:${pageKey}`
        )?.indexPolicy
      ).toBe("noindex")
    }
    const plan = buildStaticTaxonomyCutoverPlan(routes)
    expect(plan.isolation.roOnlyRootKeys).toHaveLength(5)
    for (const market of ["sk", "cz", "hu"] as const) {
      expect(plan.isolation.markets[market].routeProjectionHash).toMatch(
        SHA256_PATTERN
      )
    }
  })

  it("refreshes only the RO approval and build taxonomy hash in a manifest", () => {
    const input = manifestFixture()
    const before = structuredClone(input.taxonomyApproval.markets)
    const first = refreshStaticTaxonomyPopulationManifest(input)
    const second = refreshStaticTaxonomyPopulationManifest(input)

    expect(first).toEqual(second)
    expect(input.taxonomyApproval.hash).toBe(HASH)
    expect(first.manifest.taxonomyApproval).toEqual({
      hash: hashPopulationStaticTaxonomy(),
      markets: {
        ...before,
        ro: RO_DEMO_STATIC_APPROVAL,
      },
    })
    expect(first.manifest.bindings).toEqual(input.bindings)
    expect(first.manifest.entities).toEqual(input.entities)
    expect(first.manifest.generator).toBe(input.generator)
    expect(first.manifest.generatedAt).toBe(input.generatedAt)
    expect(first.manifest.sourceSnapshotHash).toBe(input.sourceSnapshotHash)
    expect(first.manifestHash).toMatch(SHA256_PATTERN)
  })

  it("fails closed if any demo root becomes indexable", () => {
    const routes = buildPopulationStaticTaxonomy().map((route) =>
      route.market === "ro" && route.routeKey === "root:terms"
        ? { ...route, indexPolicy: "indexable" as const }
        : route
    )
    expect(() => buildStaticTaxonomyCutoverPlan(routes)).toThrow(
      "RO demo route terms must be noindex"
    )
  })

  it("fails closed on RO about/faq or preserved-market drift", () => {
    const roDrift = buildPopulationStaticTaxonomy().map((route) =>
      route.market === "ro" && route.routeKey === "root:about"
        ? { ...route, indexPolicy: "indexable" as const }
        : route
    )
    expect(() => buildStaticTaxonomyCutoverPlan(roDrift)).toThrow(
      "RO about root must stay a noindex root"
    )

    const skDrift = buildPopulationStaticTaxonomy().map((route) =>
      route.market === "sk" && route.routeKey === "root:about"
        ? { ...route, segment: "drifted" }
        : route
    )
    expect(() => buildStaticTaxonomyCutoverPlan(skDrift)).toThrow(
      "SK static taxonomy projection drifted"
    )
  })

  it("rejects approval metadata drift from the frozen cutover plan", () => {
    const { planHash: _, ...approved } = buildStaticTaxonomyCutoverPlan()
    expect(() =>
      assertApprovedStaticCutoverPlan({
        ...approved,
        approval: {
          ...approved.approval,
          editorialApproval: "unapproved:drift",
        },
      })
    ).toThrow("Static cutover plan differs from the approved release plan")
  })

  it("parses only read-only artifact generator options", () => {
    const options = parseStaticTaxonomyGenerateOptions([
      "--manifest",
      "./manifest.json",
      "--output",
      "./plan.json",
    ])
    expect(options.manifestPath).toMatch(MANIFEST_PATH_PATTERN)
    expect(options.outputPath).toMatch(PLAN_PATH_PATTERN)
    expect(() => parseStaticTaxonomyGenerateOptions(["--apply"])).toThrow(
      "Unknown option: --apply"
    )
  })
})
