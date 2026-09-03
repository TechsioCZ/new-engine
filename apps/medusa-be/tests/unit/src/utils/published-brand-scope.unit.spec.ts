import { beforeEach, describe, expect, it, vi } from "vitest"
import { STOREFRONT_URL_ASSIGNMENT_MODULE } from "../../../../src/modules/storefront-url-assignment"
import { readPublishedBrandScope } from "../../../../src/utils/published-brand-scope"

const assignment = (id: string) => ({
  entity_id: id,
  entity_kind: "brand",
  market_code: "ro",
  publication_status: "published",
  sales_channel_id: "sc_ro",
})

describe("readPublishedBrandScope", () => {
  const listStorefrontUrlAssignments = vi.fn()
  const container = {
    resolve: vi.fn((key: string) => {
      if (key === STOREFRONT_URL_ASSIGNMENT_MODULE) {
        return { listStorefrontUrlAssignments }
      }
      throw new Error(`Unexpected dependency: ${key}`)
    }),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("keeps the Slovak source catalog unchanged without reading assignments", async () => {
    await expect(
      readPublishedBrandScope({
        container,
        locale: "sk-SK",
        salesChannelIds: ["sc_sk"],
      })
    ).resolves.toEqual({ kind: "source" })
    expect(container.resolve).not.toHaveBeenCalled()
  })

  it("returns only the 103 exact Romanian market/channel published Brands", async () => {
    const allBrandIds = Array.from(
      { length: 128 },
      (_, index) => `brand_${index + 1}`
    )
    const published = allBrandIds.slice(0, 103).map(assignment)
    const excluded = allBrandIds.slice(103)
    listStorefrontUrlAssignments.mockResolvedValue(published)

    await expect(
      readPublishedBrandScope({
        container,
        locale: "ro-RO",
        salesChannelIds: ["sc_ro"],
      })
    ).resolves.toEqual({
      brandIds: published.map(({ entity_id }) => entity_id),
      kind: "published",
      market: "ro",
      salesChannelId: "sc_ro",
    })
    expect(excluded).toHaveLength(25)
    expect(published).toHaveLength(103)
    expect(
      published.some(({ entity_id }) => excluded.includes(entity_id))
    ).toBe(false)
    expect(listStorefrontUrlAssignments).toHaveBeenCalledWith(
      {
        entity_kind: "brand",
        market_code: "ro",
        publication_status: "published",
        sales_channel_id: "sc_ro",
      },
      {
        select: [
          "entity_id",
          "entity_kind",
          "market_code",
          "publication_status",
          "sales_channel_id",
        ],
        take: 10_001,
      }
    )
  })

  it("rejects a cross-market or draft assignment returned by the persistence layer", async () => {
    listStorefrontUrlAssignments.mockResolvedValue([
      { ...assignment("brand_1"), publication_status: "draft" },
    ])

    await expect(
      readPublishedBrandScope({
        container,
        locale: "ro-RO",
        salesChannelIds: ["sc_ro"],
      })
    ).resolves.toEqual({
      causeCode: "INVALID_BRAND_PUBLICATION_ASSIGNMENT",
      kind: "invalid-response",
    })
  })
})
