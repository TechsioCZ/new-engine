import { describe, expect, it, vi } from "vitest"
import type {
  ActiveEntityRouteTarget,
  StaticRouteSnapshot,
} from "@/lib/url-registry/model"

vi.mock("server-only", () => ({}))

import {
  mapRequiredPublicEntitySlugs,
  mapRequiredPublicStaticHrefs,
} from "./public-entity-projection-map"

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
