import { describe, expect, it, vi } from "vitest"
import type {
  ActiveEntityRouteTarget,
  StaticRouteSnapshot,
} from "@/lib/url-registry/model"

const mocks = vi.hoisted(() => ({
  listPublicEntityProjections: vi.fn(),
  listPublicStaticProjections: vi.fn(),
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/url-registry/runtime/public-projections.server", () => ({
  listPublicEntityProjections: mocks.listPublicEntityProjections,
  listPublicStaticProjections: mocks.listPublicStaticProjections,
}))

import {
  mapRequiredPublicEntitySlugs,
  mapRequiredPublicStaticHrefs,
} from "./public-entity-projection-map"
import {
  readAvailablePublicEntitySlugs,
  readCompletePublicEntitySlugs,
} from "./public-entity-projections"

const projection = (
  sourceId: string,
  normalizedSlug: string
): ActiveEntityRouteTarget => ({
  currentSlug: {
    createdAt: "2026-08-19T00:00:00.000Z",
    disposition: "current",
    id: `slug-${sourceId}`,
    kind: "product",
    market: "sk",
    normalizationVersion: 1,
    normalizedSlug,
    routeId: `route-${sourceId}`,
  },
  projectionType: "entity",
  route: {
    createdAt: "2026-08-19T00:00:00.000Z",
    equivalenceKey: null,
    id: `route-${sourceId}`,
    indexPolicy: "indexable",
    kind: "product",
    market: "sk",
    sourceId,
    sourceSystem: "medusa",
    sourceType: "product",
    staticRouteKey: null,
    status: "active",
    successorRouteId: null,
    targetType: "entity",
    updatedAt: "2026-08-19T00:00:00.000Z",
    version: 1,
  },
})

const staticProjection = (
  routeKey: string,
  segment: string,
  parentRouteKey: string | null = null
): StaticRouteSnapshot => ({
  currentPath: {
    createdAt: "2026-08-19T00:00:00.000Z",
    disposition: "current",
    id: `path-${routeKey}`,
    introducedInVersion: 1,
    market: "sk",
    matchMode: "exact",
    parentRouteKey,
    routeKey,
    segment,
  },
  pathHistory: [],
  projectionType: "static",
  route: {
    createdAt: "2026-08-19T00:00:00.000Z",
    equivalenceKey: null,
    id: `route-${routeKey}`,
    indexPolicy: "indexable",
    kind: "static",
    market: "sk",
    sourceId: null,
    sourceSystem: null,
    sourceType: null,
    staticRouteKey: routeKey,
    status: "active",
    successorRouteId: null,
    targetType: "static",
    updatedAt: "2026-08-19T00:00:00.000Z",
    version: 1,
  },
})

describe("mapRequiredPublicEntitySlugs", () => {
  it("maps stable source IDs to current URLR slugs", () => {
    expect(
      mapRequiredPublicEntitySlugs(
        {
          kind: "product",
          market: "sk",
          requiredSourceIds: ["prod-1"],
        },
        [projection("prod-1", "public-product")]
      )
    ).toEqual({
      kind: "found",
      value: { "prod-1": "public-product" },
    })
  })

  it("fails closed when a visible source has no public projection", () => {
    expect(
      mapRequiredPublicEntitySlugs(
        {
          kind: "product",
          market: "sk",
          requiredSourceIds: ["prod-missing"],
        },
        [projection("prod-1", "public-product")]
      )
    ).toEqual({
      causeCode: "MISSING_PRODUCT_PUBLIC_PROJECTION",
      kind: "invalid-response",
    })
  })

  it("rejects duplicate active routes for one stable source", () => {
    expect(
      mapRequiredPublicEntitySlugs({ kind: "product", market: "sk" }, [
        projection("prod-1", "public-product"),
        projection("prod-1", "other-product"),
      ])
    ).toEqual({
      causeCode: "DUPLICATE_PRODUCT_PUBLIC_PROJECTION",
      kind: "invalid-response",
    })
  })

  it("rejects URLR projections whose source is absent from a complete index", () => {
    expect(
      mapRequiredPublicEntitySlugs(
        {
          kind: "product",
          market: "sk",
          rejectUnexpectedSourceIds: true,
          requiredSourceIds: [],
        },
        [projection("prod-orphaned", "orphaned-product")]
      )
    ).toEqual({
      causeCode: "ORPHANED_PRODUCT_PUBLIC_PROJECTION",
      kind: "invalid-response",
    })
  })

  it("verifies the full stable source identity for requested projections", () => {
    expect(
      mapRequiredPublicEntitySlugs(
        {
          kind: "product",
          market: "sk",
          requiredSourceIdentities: [
            {
              sourceId: "prod-1",
              sourceSystem: "payload",
              sourceType: "product",
            },
          ],
        },
        [projection("prod-1", "public-product")]
      )
    ).toEqual({
      causeCode: "MISMATCHED_PRODUCT_PUBLIC_PROJECTION_IDENTITY",
      kind: "invalid-response",
    })
  })
})

describe("readCompletePublicEntitySlugs", () => {
  it("scans the complete projection index before validating a large source set", async () => {
    const projections = Array.from({ length: 206 }, (_, index) =>
      projection(`category-${index}`, `category-${index}`)
    ).map((item) => ({
      ...item,
      currentSlug: { ...item.currentSlug, kind: "category" as const },
      route: {
        ...item.route,
        kind: "category" as const,
        sourceType: "category" as const,
      },
    }))
    mocks.listPublicEntityProjections.mockResolvedValueOnce({
      kind: "found",
      value: projections,
    })

    const result = await readCompletePublicEntitySlugs({
      kind: "category",
      market: "sk",
      rejectUnexpectedSourceIds: true,
      requiredSourceIds: projections.map(({ route }) => route.sourceId),
    })

    expect(result.kind).toBe("found")
    expect(mocks.listPublicEntityProjections).toHaveBeenCalledWith({
      kind: "category",
      market: "sk",
    })
  })
})

describe("readAvailablePublicEntitySlugs", () => {
  it("returns only validated public projections for a partially populated listing", async () => {
    mocks.listPublicEntityProjections.mockResolvedValueOnce({
      kind: "found",
      value: [projection("prod-1", "public-product")],
    })

    await expect(
      readAvailablePublicEntitySlugs({
        kind: "product",
        market: "sk",
        requiredSourceIds: ["prod-1", "prod-missing"],
      })
    ).resolves.toEqual({
      kind: "found",
      value: { "prod-1": "public-product" },
    })
    expect(mocks.listPublicEntityProjections).toHaveBeenCalledWith({
      kind: "product",
      market: "sk",
      requiredSourceIds: ["prod-1", "prod-missing"],
    })
  })

  it("loads large available listings in bounded projection batches", async () => {
    const sourceIds = Array.from(
      { length: 128 },
      (_, index) => `brand-${index}`
    )
    mocks.listPublicEntityProjections.mockReset()
    mocks.listPublicEntityProjections
      .mockResolvedValueOnce({ kind: "found", value: [] })
      .mockResolvedValueOnce({ kind: "found", value: [] })

    await expect(
      readAvailablePublicEntitySlugs({
        kind: "brand",
        market: "sk",
        requiredSourceIds: sourceIds,
      })
    ).resolves.toEqual({ kind: "found", value: {} })

    expect(mocks.listPublicEntityProjections).toHaveBeenNthCalledWith(1, {
      kind: "brand",
      market: "sk",
      requiredSourceIds: sourceIds.slice(0, 100),
    })
    expect(mocks.listPublicEntityProjections).toHaveBeenNthCalledWith(2, {
      kind: "brand",
      market: "sk",
      requiredSourceIds: sourceIds.slice(100),
    })
  })
})

describe("mapRequiredPublicStaticHrefs", () => {
  it("maps stable route keys through the current URLR hierarchy", () => {
    expect(
      mapRequiredPublicStaticHrefs(
        { market: "sk", requiredRouteKeys: ["contact"] },
        [
          staticProjection("information", "informacie"),
          staticProjection("contact", "kontakt", "information"),
        ]
      )
    ).toEqual({
      kind: "found",
      value: {
        contact: "/informacie/kontakt",
        information: "/informacie",
      },
    })
  })

  it("fails closed for a missing or cyclic static target", () => {
    expect(
      mapRequiredPublicStaticHrefs(
        { market: "sk", requiredRouteKeys: ["privacy"] },
        [staticProjection("about", "o-nas")]
      )
    ).toEqual({
      causeCode: "MISSING_STATIC_PUBLIC_PROJECTION",
      kind: "invalid-response",
    })

    expect(
      mapRequiredPublicStaticHrefs({ market: "sk", requiredRouteKeys: ["a"] }, [
        staticProjection("a", "a", "b"),
        staticProjection("b", "b", "a"),
      ])
    ).toEqual({
      causeCode: "INVALID_STATIC_PUBLIC_PROJECTION_HIERARCHY",
      kind: "invalid-response",
    })
  })
})
