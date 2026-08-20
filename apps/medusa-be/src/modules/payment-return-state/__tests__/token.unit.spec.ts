import { describe, expect, it } from "vitest"
import {
  createPaymentReturnState,
  hashPaymentReturnState,
  PAYMENT_RETURN_STATE_TTL_MS,
  verifyPaymentReturnState,
} from "../token"

const CLAIMS = {
  cart_id: "cart_CaseSensitive",
  provider_id: "pp_paykit_gopay",
  sales_channel_id: "sc_cz",
}
const SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/

describe("payment return state", () => {
  it("round-trips exact authenticated claims without exposing identifiers", () => {
    const state = createPaymentReturnState(CLAIMS, "payment-state-secret", 1000)

    expect(state).not.toContain(CLAIMS.cart_id)
    expect(state).not.toContain(CLAIMS.provider_id)
    expect(state.split(".")).toHaveLength(3)
    expect(
      verifyPaymentReturnState(state, "payment-state-secret", 1000)
    ).toMatchObject(CLAIMS)
    expect(hashPaymentReturnState(state)).toMatch(SHA256_HEX_PATTERN)
  })

  it("rejects tampering, wrong secrets, noncanonical input, and expiry", () => {
    const state = createPaymentReturnState(CLAIMS, "payment-state-secret", 1000)
    const tampered = `${state.slice(0, -1)}${state.endsWith("A") ? "B" : "A"}`

    expect(
      verifyPaymentReturnState(tampered, "payment-state-secret", 1000)
    ).toBeUndefined()
    expect(
      verifyPaymentReturnState(state, "wrong-secret", 1000)
    ).toBeUndefined()
    expect(
      verifyPaymentReturnState(` ${state}`, "payment-state-secret", 1000)
    ).toBeUndefined()
    expect(
      verifyPaymentReturnState(
        state,
        "payment-state-secret",
        1000 + PAYMENT_RETURN_STATE_TTL_MS
      )
    ).toBeUndefined()
  })
})
