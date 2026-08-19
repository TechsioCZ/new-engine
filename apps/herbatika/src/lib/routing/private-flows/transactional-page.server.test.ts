import { describe, expect, it } from "vitest"
import {
  CART_ID_HINT_COOKIE_NAME,
  CART_SESSION_COOKIE_NAME,
  PAYMENT_RESULT_COOKIE_NAME,
  readCartSessionId,
  readCartSessionToken,
  readCustomerToken,
  readPaymentResultToken,
} from "./request-cookies"

describe("transactional request cookies", () => {
  it("reads exact URL-encoded customer and cart values", () => {
    const cookies = `herbatika_auth_session_token=JWT.Exact%2B1; ${CART_ID_HINT_COOKIE_NAME}=cart_CASE; ${CART_SESSION_COOKIE_NAME}=Signed.Token`
    expect(readCustomerToken(cookies)).toBe("JWT.Exact+1")
    expect(readCartSessionId(cookies)).toBe("cart_CASE")
    expect(readCartSessionToken(cookies)).toBe("Signed.Token")
  })

  it("rejects duplicate or malformed cart cookies", () => {
    expect(
      readCartSessionId(
        `${CART_ID_HINT_COOKIE_NAME}=cart_1; ${CART_ID_HINT_COOKIE_NAME}=cart_2`
      )
    ).toBeNull()
    expect(readCartSessionId(`${CART_ID_HINT_COOKIE_NAME}=%E0%A4%A`)).toBeNull()
  })

  it("rejects duplicate or malformed signed cart-session cookies", () => {
    expect(
      readCartSessionToken(
        `${CART_SESSION_COOKIE_NAME}=session_1; ${CART_SESSION_COOKIE_NAME}=session_2`
      )
    ).toBeNull()
    expect(
      readCartSessionToken(`${CART_SESSION_COOKIE_NAME}=%E0%A4%A`)
    ).toBeNull()
  })

  it("reads exactly one opaque payment-result cookie", () => {
    expect(
      readPaymentResultToken(`${PAYMENT_RESULT_COOKIE_NAME}=Result.Token`)
    ).toBe("Result.Token")
    expect(
      readPaymentResultToken(
        `${PAYMENT_RESULT_COOKIE_NAME}=one; ${PAYMENT_RESULT_COOKIE_NAME}=two`
      )
    ).toBeNull()
  })
})
