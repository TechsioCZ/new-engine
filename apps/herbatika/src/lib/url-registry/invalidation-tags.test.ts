import { describe, expect, it } from "vitest"
import {
  invalidationTagsForSnapshots,
  MAX_URL_REGISTRY_INVALIDATION_TAG_LENGTH,
  MAX_URL_REGISTRY_INVALIDATION_TAGS,
} from "./invalidation-tags"
import type { EntityRouteSnapshot, StaticRouteSnapshot } from "./model"

const timestamp = "2026-01-01T00:00:00.000Z"

const snapshot = (index: number): EntityRouteSnapshot => {
  const routeId = `route-${index}`
  const currentSlug = {
    id: `slug-${index}`,
    market: "sk" as const,
    kind: "product" as const,
    normalizedSlug: `product-${index}`,
    routeId,
    disposition: "current" as const,
    normalizationVersion: 1,
    createdAt: timestamp,
  }
  return {
    projectionType: "entity",
    route: {
      id: routeId,
      market: "sk",
      kind: "product",
      targetType: "entity",
      sourceSystem: "medusa",
      sourceType: "product",
      sourceId: `prod_${index}`,
      staticRouteKey: null,
      equivalenceKey: `product:${index}`,
      indexPolicy: "indexable",
      status: "active",
      successorRouteId: null,
      version: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    currentSlug,
    slugHistory: [
      currentSlug,
      ...Array.from({ length: 150 }, (_, aliasIndex) => ({
        ...currentSlug,
        id: `alias-${index}-${aliasIndex}`,
        normalizedSlug: `old-${index}-${aliasIndex}`,
        disposition: "alias" as const,
      })),
    ],
  }
}

const staticSnapshot = (): StaticRouteSnapshot => {
  const currentPath = {
    createdAt: timestamp,
    disposition: "current" as const,
    id: "static-path-1",
    introducedInVersion: 1,
    market: "sk" as const,
    matchMode: "exact" as const,
    parentRouteKey: null,
    routeKey: "about",
    segment: "o-nas",
  }
  return {
    currentPath,
    pathHistory: [currentPath],
    projectionType: "static",
    route: {
      createdAt: timestamp,
      equivalenceKey: "static:about",
      id: "static-route-1",
      indexPolicy: "indexable",
      kind: "static",
      market: "sk",
      sourceId: null,
      sourceSystem: null,
      sourceType: null,
      staticRouteKey: "about",
      status: "active",
      successorRouteId: null,
      targetType: "static",
      updatedAt: timestamp,
      version: 1,
    },
  }
}

describe("URL registry invalidation tags", () => {
  it("keeps coarse tags and priority paths within the hard bound", () => {
    const priority = "route-slug:sk:product:previous-current"
    const tags = invalidationTagsForSnapshots(
      Array.from({ length: 200 }, (_, index) => snapshot(index)),
      [priority]
    )

    expect(tags).toHaveLength(MAX_URL_REGISTRY_INVALIDATION_TAGS)
    expect(tags).toContain("feed:sk")
    expect(tags).toContain("market:sk")
    expect(tags).toContain("navigation:sk")
    expect(tags).toContain("route-family:sk:product")
    expect(tags).toContain("sitemap:sk")
    expect(tags).toContain(priority)
    expect(tags).not.toContain("route-slug:sk:product:old-0-0")
    expect(tags).toEqual([...tags].sort())
  })

  it("drops overlong exact tags while keeping the coarse invalidation contract", () => {
    const base = snapshot(1)
    const longIdentity = "x".repeat(255)
    const tags = invalidationTagsForSnapshots([
      {
        ...base,
        route: {
          ...base.route,
          equivalenceKey: longIdentity,
          sourceId: longIdentity,
        },
      },
    ])

    expect(tags).toContain("market:sk")
    expect(tags).toContain("route-family:sk:product")
    expect(tags).toContain("sitemap:sk")
    expect(
      tags.every(
        (tag) => tag.length <= MAX_URL_REGISTRY_INVALIDATION_TAG_LENGTH
      )
    ).toBe(true)
    expect(tags).not.toContain(`equivalence:${longIdentity}`)
    expect(tags).not.toContain(`product:sk:${longIdentity}`)
  })

  it("covers static resolver, navigation, feed, and sitemap consumers", () => {
    const tags = invalidationTagsForSnapshots([staticSnapshot()])

    expect(tags).toEqual(
      expect.arrayContaining([
        "feed:sk",
        "market:sk",
        "navigation:sk",
        "route-family:sk:static",
        "route:sk:static:static-route-1",
        "sitemap:sk",
        "static-route:sk:about",
      ])
    )
  })
})
