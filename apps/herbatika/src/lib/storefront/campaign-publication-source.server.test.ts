import { describe, expect, it, vi } from "vitest"
import type { ActiveEntityRouteTarget } from "@/lib/url-registry/model"
import {
  CAMPAIGN_PUBLICATION_SOURCE_ENV,
  CampaignPublicationSourceError,
  hashCampaignPublicationContent,
  parseCampaignPublicationManifest,
  type ReviewedCampaignPublication,
  readReviewedCampaignPublicationManifest,
} from "./campaign-publication-contract"
import {
  type CampaignPublicationDependencies,
  readCampaignPublicationDetail,
  readCampaignPublicationIndex,
  validateCampaignPublicationCandidates,
} from "./campaign-publication-source.server"

const entry = (
  overrides: Partial<Omit<ReviewedCampaignPublication, "contentSha256">> = {}
): ReviewedCampaignPublication => {
  const value = {
    approval: {
      approvedAt: "2026-08-20T10:00:00.000Z",
      approvedBy: "editor@example.test",
      reference: "review:campaign:summer:sk:v1",
      status: "approved" as const,
    },
    content: "<p>Overený obsah letnej kampane.</p>",
    description: "Overená letná kampaň.",
    market: "sk" as const,
    publicSlug: "letna-akcia",
    publishedAt: "2026-08-20T09:00:00.000Z",
    sourceId: "campaign_summer",
    sourceVersion: "7",
    title: "Letná akcia",
    translation: {
      localeCode: "sk-SK",
      reference: "campaign" as const,
      translationId: "translation_campaign_summer_sk",
    },
    ...overrides,
  }
  return { ...value, contentSha256: hashCampaignPublicationContent(value) }
}

const manifest = (entries: readonly unknown[] = [entry()]) =>
  JSON.stringify({ entries, schemaVersion: 1 })

const projection = (
  overrides: Partial<ActiveEntityRouteTarget["route"]> = {}
): ActiveEntityRouteTarget => ({
  currentSlug: {
    createdAt: "2026-08-20T09:00:00.000Z",
    disposition: "current",
    id: "slug_campaign_summer_sk",
    kind: "campaign",
    market: "sk",
    normalizationVersion: 1,
    normalizedSlug: "letna-akcia",
    routeId: "route_campaign_summer_sk",
  },
  projectionType: "entity",
  route: {
    createdAt: "2026-08-20T09:00:00.000Z",
    equivalenceKey: "campaign:summer",
    id: "route_campaign_summer_sk",
    indexPolicy: "indexable",
    kind: "campaign",
    market: "sk",
    sourceId: "campaign_summer",
    sourceSystem: "medusa",
    sourceType: "campaign",
    staticRouteKey: null,
    status: "active",
    successorRouteId: null,
    targetType: "entity",
    updatedAt: "2026-08-20T09:00:00.000Z",
    version: 1,
    ...overrides,
  },
})

const dependencies = (
  routes: readonly ActiveEntityRouteTarget[] = [projection()]
): CampaignPublicationDependencies => ({
  listProjections: vi.fn(async () => ({
    kind: "found" as const,
    value: routes,
  })),
  readManifest: vi.fn(() => ({
    kind: "found" as const,
    value: parseCampaignPublicationManifest(manifest()),
  })),
  readSourceVersions: vi.fn(async () => ({
    kind: "found" as const,
    value: new Map(routes.map((route) => [route.route.id, "7"])),
  })),
})

describe("reviewed campaign publication source", () => {
  it("accepts exact approved localized content with a bound hash", () => {
    expect(parseCampaignPublicationManifest(manifest())).toEqual({
      entries: [entry()],
      schemaVersion: 1,
    })
    expect(
      readReviewedCampaignPublicationManifest({
        [CAMPAIGN_PUBLICATION_SOURCE_ENV]: manifest(),
      })
    ).toMatchObject({ kind: "found" })
  })

  it.each([
    ["content hash", { contentSha256: "0".repeat(64) }],
    [
      "translation locale",
      { translation: { ...entry().translation, localeCode: "cs-CZ" } },
    ],
    ["approval", { approval: { ...entry().approval, status: "pending" } }],
  ])("rejects a mismatched %s proof", (_label, overrides) => {
    const invalid = { ...entry(), ...overrides }
    expect(() => parseCampaignPublicationManifest(manifest([invalid]))).toThrow(
      CampaignPublicationSourceError
    )
  })

  it("maps a missing or malformed operator manifest without fallback content", () => {
    expect(readReviewedCampaignPublicationManifest({})).toEqual({
      kind: "missing",
    })
    expect(
      readReviewedCampaignPublicationManifest({
        [CAMPAIGN_PUBLICATION_SOURCE_ENV]: "{}",
      })
    ).toEqual({
      causeCode: "INVALID_CAMPAIGN_PUBLICATION_MANIFEST",
      kind: "invalid-response",
    })
  })

  it("publishes only exact URLR source, slug, version and translation proofs", async () => {
    await expect(
      readCampaignPublicationIndex("sk", dependencies())
    ).resolves.toEqual({
      kind: "found",
      value: [
        {
          id: "campaign_summer",
          publicSlug: "letna-akcia",
          title: "Letná akcia",
        },
      ],
    })
    await expect(
      readCampaignPublicationDetail(
        { market: "sk", sourceId: "campaign_summer" },
        dependencies()
      )
    ).resolves.toMatchObject({
      kind: "found",
      value: {
        id: "campaign_summer",
        indexable: true,
        publicSlug: "letna-akcia",
      },
    })
  })

  it("keeps a verified noindex URL renderable but out of the index", async () => {
    const noindex = projection({ indexPolicy: "noindex" })
    await expect(
      readCampaignPublicationIndex("sk", dependencies([noindex]))
    ).resolves.toEqual({ kind: "missing" })
    await expect(
      readCampaignPublicationDetail(
        { market: "sk", sourceId: "campaign_summer" },
        dependencies([noindex])
      )
    ).resolves.toMatchObject({
      kind: "found",
      value: { indexable: false },
    })
  })

  it("fails closed when URLR and the reviewed source version diverge", async () => {
    const deps = dependencies()
    vi.mocked(deps.readSourceVersions).mockResolvedValue({
      kind: "found",
      value: new Map([["route_campaign_summer_sk", "8"]]),
    })
    await expect(readCampaignPublicationIndex("sk", deps)).resolves.toEqual({
      causeCode: "CAMPAIGN_PUBLICATION_PROOF_MISMATCH",
      kind: "invalid-response",
    })
  })

  it("validates sitemap candidates against the same reviewed source", () => {
    const source = {
      publicSlug: "letna-akcia",
      routeId: "route_campaign_summer_sk",
      sourceId: "campaign_summer",
      sourceVersion: "7",
    }
    expect(
      validateCampaignPublicationCandidates(
        { market: "sk", sources: [source] },
        { [CAMPAIGN_PUBLICATION_SOURCE_ENV]: manifest() }
      )
    ).toEqual({
      kind: "found",
      value: [{ routeId: "route_campaign_summer_sk" }],
    })
    expect(
      validateCampaignPublicationCandidates(
        { market: "sk", sources: [{ ...source, sourceVersion: "8" }] },
        { [CAMPAIGN_PUBLICATION_SOURCE_ENV]: manifest() }
      )
    ).toEqual({ kind: "found", value: [] })
    expect(
      validateCampaignPublicationCandidates(
        { market: "sk", sources: [source] },
        {}
      )
    ).toEqual({ kind: "found", value: [] })
  })
})
