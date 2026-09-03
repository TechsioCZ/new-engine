import { createHash } from "node:crypto"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { SignJWT } from "jose"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const resolveNotificationMarketContext = vi.hoisted(() => vi.fn())

vi.mock("../../../../../../../utils/notification-market-context", () => ({
  resolveNotificationMarketContext,
}))

import { POST } from "../route"

const previousJwtSecret = process.env.JWT_SECRET
const publishableKey = "pk_test_sk"
const salesChannelId = "sc_sk"

const signResetToken = (claims: Record<string, unknown> = {}, jti = "jti_1") =>
  new SignJWT({
    actor_type: "customer",
    entity_id: "customer@example.com",
    provider: "emailpass",
    purpose: "reset",
    market_code: "sk",
    sales_channel_id: salesChannelId,
    ...claims,
  })
    .setJti(jti)
    .setExpirationTime("15m")
    .setProtectedHeader({ alg: "HS256" })
    .sign(new TextEncoder().encode(process.env.JWT_SECRET))

const requestWith = (token: string, graph: ReturnType<typeof vi.fn>) =>
  ({
    headers: {
      authorization: `Bearer ${token}`,
      "x-publishable-api-key": publishableKey,
    },
    scope: {
      resolve: vi.fn((key: string) => {
        if (key === ContainerRegistrationKeys.QUERY) {
          return { graph }
        }
        throw new Error(`Unexpected dependency: ${key}`)
      }),
    },
  }) as never

const apiKeyProjection = (ids: string[] = [salesChannelId]) => ({
  data: [
    {
      revoked_at: null,
      sales_channels_link: ids.map((id) => ({ sales_channel_id: id })),
    },
  ],
})

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
    sales_channel_id: salesChannelId,
  })
})

describe("POST /auth/customer/emailpass/reset-password/validate", () => {
  it("validates an unconsumed reset JWT without deleting its token row", async () => {
    process.env.JWT_SECRET = "reset-test-secret"
    const token = await signResetToken()
    const graph = vi.fn(async ({ entity }: { entity: string }) =>
      entity === "api_key"
        ? apiKeyProjection()
        : {
            data: [
              {
                entity_id: "customer@example.com",
                expires_at: new Date(Date.now() + 60_000),
                id: "authprt_1",
                token_hash: createHash("sha256").update("jti_1").digest("hex"),
              },
            ],
          }
    )
    const response = { json: vi.fn(), setHeader: vi.fn() }

    await POST(requestWith(token, graph), response as never)

    expect(response.json).toHaveBeenCalledWith({ valid: true })
    expect(graph).toHaveBeenCalledWith(
      expect.objectContaining({ entity: "auth_password_reset_token" })
    )
  })

  it("rejects a normal session JWT as not found", async () => {
    process.env.JWT_SECRET = "reset-test-secret"
    const token = await new SignJWT({
      actor_type: "customer",
      entity_id: "customer@example.com",
      provider: "emailpass",
    })
      .setExpirationTime("15m")
      .setProtectedHeader({ alg: "HS256" })
      .sign(new TextEncoder().encode(process.env.JWT_SECRET))

    await expect(
      POST(requestWith(token, vi.fn().mockResolvedValue(apiKeyProjection())), {
        json: vi.fn(),
        setHeader: vi.fn(),
      } as never)
    ).rejects.toMatchObject({ type: "not_found" })
  })

  it("rejects cross-market replay before looking up the reset-token row", async () => {
    process.env.JWT_SECRET = "reset-test-secret"
    const token = await signResetToken({ sales_channel_id: "sc_cz" })
    const graph = vi.fn().mockResolvedValue(apiKeyProjection())

    await expect(
      POST(requestWith(token, graph), {
        json: vi.fn(),
        setHeader: vi.fn(),
      } as never)
    ).rejects.toMatchObject({ type: "not_found" })

    expect(graph).toHaveBeenCalledTimes(1)
    expect(graph).toHaveBeenCalledWith(
      expect.objectContaining({ entity: "api_key" })
    )
  })

  it("rejects an ambiguous publishable-key market before verifying the token", async () => {
    process.env.JWT_SECRET = "reset-test-secret"
    const token = await signResetToken()
    const graph = vi
      .fn()
      .mockResolvedValue(apiKeyProjection(["sc_sk", "sc_cz"]))

    await expect(
      POST(requestWith(token, graph), {
        json: vi.fn(),
        setHeader: vi.fn(),
      } as never)
    ).rejects.toMatchObject({ type: "not_found" })

    expect(graph).toHaveBeenCalledTimes(1)
  })

  it("keeps missing server configuration distinguishable from a bad token", async () => {
    Reflect.deleteProperty(process.env, "JWT_SECRET")

    await expect(
      POST(
        requestWith(
          "exact-token",
          vi.fn().mockResolvedValue(apiKeyProjection())
        ),
        { json: vi.fn(), setHeader: vi.fn() } as never
      )
    ).rejects.toMatchObject({ type: "invalid_data" })
  })
})
