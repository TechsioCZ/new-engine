import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { describe, expect, it, vi } from "vitest"
import { PRODUCT_REVIEW_MODULE } from "../../../../../../modules/product-review"
import { GET } from "../route"

const createResponse = () => ({
  json: vi.fn(),
})

const publishedProduct = (market: "ro" | "sk", salesChannelId: string) => ({
  id: "prod_1",
  metadata: {
    url_registry_publication: {
      markets: {
        [market]: {
          publicationStatus: "published",
          publicSlug: market === "sk" ? "vitamin-c" : "vitamina-c",
          salesChannelId,
        },
      },
      schemaVersion: 1,
    },
  },
  sales_channels: [{ id: salesChannelId }],
  updated_at: "2026-08-20T10:00:00.000Z",
})

describe("GET /store/products/:id/reviews market isolation", () => {
  it("returns no unscoped UGC for RO without reading review storage", async () => {
    const resolve = vi.fn(() => {
      throw new Error("RO review storage must not be read")
    })
    const response = createResponse()

    await GET(
      {
        params: { id: "prod_1" },
        scope: { resolve },
        validatedQuery: { limit: 20, locale: "ro-RO", offset: 0 },
      } as never,
      response as never
    )

    expect(resolve).not.toHaveBeenCalled()
    expect(response.json).toHaveBeenCalledWith({
      count: 0,
      limit: 20,
      offset: 0,
      reviews: [],
      summary: { average_rating: 0, count: 0 },
    })
  })

  it("rejects an SK locale spoof from an RO publishable key", async () => {
    const graph = vi.fn(async ({ entity }: { entity: string }) => {
      if (entity === "product") {
        return { data: [publishedProduct("ro", "sc_ro")] }
      }
      throw new Error("RO review graph must not be read")
    })
    const resolve = vi.fn((registrationName: string) => {
      if (registrationName === ContainerRegistrationKeys.QUERY) {
        return { graph }
      }
      throw new Error("RO review storage must not be read")
    })
    const response = createResponse()

    await GET(
      {
        params: { id: "prod_1" },
        publishable_key_context: { sales_channel_ids: ["sc_ro"] },
        scope: { resolve },
        validatedQuery: { limit: 20, locale: "sk-SK", offset: 0 },
      } as never,
      response as never
    )

    expect(graph).toHaveBeenCalledOnce()
    expect(resolve).not.toHaveBeenCalledWith(PRODUCT_REVIEW_MODULE)
    expect(response.json).toHaveBeenCalledWith({
      count: 0,
      limit: 20,
      offset: 0,
      reviews: [],
      summary: { average_rating: 0, count: 0 },
    })
  })

  it("preserves approved SK reviews and their summary", async () => {
    const listAndCountReviews = vi.fn().mockResolvedValue([
      [
        {
          content: "Výborný produkt.",
          created_at: "2026-08-19T10:00:00.000Z",
          customer_id: "customer_1",
          first_name: "Jana",
          id: "review_1",
          last_name: "Nováková",
          product_id: "prod_1",
          rating: 5,
          status: "approved",
          title: "Výborný produkt",
        },
      ],
      1,
    ])
    const graph = vi.fn(
      async ({
        entity,
        pagination,
      }: {
        entity: string
        pagination?: { take?: number }
      }) => {
        if (entity === "product") {
          return { data: [publishedProduct("sk", "sc_sk")] }
        }
        if (pagination?.take === 1) {
          return { data: [{ rating: 5 }], metadata: { count: 1 } }
        }
        return { data: [{ rating: 5 }] }
      }
    )
    const resolve = vi.fn((registrationName: string) => {
      if (registrationName === PRODUCT_REVIEW_MODULE) {
        return { listAndCountReviews }
      }
      if (registrationName === ContainerRegistrationKeys.QUERY) {
        return { graph }
      }
      throw new Error(`Unexpected registration: ${registrationName}`)
    })
    const response = createResponse()

    await GET(
      {
        params: { id: "prod_1" },
        publishable_key_context: { sales_channel_ids: ["sc_sk"] },
        scope: { resolve },
        validatedQuery: { limit: 20, locale: "sk-SK", offset: 0 },
      } as never,
      response as never
    )

    expect(listAndCountReviews).toHaveBeenCalledWith(
      { product_id: "prod_1", status: "approved" },
      { order: { created_at: "DESC" }, skip: 0, take: 20 }
    )
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        count: 1,
        reviews: [
          expect.objectContaining({
            id: "review_1",
            rating: 5,
            title: "Výborný produkt",
          }),
        ],
        summary: { average_rating: 5, count: 1 },
      })
    )
  })
})
