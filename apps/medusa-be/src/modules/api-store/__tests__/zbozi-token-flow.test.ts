import { moduleIntegrationTestRunner } from "@medusajs/test-utils"
import { afterEach, describe, expect, it, vi } from "vitest"

import ShopReviewModuleService from "../../shop-review/service"
import {
  ACCESS_TOKEN_API_STORE_NAME,
  REFRESH_TOKEN_API_STORE_NAME,
  refreshZboziAccessTokenStore,
  ZBOZI_TOKEN_URL,
} from "../../shop-review/zbozi-token"
import { API_STORE_MODULE } from "../index"
import ApiStore from "../models/api-store"
import type ApiStoreModuleService from "../service"

vi.setConfig({ testTimeout: 60_000 })

const logger = {
  error: vi.fn<(message: string) => void>(),
  info: vi.fn<(message: string) => void>(),
  warn: vi.fn<(message: string) => void>(),
}

moduleIntegrationTestRunner<ApiStoreModuleService>({
  moduleModels: [ApiStore],
  moduleName: API_STORE_MODULE,
  resolve: "./src/modules/api-store",
  testSuite: ({ service }) => {
    afterEach(() => {
      vi.unstubAllGlobals()
      vi.clearAllMocks()
    })

    describe("Zboží token flow", () => {
      it("persists refresh/access API stores, hides internal records, and fetches reviews with stored access token", async () => {
        await service.createApiStoreConfig({
          api_key: "refresh-token",
          api_url: "https://reviews.example.test/export?access_token=",
          name: REFRESH_TOKEN_API_STORE_NAME,
        })
        await service.createApiStoreConfig({
          access_token_expires_at: new Date(Date.now() + 60 * 60 * 1000),
          api_key: "access-token",
          is_internal: true,
          name: ACCESS_TOKEN_API_STORE_NAME,
        })

        const [visibleRecords, visibleCount] =
          await service.listApiStoreConfigs()
        expect(visibleCount).toBe(1)
        expect(visibleRecords.map((record) => record.name)).toStrictEqual([
          REFRESH_TOKEN_API_STORE_NAME,
        ])

        const shopReviewService = new ShopReviewModuleService({
          [API_STORE_MODULE]: service,
          logger,
        })
        const upstreamFetch = vi.fn<typeof fetch>().mockResolvedValue(
          new Response('{"reviews":[{"id":"r1"}]}', {
            headers: { "content-type": "application/json" },
            status: 200,
          }),
        )
        vi.stubGlobal("fetch", upstreamFetch)

        const response = await shopReviewService.fetchZboziShopReviews()

        expect(response).toStrictEqual(
          expect.objectContaining({
            body: '{"reviews":[{"id":"r1"}]}',
            provider: "zbozi",
          }),
        )
        expect(upstreamFetch).toHaveBeenCalledOnce()
        const [requestUrl, requestInit] = upstreamFetch.mock.calls[0] ?? []
        expect({
          authorization: new Headers(requestInit?.headers).get("authorization"),
          requestUrl,
        }).toStrictEqual({
          authorization: "Bearer access-token",
          requestUrl: new URL(
            "https://reviews.example.test/export?access_token=access-token",
          ),
        })
      })

      it("does not call the reviews upstream when access token is expired", async () => {
        await service.createApiStoreConfig({
          api_key: "refresh-token",
          api_url: "https://reviews.example.test/export",
          name: REFRESH_TOKEN_API_STORE_NAME,
        })
        await service.createApiStoreConfig({
          access_token_expires_at: new Date(Date.now() - 60 * 1000),
          api_key: "expired-access-token",
          is_internal: true,
          name: ACCESS_TOKEN_API_STORE_NAME,
        })

        const shopReviewService = new ShopReviewModuleService({
          [API_STORE_MODULE]: service,
          logger,
        })
        const upstreamFetch = vi.fn<typeof fetch>()
        vi.stubGlobal("fetch", upstreamFetch)

        await expect(shopReviewService.fetchZboziShopReviews()).rejects.toThrow(
          "Zboží access token is missing or expired",
        )
        expect(upstreamFetch).not.toHaveBeenCalled()
      })

      it("refreshes access token from Zboží.api_key only and upserts the internal cache", async () => {
        await service.createApiStoreConfig({
          api_key: "refresh-token",
          api_url: "https://reviews.example.test/export",
          credentials: { refresh_token: "ignored-refresh-token" },
          name: REFRESH_TOKEN_API_STORE_NAME,
        })
        const tokenFetch = vi.fn<typeof fetch>().mockResolvedValue(
          Response.json(
            {
              access_token: "new-access-token",
              expires_in: 3600,
            },
            { status: 200 },
          ),
        )
        vi.stubGlobal("fetch", tokenFetch)

        await refreshZboziAccessTokenStore({
          apiStoreService: service,
          fetchImpl: tokenFetch,
          now: new Date("2026-01-01T00:00:00.000Z"),
        })

        expect(tokenFetch).toHaveBeenCalledOnce()
        const [requestUrl, requestInit] = tokenFetch.mock.calls[0] ?? []
        expect(requestUrl).toBe(ZBOZI_TOKEN_URL)
        expect(new Headers(requestInit?.headers).get("authorization")).toBe(
          "Bearer refresh-token",
        )
        const internal = await service.retrieveApiStoreSecretsByName(
          ACCESS_TOKEN_API_STORE_NAME,
        )
        expect(internal).toStrictEqual(
          expect.objectContaining({
            access_token_expires_at: new Date("2026-01-01T01:00:00.000Z"),
            api_key: "new-access-token",
            is_internal: true,
          }),
        )
      })
    })
  },
})
