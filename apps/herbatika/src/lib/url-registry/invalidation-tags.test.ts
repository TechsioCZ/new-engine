import { describe, expect, it } from "vitest"
import {
  invalidationTagsForSnapshots,
  MAX_URL_REGISTRY_INVALIDATION_TAG_LENGTH,
  MAX_URL_REGISTRY_INVALIDATION_TAGS,
} from "./invalidation-tags"
import type { EntityRouteSnapshot } from "./model"

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

describe("URL registry invalidation tags", () => {
  it("keeps coarse tags and priority paths within the hard bound", () => {
    const priority = "route-slug:sk:product:previous-current"
    const tags = invalidationTagsForSnapshots(
      Array.from({ length: 200 }, (_, index) => snapshot(index)),
      [priority]
    )

    expect(tags).toHaveLength(MAX_URL_REGISTRY_INVALIDATION_TAGS)
    expect(tags).toContain("market:sk")
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
})
