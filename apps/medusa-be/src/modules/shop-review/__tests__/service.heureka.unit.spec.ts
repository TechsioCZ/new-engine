import { afterEach, describe, expect, it, vi } from "vitest"
import { API_STORE_MODULE } from "../../api-store"
import ShopReviewModuleService from "../service"

const logger = {
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
}

describe("ShopReviewModuleService Heureka exports", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it("uses the product export default when the configured URL is empty", async () => {
    const fetch = vi.fn().mockResolvedValue({
      headers: new Headers({ "content-type": "application/xml" }),
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue("<reviews />"),
    })
    vi.stubGlobal("fetch", fetch)
    const service = new ShopReviewModuleService({
      [API_STORE_MODULE]: {
        retrieveApiStoreSecretsByName: vi.fn(async (name: string) => ({
          api_key: "heureka-key",
          api_url: " ",
          credentials: null,
          enabled: true,
          name,
        })),
      },
      logger,
    } as never)

    await service.fetchHeurekaReviews({ kind: "product", locale: "sk" })

    expect(fetch).toHaveBeenCalledWith(
      "https://www.heureka.sk/direct/dotaznik/export-product-review.php?key=heureka-key",
      expect.objectContaining({
        headers: expect.objectContaining({
          accept: "application/xml,text/xml,*/*",
        }),
      })
    )
  })

  it("does not call Heureka when its API Store record is disabled", async () => {
    const fetch = vi.fn()
    vi.stubGlobal("fetch", fetch)
    const service = new ShopReviewModuleService({
      [API_STORE_MODULE]: {
        retrieveApiStoreSecretsByName: vi.fn(async (name: string) => ({
          api_key: "heureka-key",
          api_url: null,
          credentials: null,
          enabled: false,
          name,
        })),
      },
      logger,
    } as never)

    await expect(
      service.fetchHeurekaReviews({ kind: "shop", locale: "sk" })
    ).rejects.toThrow("Heureka SK is disabled in Settings → API Store.")
    expect(fetch).not.toHaveBeenCalled()
  })
})
