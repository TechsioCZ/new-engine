import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { afterEach, describe, expect, it, vi } from "vitest"
import { SHOP_REVIEW_MODULE } from "../../../../../modules/shop-review"
import { STOREFRONT_URL_ASSIGNMENT_MODULE } from "../../../../../modules/storefront-url-assignment"
import { GET } from "../route"

const HEUREKA_SHOP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<reviews>
  <review>
    <rating_id>rating-live</rating_id>
    <unix_timestamp>1720000000</unix_timestamp>
    <total_rating>100</total_rating>
    <summary>Rýchle doručenie</summary>
    <recommends>1</recommends>
  </review>
</reviews>`

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

describe("GET /store/external-reviews/heureka", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("loads the Heureka export through the API Store-backed shop review module", async () => {
    const fetchHeurekaReviews = vi.fn().mockResolvedValue({
      body: HEUREKA_SHOP_XML,
      content_type: "application/xml; charset=utf-8",
      provider: "heureka",
      source_url:
        "https://www.heureka.sk/direct/dotaznik/export-review.php?key=%5BREDACTED%5D",
    })
    const logger = { error: vi.fn() }
    const resolve = scopedResolve("sk", (registrationName: string) => {
      if (registrationName === SHOP_REVIEW_MODULE) {
        return { fetchHeurekaReviews }
      }
      if (registrationName === ContainerRegistrationKeys.LOGGER) {
        return logger
      }

      throw new Error(`Unexpected registration: ${registrationName}`)
    })
    const firstResponse = createResponse()
    const secondResponse = createResponse()
    const request = {
      publishable_key_context: { sales_channel_ids: ["sc_sk"] },
      scope: { resolve },
      validatedQuery: { kind: "shop", limit: 4 },
    } as never

    await Promise.all([
      GET(request, firstResponse.response as never),
      GET(request, secondResponse.response as never),
    ])

    expect(fetchHeurekaReviews).toHaveBeenCalledOnce()
    expect(fetchHeurekaReviews).toHaveBeenCalledWith({
      kind: "shop",
      locale: "sk",
    })
    for (const { json } of [firstResponse, secondResponse]) {
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          reviews: [
            expect.objectContaining({
              id: "rating-live",
              message: "Rýchle doručenie",
            }),
          ],
        })
      )
    }
    expect(firstResponse.response.setHeader).toHaveBeenCalledWith(
      "Cache-Control",
      "private, no-store"
    )
  })

  it("logs internal failures without exposing them in the public response", async () => {
    const internalError = new Error(
      'API store config "Heureka SK" must contain api_key'
    )
    const fetchHeurekaReviews = vi.fn().mockRejectedValue(internalError)
    const logger = { error: vi.fn() }
    const resolve = scopedResolve("sk", (registrationName: string) => {
      if (registrationName === SHOP_REVIEW_MODULE) {
        return { fetchHeurekaReviews }
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
        validatedQuery: { kind: "product", limit: 4 },
      } as never,
      response as never
    )

    expect(logger.error).toHaveBeenCalledWith(
      "Failed to fetch Heureka external reviews",
      internalError
    )
    expect(response.status).toHaveBeenCalledWith(502)
    expect(json).toHaveBeenCalledWith({
      code: "heureka_export_fetch_failed",
      message: "External reviews are temporarily unavailable",
    })
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
        validatedQuery: { kind: "shop", limit: 4 },
      } as never,
      response as never
    )

    expect(resolve).not.toHaveBeenCalledWith(SHOP_REVIEW_MODULE)
    expect(response.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store")
    expect(response.status).toHaveBeenCalledWith(404)
    expect(json).toHaveBeenCalledWith({
      code: "external_reviews_not_available",
      message: "External reviews are temporarily unavailable",
    })
  })
})
