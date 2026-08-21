import { decodeJwt } from "jose"
import { describe, expect, it } from "vitest"
import { createMarketBoundPasswordResetJwt } from "../generate-market-bound-reset-password-token"

describe("market-bound password-reset token generation", () => {
  it.each([
    ["sk", "sc_sk"],
    ["cz", "sc_cz"],
    ["hu", "sc_hu"],
    ["ro", "sc_ro"],
  ])("signs the exact %s sales channel into the reset JWT", (_market, salesChannelId) => {
    const token = createMarketBoundPasswordResetJwt({
      actorType: "customer",
      entityId: "global-customer@example.com",
      jti: `jti_${salesChannelId}`,
      marketCode: _market as "sk" | "cz" | "hu" | "ro",
      provider: "emailpass",
      salesChannelId,
      secret: "reset-test-secret",
    })

    expect(decodeJwt(token)).toMatchObject({
      actor_type: "customer",
      entity_id: "global-customer@example.com",
      jti: `jti_${salesChannelId}`,
      market_code: _market,
      provider: "emailpass",
      purpose: "reset",
      sales_channel_id: salesChannelId,
    })
  })
})
