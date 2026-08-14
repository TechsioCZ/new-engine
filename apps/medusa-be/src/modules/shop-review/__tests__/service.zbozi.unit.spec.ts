import { MedusaError } from "@medusajs/framework/utils"
import { afterEach, describe, expect, it, vi } from "vitest"
import { API_STORE_MODULE } from "../../api-store"
import ShopReviewModuleService from "../service"
import {
  ACCESS_TOKEN_API_STORE_NAME,
  REFRESH_TOKEN_API_STORE_NAME,
} from "../zbozi-token"

const logger = {
  warn: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
}

const createService = (apiStoreService: Record<string, unknown>) =>
  new ShopReviewModuleService({
    [API_STORE_MODULE]: apiStoreService,
    logger,
  } as never)

describe("ShopReviewModuleService Zboží token handling", () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it("loads the official shop rating and 24-month review count", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-14T08:42:13.000Z"))

    const requestTimes: number[] = []
    const fetch = vi.fn(async (input: string | URL) => {
      requestTimes.push(Date.now())
      const url = new URL(input)

      if (url.pathname === "/v1/nakupy/shops/") {
        return {
          json: vi.fn().mockResolvedValue({
            items: [{ premiseId: 126_770, rating: 97 }],
          }),
          ok: true,
          status: 200,
        }
      }

      return {
        json: vi.fn().mockResolvedValue({
          items: [],
          meta: {
            count: 692,
            fromDatetime: "2024-08-14T08:42:13.000Z",
            toDatetime: "2026-08-14T08:42:13.000Z",
          },
        }),
        ok: true,
        status: 200,
      }
    })
    vi.stubGlobal("fetch", fetch)

    const service = createService({
      retrieveApiStoreSecretsByName: vi.fn(async (name: string) => {
        if (name === REFRESH_TOKEN_API_STORE_NAME) {
          return {
            api_key: "refresh-token",
            api_url: "https://api.sklik.cz/v1/nakupy/reviews/?premiseId=126770",
            credentials: null,
            name,
          }
        }
        if (name === ACCESS_TOKEN_API_STORE_NAME) {
          return {
            access_token_expires_at: "2099-01-01T00:00:00.000Z",
            api_key: "access-token",
            api_url: null,
            credentials: null,
            name,
          }
        }
        return null
      }),
    })

    const summaryPromise = service.fetchZboziShopTrustSummary()
    await vi.runAllTimersAsync()

    await expect(summaryPromise).resolves.toEqual({
      provider: "zbozi",
      review_count: 692,
      score: 97,
      updated_at: "2026-08-14T08:42:13.000Z",
    })

    expect(fetch).toHaveBeenCalledTimes(2)
    const requestedUrls = fetch.mock.calls.map(([input]) => new URL(input))
    const shopsUrl = requestedUrls.find(
      (url) => url.pathname === "/v1/nakupy/shops/"
    )
    const reviewsUrl = requestedUrls.find(
      (url) => url.pathname === "/v1/nakupy/reviews/"
    )

    expect(shopsUrl?.searchParams.getAll("id")).toEqual(["126770"])
    expect(shopsUrl?.searchParams.get("premiseId")).toBe("126770")
    expect(reviewsUrl?.searchParams.get("fromDatetime")).toBe(
      "2024-08-14T08:42:13.000Z"
    )
    expect(reviewsUrl?.searchParams.get("toDatetime")).toBe(
      "2026-08-14T08:42:13.000Z"
    )
    expect(reviewsUrl?.searchParams.get("limit")).toBe("1")
    expect(reviewsUrl?.searchParams.get("offset")).toBe("0")
    expect(requestTimes).toEqual([
      Date.parse("2026-08-14T08:42:13.000Z"),
      Date.parse("2026-08-14T08:42:14.000Z"),
    ])
  })

  it("reports invalid JSON separately from HTTP failures", async () => {
    const fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockRejectedValue(new SyntaxError("Invalid JSON")),
      ok: true,
      status: 200,
    })
    vi.stubGlobal("fetch", fetch)
    const service = createService({
      retrieveApiStoreSecretsByName: vi.fn(async (name: string) => {
        if (name === REFRESH_TOKEN_API_STORE_NAME) {
          return {
            api_key: "refresh-token",
            api_url: "https://api.sklik.cz/v1/nakupy/reviews/?premiseId=126770",
            credentials: null,
            name,
          }
        }
        if (name === ACCESS_TOKEN_API_STORE_NAME) {
          return {
            access_token_expires_at: "2099-01-01T00:00:00.000Z",
            api_key: "access-token",
            api_url: null,
            credentials: null,
            name,
          }
        }
        return null
      }),
    })

    await expect(service.fetchZboziShopTrustSummary()).rejects.toThrow(
      "Zboží shop rating response returned invalid JSON"
    )
    expect(logger.warn).toHaveBeenCalledWith(
      "Zboží shop rating response returned invalid JSON"
    )
  })

  it("uses stored access token from the internal API Store when fetching reviews", async () => {
    const fetch = vi.fn().mockResolvedValue({
      headers: new Headers({ "content-type": "application/json" }),
      ok: true,
      text: vi.fn().mockResolvedValue('{"reviews":[]}'),
    })
    vi.stubGlobal("fetch", fetch)

    const service = createService({
      retrieveApiStoreSecretsByName: vi.fn(async (name: string) => {
        if (name === REFRESH_TOKEN_API_STORE_NAME) {
          return {
            api_key: "refresh-token",
            api_url: "https://reviews.example.test?access_token=",
            credentials: null,
            name,
          }
        }
        if (name === ACCESS_TOKEN_API_STORE_NAME) {
          return {
            access_token_expires_at: "2099-01-01T00:00:00.000Z",
            api_key: "access-token",
            api_url: null,
            credentials: null,
            name,
          }
        }
        return null
      }),
    })

    const result = await service.fetchZboziShopReviews()

    expect(result.body).toBe('{"reviews":[]}')
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith(
      new URL("https://reviews.example.test?access_token=access-token"),
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: "Bearer access-token",
        }),
      })
    )
  })

  it("does not refresh inline when the stored access token is missing", async () => {
    const fetch = vi.fn()
    vi.stubGlobal("fetch", fetch)

    const service = createService({
      retrieveApiStoreSecretsByName: vi.fn(async (name: string) => {
        if (name === REFRESH_TOKEN_API_STORE_NAME) {
          return {
            api_key: "refresh-token",
            api_url: "https://reviews.example.test",
            credentials: null,
            name,
          }
        }
        return null
      }),
    })

    await expect(service.fetchZboziShopReviews()).rejects.toThrow(
      "Zboží access token is missing or expired"
    )
    expect(fetch).not.toHaveBeenCalled()
  })

  it("refreshes access token and stores it in internal API Store api_key with expiry", async () => {
    const fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        access_token: "new-access-token",
        expires_in: 3600,
      }),
      ok: true,
      status: 200,
    })
    vi.stubGlobal("fetch", fetch)

    const upsertApiStoreConfigByName = vi.fn()
    const service = createService({
      retrieveApiStoreSecretsByName: vi.fn(async (name: string) => {
        if (name === REFRESH_TOKEN_API_STORE_NAME) {
          return {
            api_key: "refresh-token",
            api_url: "https://reviews.example.test",
            credentials: null,
            name,
          }
        }
        return null
      }),
      upsertApiStoreConfigByName,
    })

    const before = Date.now()
    await service.refreshZboziAccessToken()
    const after = Date.now()

    expect(upsertApiStoreConfigByName).toHaveBeenCalledWith(
      expect.objectContaining({
        name: ACCESS_TOKEN_API_STORE_NAME,
        api_key: "new-access-token",
        is_internal: true,
      })
    )
    const expiresAt = upsertApiStoreConfigByName.mock.calls[0]?.[0]
      ?.access_token_expires_at as Date
    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + 3600 * 1000)
    expect(expiresAt.getTime()).toBeLessThanOrEqual(after + 3600 * 1000)
  })

  it("requires refresh token in Zboží api_key only", async () => {
    const service = createService({
      retrieveApiStoreSecretsByName: vi.fn(async (name: string) => ({
        api_key: null,
        api_url: "https://reviews.example.test",
        credentials: { refresh_token: "ignored" },
        name,
      })),
    })

    await expect(service.refreshZboziAccessToken()).rejects.toThrow(MedusaError)
    await expect(service.refreshZboziAccessToken()).rejects.toThrow(
      'API store config "Zboží" must contain api_key'
    )
  })
})
