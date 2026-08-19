import { describe, expect, it } from "vitest"
import {
  createOrderConfirmationToken,
  hashOrderConfirmationToken,
  orderConfirmationTokenMatches,
} from "../token"

const OPAQUE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/
const SHA256_PATTERN = /^[a-f0-9]{64}$/

describe("order-confirmation token", () => {
  it("issues opaque tokens and validates their exact case-sensitive value", () => {
    const token = createOrderConfirmationToken()
    const hash = hashOrderConfirmationToken(token)

    expect(token).toMatch(OPAQUE_TOKEN_PATTERN)
    expect(hash).toMatch(SHA256_PATTERN)
    expect(orderConfirmationTokenMatches(token, hash)).toBe(true)
    expect(orderConfirmationTokenMatches(token.toUpperCase(), hash)).toBe(false)
  })
})
