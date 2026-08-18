import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { describe, expect, it, vi } from "vitest"
import { SHOP_REVIEW_MODULE } from "../../../../../modules/shop-review"
import { GET } from "../route"

describe("GET /store/external-reviews/zbozi", () => {
  it("logs internal failures without exposing them in the public response", async () => {
    const internalError = new Error(
      'API store config "Zboží" api_url must contain premiseId'
    )
    const fetchZboziShopTrustSummary = vi.fn().mockRejectedValue(internalError)
    const logger = { error: vi.fn() }
    const resolve = vi.fn((registrationName: string) => {
      if (registrationName === SHOP_REVIEW_MODULE) {
        return { fetchZboziShopTrustSummary }
      }
      if (registrationName === ContainerRegistrationKeys.LOGGER) {
        return logger
      }

      throw new Error(`Unexpected registration: ${registrationName}`)
    })
    const json = vi.fn()
    const response = {
      json,
      setHeader: vi.fn(),
      status: vi.fn(),
    }
    response.status.mockReturnValue(response)

    await GET({ scope: { resolve } } as never, response as never)

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
})
