import { describe, expect, it } from "vitest"
import {
  CHECKOUT_PRIVACY_VERSION,
  CHECKOUT_PURCHASE_ACCEPTANCE_MAX_AGE_MS,
  CHECKOUT_TERMS_VERSION,
  checkoutPurchaseAcceptancesMatch,
  resolveCheckoutPurchaseAcceptance,
} from "../../../../src/utils/checkout-purchase-acceptance"

const NOW = new Date("2026-08-21T12:00:00.000Z")
const MARKETS = ["sk", "cz", "hu", "ro"] as const

const snapshot = (market: "sk" | "cz" | "hu" | "ro") => ({
  accepted: true,
  acceptedAt: NOW.toISOString(),
  cartId: `cart_${market}`,
  market,
  privacyVersion: CHECKOUT_PRIVACY_VERSION,
  schemaVersion: 1,
  termsVersion: CHECKOUT_TERMS_VERSION,
})

const resolve = (
  market: "sk" | "cz" | "hu" | "ro",
  acceptance: unknown = snapshot(market)
) =>
  resolveCheckoutPurchaseAcceptance({
    cartId: `cart_${market}`,
    cartMetadata: { checkout_purchase_acceptance: acceptance },
    now: NOW,
    regionMetadata: {
      market_code: market,
      sales_channel_id: `sc_${market}`,
    },
    salesChannelId: `sc_${market}`,
  })

describe("checkout purchase acceptance authority", () => {
  it.each(MARKETS)("accepts the current exact %s snapshot", (market) => {
    expect(resolve(market)).toEqual(snapshot(market))
    expect(Object.isFrozen(resolve(market))).toBe(true)
  })

  it.each(MARKETS)("rejects invalid %s acceptance", (market) => {
    const otherMarket = MARKETS.find((candidate) => candidate !== market)

    expect(resolve(market, null)).toBeNull()
    expect(
      resolve(market, {
        ...snapshot(market),
        acceptedAt: new Date(
          NOW.getTime() - CHECKOUT_PURCHASE_ACCEPTANCE_MAX_AGE_MS - 1
        ).toISOString(),
      })
    ).toBeNull()
    expect(
      resolve(market, { ...snapshot(market), market: otherMarket })
    ).toBeNull()
    expect(
      resolve(market, { ...snapshot(market), cartId: "cart_other" })
    ).toBeNull()
    expect(
      resolve(market, { ...snapshot(market), privacyVersion: "old" })
    ).toBeNull()
    expect(resolve(market, { ...snapshot(market), accepted: false })).toBeNull()
    expect(resolve(market, { ...snapshot(market), injected: true })).toBeNull()
  })

  it("rejects a cart whose trusted region and Sales Channel binding disagree", () => {
    expect(
      resolveCheckoutPurchaseAcceptance({
        cartId: "cart_sk",
        cartMetadata: { checkout_purchase_acceptance: snapshot("sk") },
        now: NOW,
        regionMetadata: { market_code: "sk", sales_channel_id: "sc_ro" },
        salesChannelId: "sc_sk",
      })
    ).toBeNull()
  })

  it("matches only identical workflow and freshly queried snapshots", () => {
    const acceptance = resolve("sk")
    expect(checkoutPurchaseAcceptancesMatch(acceptance, acceptance)).toBe(true)
    expect(
      checkoutPurchaseAcceptancesMatch(acceptance, {
        ...snapshot("sk"),
        acceptedAt: "2026-08-21T12:01:00.000Z",
      })
    ).toBe(false)
    expect(checkoutPurchaseAcceptancesMatch(acceptance, null)).toBe(false)
  })
})
