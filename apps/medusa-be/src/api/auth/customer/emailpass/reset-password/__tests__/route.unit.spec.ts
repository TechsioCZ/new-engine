import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { beforeEach, describe, expect, it, vi } from "vitest"

const runWorkflow = vi.hoisted(() => vi.fn())
const resolveNotificationMarketContext = vi.hoisted(() => vi.fn())

vi.mock(
  "../../../../../../workflows/generate-market-bound-reset-password-token",
  () => ({
    generateMarketBoundResetPasswordTokenWorkflow: vi.fn(() => ({
      run: runWorkflow,
    })),
  })
)

vi.mock("../../../../../../utils/notification-market-context", () => ({
  resolveNotificationMarketContext,
}))

import { POST } from "../route"

const buildRoute = (salesChannelIds = ["sc_cz"]) => {
  const graph = vi.fn().mockResolvedValue({
    data: [
      {
        revoked_at: null,
        sales_channels_link: salesChannelIds.map((id) => ({
          sales_channel_id: id,
        })),
      },
    ],
  })
  const request = {
    headers: { "x-publishable-api-key": "pk_cz" },
    scope: {
      resolve: vi.fn((key: string) => {
        if (key === ContainerRegistrationKeys.QUERY) {
          return { graph }
        }
        if (key === ContainerRegistrationKeys.CONFIG_MODULE) {
          return {
            projectConfig: {
              http: {
                jwtOptions: { algorithm: "HS256" },
                jwtSecret: "reset-test-secret",
              },
            },
          }
        }
        throw new Error(`Unexpected dependency: ${key}`)
      }),
    },
    validatedBody: {
      identifier: "global-customer@example.com",
      metadata: {
        source: "forgot-password",
        storefront_market_code: "ro",
        storefront_sales_channel_id: "sc_ro",
      },
    },
  }
  const response = { sendStatus: vi.fn(), setHeader: vi.fn() }
  return { graph, request: request as never, response }
}

beforeEach(() => {
  runWorkflow.mockReset().mockResolvedValue({ result: undefined })
  resolveNotificationMarketContext.mockReset().mockResolvedValue({
    market_code: "cz",
    sales_channel_id: "sc_cz",
  })
})

describe("POST /auth/customer/emailpass/reset-password", () => {
  it("issues a token bound to the exact publishable-key sales channel", async () => {
    const route = buildRoute()

    await POST(route.request, route.response as never)

    expect(runWorkflow).toHaveBeenCalledWith({
      input: {
        actorType: "customer",
        entityId: "global-customer@example.com",
        jwtOptions: { algorithm: "HS256" },
        marketCode: "cz",
        metadata: {
          source: "forgot-password",
          storefront_market_code: "cz",
          storefront_sales_channel_id: "sc_cz",
        },
        provider: "emailpass",
        salesChannelId: "sc_cz",
        secret: "reset-test-secret",
      },
      throwOnError: false,
    })
    expect(route.response.sendStatus).toHaveBeenCalledWith(201)
  })

  it("rejects an ambiguous key without issuing a token", async () => {
    const route = buildRoute(["sc_cz", "sc_sk"])

    await expect(
      POST(route.request, route.response as never)
    ).rejects.toMatchObject({ type: "not_found" })

    expect(runWorkflow).not.toHaveBeenCalled()
  })
})
