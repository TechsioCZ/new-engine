import { describe, expect, it } from "vitest"
import {
  CART_SESSION_COOKIE_NAME,
  createCartSessionToken,
  serializeCartSessionCookie,
  verifyCartSessionToken,
} from "../../../../src/utils/cart-session"

describe("cart-session token", () => {
  const now = Date.parse("2026-08-19T10:00:00.000Z")

  it("round-trips an exact market-bound cart ID", () => {
    const token = createCartSessionToken(
      { cart_id: "cart_CaseSensitive", sales_channel_id: "sc_cz" },
      "test-secret",
      now
    )

    expect(verifyCartSessionToken(token, "test-secret", now)).toMatchObject({
      cart_id: "cart_CaseSensitive",
      sales_channel_id: "sc_cz",
      v: 1,
    })
    expect(verifyCartSessionToken(`${token}x`, "test-secret", now)).toBe(
      undefined
    )
    expect(verifyCartSessionToken(token, "wrong-secret", now)).toBe(undefined)
  })

  it("rejects expiration and emits a signed HttpOnly host cookie", () => {
    const token = createCartSessionToken(
      { cart_id: "cart_1", sales_channel_id: "sc_cz" },
      "test-secret",
      now
    )
    const claims = verifyCartSessionToken(token, "test-secret", now)

    expect(
      verifyCartSessionToken(token, "test-secret", Number(claims?.exp) * 1000)
    ).toBe(undefined)
    expect(serializeCartSessionCookie(token)).toContain(
      `${CART_SESSION_COOKIE_NAME}=${token}`
    )
    expect(serializeCartSessionCookie(token)).toContain("HttpOnly")
    expect(serializeCartSessionCookie(token)).toContain("Secure")
    expect(serializeCartSessionCookie(token)).toContain("SameSite=Lax")
  })
})
