import { createHash, randomBytes, timingSafeEqual } from "node:crypto"

export const ORDER_CONFIRMATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000

export const createOrderConfirmationToken = () =>
  randomBytes(32).toString("base64url")

export const hashOrderConfirmationToken = (token: string) =>
  createHash("sha256").update(token, "utf8").digest("hex")

export const orderConfirmationTokenMatches = (
  token: string,
  expectedHash: string
) => {
  const actual = Buffer.from(hashOrderConfirmationToken(token), "hex")
  const expected = Buffer.from(expectedHash, "hex")

  return actual.length === expected.length && timingSafeEqual(actual, expected)
}
