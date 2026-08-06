import { asValue } from "@medusajs/framework/awilix"
import type { Logger } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  createMedusaContainer,
  MedusaError,
} from "@medusajs/framework/utils"
import { afterEach, describe, expect, it, vi } from "vitest"

import { API_STORE_MODULE } from "../../api-store"
import ShopReviewModuleService from "../service"
import {
  ACCESS_TOKEN_API_STORE_NAME,
  REFRESH_TOKEN_API_STORE_NAME,
} from "../zbozi-token"

const logger = {
  error: vi.fn<Logger["error"]>(),
  info: vi.fn<Logger["info"]>(),
  warn: vi.fn<Logger["warn"]>(),
}

type FetchReviews = (input: URL, init?: RequestInit) => Promise<Response>
type RetrieveApiStoreSecrets = (name: string) => Promise<unknown>
interface UpsertApiStoreInput {
  access_token_expires_at?: unknown
}
type UpsertApiStoreConfig = (input: UpsertApiStoreInput) => Promise<unknown>

const createService = (apiStoreService: Record<string, unknown>) => {
  const container = createMedusaContainer()
  container.register({
    [API_STORE_MODULE]: asValue(apiStoreService),
    [ContainerRegistrationKeys.LOGGER]: asValue(logger),
  })

  return new ShopReviewModuleService(container)
}

describe("ShopReviewModuleService Zboží token handling", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it("uses stored access token from the internal API Store when fetching reviews", async () => {
    let capturedInit: RequestInit | undefined
    let capturedRequest: URL | undefined
    const fetch = vi.fn<FetchReviews>(async (request, init) => {
      capturedRequest = request
      capturedInit = init
      return await Promise.resolve(
        new Response('{"reviews":[]}', {
          headers: { "content-type": "application/json" },
          status: 200,
        }),
      )
    })
    vi.stubGlobal("fetch", fetch)

    const service = createService({
      retrieveApiStoreSecretsByName: vi.fn<RetrieveApiStoreSecrets>(
        async (name) => {
          if (name === REFRESH_TOKEN_API_STORE_NAME) {
            return await Promise.resolve({
              api_key: "refresh-token",
              api_url: "https://reviews.example.test?access_token=",
              credentials: null,
              name,
            })
          }
          if (name === ACCESS_TOKEN_API_STORE_NAME) {
            return await Promise.resolve({
              access_token_expires_at: "2099-01-01T00:00:00.000Z",
              api_key: "access-token",
              api_url: null,
              credentials: null,
              name,
            })
          }
          return await Promise.resolve(null)
        },
      ),
    })

    const result = await service.fetchZboziShopReviews()

    expect(result.body).toBe('{"reviews":[]}')
    expect(fetch).toHaveBeenCalledOnce()
    expect(capturedRequest).toStrictEqual(
      new URL("https://reviews.example.test?access_token=access-token"),
    )
    expect(new Headers(capturedInit?.headers).get("authorization")).toBe(
      "Bearer access-token",
    )
  })

  it("does not refresh inline when the stored access token is missing", async () => {
    const fetch = vi.fn<FetchReviews>()
    vi.stubGlobal("fetch", fetch)

    const service = createService({
      retrieveApiStoreSecretsByName: vi.fn<RetrieveApiStoreSecrets>(
        async (name) => {
          if (name === REFRESH_TOKEN_API_STORE_NAME) {
            return await Promise.resolve({
              api_key: "refresh-token",
              api_url: "https://reviews.example.test",
              credentials: null,
              name,
            })
          }
          return await Promise.resolve(null)
        },
      ),
    })

    await expect(service.fetchZboziShopReviews()).rejects.toThrow(
      "Zboží access token is missing or expired",
    )
    expect(fetch).not.toHaveBeenCalled()
  })

  it("refreshes access token and stores it in internal API Store api_key with expiry", async () => {
    const fetch = vi
      .fn<FetchReviews>()
      .mockResolvedValue(
        Response.json(
          { access_token: "new-access-token", expires_in: 3600 },
          { status: 200 },
        ),
      )
    vi.stubGlobal("fetch", fetch)

    const upsertApiStoreConfigByName = vi.fn<UpsertApiStoreConfig>()
    const service = createService({
      retrieveApiStoreSecretsByName: vi.fn<RetrieveApiStoreSecrets>(
        async (name) => {
          if (name === REFRESH_TOKEN_API_STORE_NAME) {
            return await Promise.resolve({
              api_key: "refresh-token",
              api_url: "https://reviews.example.test",
              credentials: null,
              name,
            })
          }
          return await Promise.resolve(null)
        },
      ),
      upsertApiStoreConfigByName,
    })

    const before = Date.now()
    await service.refreshZboziAccessToken()
    const after = Date.now()

    expect(upsertApiStoreConfigByName).toHaveBeenCalledWith(
      expect.objectContaining({
        api_key: "new-access-token",
        is_internal: true,
        name: ACCESS_TOKEN_API_STORE_NAME,
      }),
    )
    const [upsertInput] = upsertApiStoreConfigByName.mock.calls[0] ?? []
    const expiresAt = upsertInput?.access_token_expires_at
    expect(expiresAt).toBeInstanceOf(Date)
    if (!(expiresAt instanceof Date)) {
      throw new TypeError("Expected access token expiry to be a Date")
    }
    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + 3600 * 1000)
    expect(expiresAt.getTime()).toBeLessThanOrEqual(after + 3600 * 1000)
  })

  it("requires refresh token in Zboží api_key only", async () => {
    const service = createService({
      retrieveApiStoreSecretsByName: vi.fn<RetrieveApiStoreSecrets>(
        async (name) =>
          await Promise.resolve({
            api_key: null,
            api_url: "https://reviews.example.test",
            credentials: { refresh_token: "ignored" },
            name,
          }),
      ),
    })

    await expect(service.refreshZboziAccessToken()).rejects.toThrow(MedusaError)
    await expect(service.refreshZboziAccessToken()).rejects.toThrow(
      'API store config "Zboží" must contain api_key',
    )
  })
})
