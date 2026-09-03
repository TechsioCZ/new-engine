import {
  ContainerRegistrationKeys,
  ProductStatus,
} from "@medusajs/framework/utils"
import { describe, expect, it, vi } from "vitest"
import { STOREFRONT_URL_ASSIGNMENT_MODULE } from "../../../modules/storefront-url-assignment"
import { hasExactSlovakReviewScope } from "../review-market-scope"

const catalogRequest = ({
  market = "sk",
  salesChannelIds = ["sc_sk"],
}: {
  market?: "cz" | "hu" | "ro" | "sk" | null
  salesChannelIds?: unknown
} = {}) => {
  const listStorefrontUrlAssignments = vi.fn(
    async (filters: { market_code?: string }) =>
      filters.market_code === market ? [{ id: "url_1" }] : []
  )
  const resolve = vi.fn((registrationName: string) => {
    if (registrationName === STOREFRONT_URL_ASSIGNMENT_MODULE) {
      return { listStorefrontUrlAssignments }
    }
    throw new Error(`Unexpected registration: ${registrationName}`)
  })

  return {
    listStorefrontUrlAssignments,
    request: {
      publishable_key_context: { sales_channel_ids: salesChannelIds },
      scope: { resolve },
    },
    resolve,
  }
}

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

const productRequest = (product: unknown, salesChannelIds = ["sc_sk"]) => {
  const graph = vi.fn().mockResolvedValue({ data: product ? [product] : [] })
  const resolve = vi.fn((registrationName: string) => {
    if (registrationName === ContainerRegistrationKeys.QUERY) {
      return { graph }
    }
    throw new Error(`Unexpected registration: ${registrationName}`)
  })

  return {
    graph,
    request: {
      publishable_key_context: { sales_channel_ids: salesChannelIds },
      scope: { resolve },
    },
  }
}

describe("review market scope", () => {
  it("accepts a catalog channel assigned exclusively to SK", async () => {
    const { listStorefrontUrlAssignments, request } = catalogRequest()

    await expect(hasExactSlovakReviewScope(request as never)).resolves.toBe(
      true
    )
    expect(listStorefrontUrlAssignments).toHaveBeenCalledTimes(4)
  })

  it.each([
    "cz",
    "hu",
    "ro",
  ] as const)("rejects a catalog channel assigned to %s", async (market) => {
    const { request } = catalogRequest({ market })

    await expect(hasExactSlovakReviewScope(request as never)).resolves.toBe(
      false
    )
  })

  it("fails closed for missing, ambiguous, or unavailable channel scope", async () => {
    for (const salesChannelIds of [null, [], ["sc_sk", "sc_ro"]]) {
      const { request: scopedRequest, resolve } = catalogRequest({
        salesChannelIds,
      })

      await expect(
        hasExactSlovakReviewScope(scopedRequest as never)
      ).resolves.toBe(false)
      expect(resolve).not.toHaveBeenCalled()
    }

    const request = {
      publishable_key_context: { sales_channel_ids: ["sc_sk"] },
      scope: {
        resolve: vi.fn(() => {
          throw new Error("storage unavailable")
        }),
      },
    }
    await expect(hasExactSlovakReviewScope(request as never)).resolves.toBe(
      false
    )
  })

  it("accepts an SK-published product for the exact key channel", async () => {
    const { graph, request } = productRequest(publishedProduct("sk", "sc_sk"))

    await expect(
      hasExactSlovakReviewScope(request as never, "prod_1")
    ).resolves.toBe(true)
    expect(graph).toHaveBeenCalledWith({
      entity: "product",
      fields: ["id", "metadata", "updated_at", "sales_channels.id"],
      filters: { id: "prod_1", status: ProductStatus.PUBLISHED },
      pagination: { take: 2 },
    })
  })

  it("rejects RO, wrong-key, and stale product channel scope", async () => {
    const ro = productRequest(publishedProduct("ro", "sc_ro"), ["sc_ro"])
    const wrongChannel = productRequest(publishedProduct("sk", "sc_sk"), [
      "sc_other",
    ])
    const staleChannel = productRequest(
      {
        ...publishedProduct("sk", "sc_sk"),
        sales_channels: [{ id: "sc_ro" }],
      },
      ["sc_sk"]
    )

    await expect(
      hasExactSlovakReviewScope(ro.request as never, "prod_1")
    ).resolves.toBe(false)
    await expect(
      hasExactSlovakReviewScope(wrongChannel.request as never, "prod_1")
    ).resolves.toBe(false)
    await expect(
      hasExactSlovakReviewScope(staleChannel.request as never, "prod_1")
    ).resolves.toBe(false)
  })
})
