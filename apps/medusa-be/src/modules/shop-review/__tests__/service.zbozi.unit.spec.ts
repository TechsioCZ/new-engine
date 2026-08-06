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
    vi.unstubAllGlobals()
    vi.clearAllMocks()
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
