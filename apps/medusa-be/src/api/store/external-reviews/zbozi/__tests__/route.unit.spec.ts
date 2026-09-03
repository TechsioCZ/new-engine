import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { describe, expect, it, vi } from "vitest"
import { SHOP_REVIEW_MODULE } from "../../../../../modules/shop-review"
import { STOREFRONT_URL_ASSIGNMENT_MODULE } from "../../../../../modules/storefront-url-assignment"
import { GET } from "../route"

const scopedResolve = (
  market: "ro" | "sk",
  resolveDependency: (registrationName: string) => unknown
) =>
  vi.fn((registrationName: string) => {
    if (registrationName === STOREFRONT_URL_ASSIGNMENT_MODULE) {
      return {
        listStorefrontUrlAssignments: vi.fn(
          async (filters: { market_code?: string }) =>
            filters.market_code === market ? [{ id: `url_${market}` }] : []
        ),
      }
    }
    return resolveDependency(registrationName)
  })

const createResponse = () => {
  const json = vi.fn()
  const response = {
    json,
    setHeader: vi.fn(),
    status: vi.fn(),
  }
  response.status.mockReturnValue(response)

  return { json, response }
}

describe("GET /store/external-reviews/zbozi", () => {
  it("logs internal failures without exposing them in the public response", async () => {
    const internalError = new Error(
      'API store config "Zboží" api_url must contain premiseId'
    )
    const fetchZboziShopTrustSummary = vi.fn().mockRejectedValue(internalError)
    const logger = { error: vi.fn() }
    const resolve = scopedResolve("sk", (registrationName: string) => {
      if (registrationName === SHOP_REVIEW_MODULE) {
        return { fetchZboziShopTrustSummary }
      }
      if (registrationName === ContainerRegistrationKeys.LOGGER) {
        return logger
      }

      throw new Error(`Unexpected registration: ${registrationName}`)
    })
    const { json, response } = createResponse()

    await GET(
      {
        publishable_key_context: { sales_channel_ids: ["sc_sk"] },
        scope: { resolve },
      } as never,
      response as never
    )

    expect(logger.error).toHaveBeenCalledWith(
      "Failed to fetch Zboží review summary",
      internalError
    )
    expect(response.status).toHaveBeenCalledWith(502)
    expect(json).toHaveBeenCalledWith({
      code: "zbozi_summary_fetch_failed",
      message: "External review summary is temporarily unavailable",
    })
  })

  it("keeps successful SK responses out of shared HTTP caches", async () => {
    const summary = {
      provider: "zbozi",
      review_count: 42,
      score: 4.9,
      updated_at: "2026-08-20T10:00:00.000Z",
    }
    const fetchZboziShopTrustSummary = vi.fn().mockResolvedValue(summary)
    const resolve = scopedResolve("sk", (registrationName: string) => {
      if (registrationName === SHOP_REVIEW_MODULE) {
        return { fetchZboziShopTrustSummary }
      }
      throw new Error(`Unexpected registration: ${registrationName}`)
    })
    const { json, response } = createResponse()

    await GET(
      {
        publishable_key_context: { sales_channel_ids: ["sc_sk"] },
        scope: { resolve },
      } as never,
      response as never
    )

    expect(fetchZboziShopTrustSummary).toHaveBeenCalledOnce()
    expect(response.setHeader).toHaveBeenCalledWith(
      "Cache-Control",
      "private, no-store"
    )
    expect(json).toHaveBeenCalledWith(summary)
  })

  it("rejects an RO publishable key before reading the provider", async () => {
    const resolve = scopedResolve("ro", (registrationName: string) => {
      throw new Error(
        `RO request resolved unexpected dependency: ${registrationName}`
      )
    })
    const { json, response } = createResponse()

    await GET(
      {
        publishable_key_context: { sales_channel_ids: ["sc_ro"] },
        scope: { resolve },
      } as never,
      response as never
    )

    expect(resolve).not.toHaveBeenCalledWith(SHOP_REVIEW_MODULE)
    expect(response.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store")
    expect(response.status).toHaveBeenCalledWith(404)
    expect(json).toHaveBeenCalledWith({
      code: "external_reviews_not_available",
      message: "External review summary is temporarily unavailable",
    })
  })
})
