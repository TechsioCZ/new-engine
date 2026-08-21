import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { SignJWT } from "jose"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const resolveNotificationMarketContext = vi.hoisted(() => vi.fn())
const completeCustomerPasswordResetRun = vi.hoisted(() => vi.fn())

vi.mock("../../../../../../../utils/notification-market-context", () => ({
  resolveNotificationMarketContext,
}))

vi.mock(
  "../../../../../../../workflows/customer/workflows/complete-customer-password-reset",
  () => ({
    completeCustomerPasswordResetWorkflow: vi.fn(() => ({
      run: completeCustomerPasswordResetRun,
    })),
  })
)

import { POST } from "../route"

const previousJwtSecret = process.env.JWT_SECRET
const customerEmail = "global-customer@example.com"

afterEach(() => {
  if (previousJwtSecret === undefined) {
    Reflect.deleteProperty(process.env, "JWT_SECRET")
  } else {
    process.env.JWT_SECRET = previousJwtSecret
  }
})

beforeEach(() => {
  resolveNotificationMarketContext.mockReset().mockResolvedValue({
    market_code: "sk",
    sales_channel_id: "sc_sk",
  })
  completeCustomerPasswordResetRun.mockReset().mockResolvedValue({
    result: { auth_identity_id: "auth_identity_1" },
  })
})

const signResetToken = (salesChannelId: string) =>
  new SignJWT({
    actor_type: "customer",
    entity_id: customerEmail,
    provider: "emailpass",
    purpose: "reset",
    market_code: salesChannelId.slice(-2),
    sales_channel_id: salesChannelId,
  })
    .setJti("jti_reset_1")
    .setExpirationTime("15m")
    .setProtectedHeader({ alg: "HS256" })
    .sign(new TextEncoder().encode(process.env.JWT_SECRET))

const buildRoute = (token: string, marketSalesChannelIds = ["sc_sk"]) => {
  const graph = vi.fn().mockResolvedValue({
    data: [
      {
        revoked_at: null,
        sales_channels_link: marketSalesChannelIds.map((id) => ({
          sales_channel_id: id,
        })),
      },
    ],
  })
  const request = {
    body: { password: "new-secure-password" },
    headers: {
      authorization: `Bearer ${token}`,
      "x-publishable-api-key": "pk_sk",
    },
    scope: {
      resolve: vi.fn((key: string) => {
        if (key === ContainerRegistrationKeys.QUERY) {
          return { graph }
        }
        throw new Error(`Unexpected dependency: ${key}`)
      }),
    },
  }
  const response = {
    json: vi.fn(),
    setHeader: vi.fn(),
    status: vi.fn(),
  }
  response.status.mockReturnValue(response)
  return {
    graph,
    request: request as never,
    response,
  }
}

describe("POST /auth/customer/emailpass/reset-password/complete", () => {
  it("consumes and updates a token only in its exact issuing market", async () => {
    process.env.JWT_SECRET = "reset-test-secret"
    const token = await signResetToken("sc_sk")
    const route = buildRoute(token)

    await POST(route.request, route.response as never)

    expect(completeCustomerPasswordResetRun).toHaveBeenCalledWith({
      input: {
        entity_id: customerEmail,
        jti: "jti_reset_1",
        password: "new-secure-password",
      },
    })
    expect(route.response.status).toHaveBeenCalledWith(200)
    expect(route.response.json).toHaveBeenCalledWith({ success: true })
  })

  it("preserves a provider rejection from the retry-safe workflow", async () => {
    process.env.JWT_SECRET = "reset-test-secret"
    const token = await signResetToken("sc_sk")
    const route = buildRoute(token)
    completeCustomerPasswordResetRun.mockRejectedValue(
      new MedusaError(MedusaError.Types.UNAUTHORIZED, "Invalid password")
    )

    await expect(
      POST(route.request, route.response as never)
    ).rejects.toMatchObject({
      message: "Invalid password",
      type: MedusaError.Types.UNAUTHORIZED,
    })

    expect(completeCustomerPasswordResetRun).toHaveBeenCalledOnce()
    expect(route.response.status).not.toHaveBeenCalled()
  })

  it("rejects cross-market replay without consuming the token", async () => {
    process.env.JWT_SECRET = "reset-test-secret"
    const token = await signResetToken("sc_cz")
    const route = buildRoute(token, ["sc_sk"])

    await expect(
      POST(route.request, route.response as never)
    ).rejects.toMatchObject({
      type: "not_found",
    })

    expect(completeCustomerPasswordResetRun).not.toHaveBeenCalled()
  })

  it("rejects an ambiguous publishable-key context without consuming the token", async () => {
    process.env.JWT_SECRET = "reset-test-secret"
    const token = await signResetToken("sc_sk")
    const route = buildRoute(token, ["sc_sk", "sc_cz"])

    await expect(
      POST(route.request, route.response as never)
    ).rejects.toMatchObject({
      type: "not_found",
    })

    expect(completeCustomerPasswordResetRun).not.toHaveBeenCalled()
  })

  it("collapses a consumed or unknown token to not found", async () => {
    process.env.JWT_SECRET = "reset-test-secret"
    const token = await signResetToken("sc_sk")
    const route = buildRoute(token)
    completeCustomerPasswordResetRun.mockRejectedValue(
      new MedusaError(MedusaError.Types.NOT_FOUND, "Resource was not found.")
    )

    await expect(
      POST(route.request, route.response as never)
    ).rejects.toMatchObject({
      type: "not_found",
    })

    expect(completeCustomerPasswordResetRun).toHaveBeenCalledOnce()
  })
})
