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
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
}

moduleIntegrationTestRunner<ApiStoreModuleService>({
  moduleName: API_STORE_MODULE,
  moduleModels: [ApiStore],
  resolve: "./src/modules/api-store",
  testSuite: ({ service }) => {
    afterEach(() => {
      vi.unstubAllGlobals()
      vi.clearAllMocks()
    })

    describe("Zboží token flow", () => {
      it("persists refresh/access API stores, hides internal records, and fetches reviews with stored access token", async () => {
        await service.createApiStoreConfig({
          name: REFRESH_TOKEN_API_STORE_NAME,
          api_url: "https://reviews.example.test/export?access_token=",
          api_key: "refresh-token",
        })
        await service.createApiStoreConfig({
          name: ACCESS_TOKEN_API_STORE_NAME,
          api_key: "access-token",
          access_token_expires_at: new Date(Date.now() + 60 * 60 * 1000),
          is_internal: true,
        })

        const [visibleRecords, visibleCount] =
          await service.listApiStoreConfigs()
        expect(visibleCount).toBe(1)
        expect(visibleRecords.map((record) => record.name)).toEqual([
          REFRESH_TOKEN_API_STORE_NAME,
        ])

        const shopReviewService = new ShopReviewModuleService({
          [API_STORE_MODULE]: service,
          logger,
        } as never)
        const upstreamFetch = vi.fn().mockResolvedValue({
          headers: new Headers({ "content-type": "application/json" }),
          ok: true,
          text: vi.fn().mockResolvedValue('{"reviews":[{"id":"r1"}]}'),
        })
        vi.stubGlobal("fetch", upstreamFetch)

        const response = await shopReviewService.fetchZboziShopReviews()

        expect(response).toEqual(
          expect.objectContaining({
            body: '{"reviews":[{"id":"r1"}]}',
            provider: "zbozi",
          })
        )
        expect(upstreamFetch).toHaveBeenCalledWith(
          new URL(
            "https://reviews.example.test/export?access_token=access-token"
          ),
          expect.objectContaining({
            headers: expect.objectContaining({
              authorization: "Bearer access-token",
            }),
          })
        )
      })

      it("does not call the reviews upstream when access token is expired", async () => {
        await service.createApiStoreConfig({
          name: REFRESH_TOKEN_API_STORE_NAME,
          api_url: "https://reviews.example.test/export",
          api_key: "refresh-token",
        })
        await service.createApiStoreConfig({
          name: ACCESS_TOKEN_API_STORE_NAME,
          api_key: "expired-access-token",
          access_token_expires_at: new Date(Date.now() - 60 * 1000),
          is_internal: true,
        })

        const shopReviewService = new ShopReviewModuleService({
          [API_STORE_MODULE]: service,
          logger,
        } as never)
        const upstreamFetch = vi.fn()
        vi.stubGlobal("fetch", upstreamFetch)

        await expect(shopReviewService.fetchZboziShopReviews()).rejects.toThrow(
          "Zboží access token is missing or expired"
        )
        expect(upstreamFetch).not.toHaveBeenCalled()
      })

      it("refreshes access token from Zboží.api_key only and upserts the internal cache", async () => {
        await service.createApiStoreConfig({
          name: REFRESH_TOKEN_API_STORE_NAME,
          api_url: "https://reviews.example.test/export",
          api_key: "refresh-token",
          credentials: { refresh_token: "ignored-refresh-token" },
        })
        const tokenFetch = vi.fn().mockResolvedValue({
          json: vi.fn().mockResolvedValue({
            access_token: "new-access-token",
            expires_in: 3600,
          }),
          ok: true,
          status: 200,
        })
        vi.stubGlobal("fetch", tokenFetch)

        await refreshZboziAccessTokenStore({
          apiStoreService: service,
          fetchImpl: tokenFetch as never,
          now: new Date("2026-01-01T00:00:00.000Z"),
        })

        expect(tokenFetch).toHaveBeenCalledWith(
          ZBOZI_TOKEN_URL,
          expect.objectContaining({
            headers: expect.objectContaining({
              authorization: "Bearer refresh-token",
            }),
          })
        )
        const internal = await service.retrieveApiStoreSecretsByName(
          ACCESS_TOKEN_API_STORE_NAME
        )
        expect(internal).toEqual(
          expect.objectContaining({
            api_key: "new-access-token",
            is_internal: true,
            access_token_expires_at: new Date("2026-01-01T01:00:00.000Z"),
          })
        )
      })
    })
  },
})
