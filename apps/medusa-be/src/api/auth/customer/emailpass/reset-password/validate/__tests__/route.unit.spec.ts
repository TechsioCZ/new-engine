import { createHash } from "node:crypto"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { SignJWT } from "jose"
import { afterEach, describe, expect, it, vi } from "vitest"
import { POST } from "../route"

const previousJwtSecret = process.env.JWT_SECRET

afterEach(() => {
  if (previousJwtSecret === undefined) {
    Reflect.deleteProperty(process.env, "JWT_SECRET")
  } else {
    process.env.JWT_SECRET = previousJwtSecret
  }
})

describe("POST /auth/customer/emailpass/reset-password/validate", () => {
  it("validates an unconsumed reset JWT without deleting its token row", async () => {
    process.env.JWT_SECRET = "reset-test-secret"
    const token = await new SignJWT({
      actor_type: "customer",
      entity_id: "customer@example.com",
      provider: "emailpass",
      purpose: "reset",
    })
      .setJti("jti_1")
      .setExpirationTime("15m")
      .setProtectedHeader({ alg: "HS256" })
      .sign(new TextEncoder().encode(process.env.JWT_SECRET))
    const graph = vi.fn().mockResolvedValue({
      data: [
        {
          entity_id: "customer@example.com",
          expires_at: new Date(Date.now() + 60_000),
          id: "authprt_1",
          token_hash: createHash("sha256").update("jti_1").digest("hex"),
        },
      ],
    })
    const response = { json: vi.fn(), setHeader: vi.fn() }

    await POST(
      {
        headers: { authorization: `Bearer ${token}` },
        scope: {
          resolve: vi.fn((key: string) => {
            if (key === ContainerRegistrationKeys.QUERY) {
              return { graph }
            }
            throw new Error(`Unexpected dependency: ${key}`)
          }),
        },
      } as never,
      response as never
    )

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
      POST(
        { headers: { authorization: `Bearer ${token}` } } as never,
        { json: vi.fn(), setHeader: vi.fn() } as never
      )
    ).rejects.toMatchObject({ type: "not_found" })
  })

  it("keeps missing server configuration distinguishable from a bad token", async () => {
    Reflect.deleteProperty(process.env, "JWT_SECRET")

    await expect(
      POST(
        { headers: { authorization: "Bearer exact-token" } } as never,
        { json: vi.fn(), setHeader: vi.fn() } as never
      )
    ).rejects.toMatchObject({ type: "invalid_data" })
  })
})
