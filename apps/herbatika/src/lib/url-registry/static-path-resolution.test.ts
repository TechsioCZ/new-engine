import { describe, expect, it } from "vitest"
import type { StaticRouteSnapshot } from "./model"
import { resolveStaticRouteSnapshots } from "./static-path-resolution"

const snapshot = ({
  currentSegment,
  matchMode = "exact",
  parentRouteKey = null,
  routeKey,
}: Readonly<{
  currentSegment: string
  matchMode?: "exact" | "prefix"
  parentRouteKey?: string | null
  routeKey: string
}>): StaticRouteSnapshot => {
  const currentPath = {
    createdAt: "2026-08-21T00:00:00.000Z",
    disposition: "current" as const,
    id: `${routeKey}-current`,
    introducedInVersion: 2,
    market: "sk" as const,
    matchMode,
    parentRouteKey,
    routeKey,
    segment: currentSegment,
  }
  return {
    currentPath,
    pathHistory: [
      {
        ...currentPath,
        disposition: "alias",
        id: `${routeKey}-alias`,
        introducedInVersion: 1,
        segment: `old-${currentSegment}`,
      },
      currentPath,
    ],
    projectionType: "static",
    route: {
      createdAt: "2026-08-21T00:00:00.000Z",
      equivalenceKey: null,
      id: `${routeKey}-route`,
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
      updatedAt: "2026-08-21T00:00:00.000Z",
      version: 2,
    },
  }
}

describe("static path resolution", () => {
  it("redirects an ancestor alias directly to the complete current path", () => {
    const parent = snapshot({
      currentSegment: "products",
      routeKey: "type:products",
    })
    const child = snapshot({
      currentSegment: "featured",
      parentRouteKey: "type:products",
      routeKey: "type:products:featured",
    })

    expect(
      resolveStaticRouteSnapshots([parent, child], {
        market: "sk",
        pathSegments: ["old-products", "old-featured"],
      })
    ).toMatchObject({
      kind: "found",
      value: {
        canonicalPathSegments: ["products", "featured"],
        disposition: "alias",
        matchedPath: [
          { routeKey: "type:products", segment: "old-products" },
          {
            routeKey: "type:products:featured",
            segment: "old-featured",
          },
        ],
      },
    })
  })

  it("fails closed on cross-market projection data", () => {
    const invalid = snapshot({
      currentSegment: "products",
      routeKey: "products",
    })
    expect(
      resolveStaticRouteSnapshots(
        [
          {
            ...invalid,
            route: { ...invalid.route, market: "cz" },
          },
        ],
        { market: "sk", pathSegments: ["products"] }
      )
    ).toEqual({
      causeCode: "CROSS_MARKET_STATIC_ROUTE",
      kind: "invalid-response",
    })
  })

  it("preserves only the suffix of an explicitly prefix-matched alias", () => {
    const products = snapshot({
      currentSegment: "products",
      matchMode: "prefix",
      routeKey: "type:products",
    })
    expect(
      resolveStaticRouteSnapshots([products], {
        market: "sk",
        pathSegments: ["old-products", "Opaque-AbC"],
      })
    ).toMatchObject({
      kind: "found",
      value: {
        canonicalPathSegments: ["products", "Opaque-AbC"],
        disposition: "alias",
        remainderSegments: ["Opaque-AbC"],
      },
    })
  })
})
