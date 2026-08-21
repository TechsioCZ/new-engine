import { describe, expect, it } from "vitest"
import {
  CHECKOUT_PRIVACY_VERSION,
  CHECKOUT_PURCHASE_ACCEPTANCE_MAX_AGE_MS,
  CHECKOUT_TERMS_VERSION,
  createCheckoutPurchaseAcceptance,
  parseCheckoutPurchaseAcceptance,
} from "./checkout-purchase-acceptance"

const NOW = new Date("2026-08-21T12:00:00.000Z")
const MARKETS = ["sk", "cz", "hu", "ro"] as const

describe("checkout purchase acceptance", () => {
  it.each(MARKETS)("creates an exact cart-bound snapshot for %s", (market) => {
    const snapshot = createCheckoutPurchaseAcceptance({
      cartId: `cart_${market}`,
      market,
      now: NOW,
    })

    expect(snapshot).toEqual({
      accepted: true,
      acceptedAt: NOW.toISOString(),
      cartId: `cart_${market}`,
      market,
      privacyVersion: CHECKOUT_PRIVACY_VERSION,
      schemaVersion: 1,
      termsVersion: CHECKOUT_TERMS_VERSION,
    })
    expect(
      parseCheckoutPurchaseAcceptance(snapshot, {
        cartId: `cart_${market}`,
        market,
        now: NOW,
      })
    ).toEqual(snapshot)
  })

  it.each(MARKETS)("rejects invalid %s snapshots", (market) => {
    const snapshot = createCheckoutPurchaseAcceptance({
      cartId: `cart_${market}`,
      market,
      now: NOW,
    })
    const options = { cartId: `cart_${market}`, market, now: NOW }
    const otherMarket = MARKETS.find((candidate) => candidate !== market)

    expect(parseCheckoutPurchaseAcceptance(null, options)).toBeNull()
    expect(
      parseCheckoutPurchaseAcceptance(
        {
          ...snapshot,
          acceptedAt: new Date(
            NOW.getTime() - CHECKOUT_PURCHASE_ACCEPTANCE_MAX_AGE_MS - 1
          ).toISOString(),
        },
        options
      )
    ).toBeNull()
    expect(
      parseCheckoutPurchaseAcceptance(
        { ...snapshot, market: otherMarket },
        options
      )
    ).toBeNull()
    expect(
      parseCheckoutPurchaseAcceptance(
        { ...snapshot, cartId: "cart_other" },
        options
      )
    ).toBeNull()
    expect(
      parseCheckoutPurchaseAcceptance(
        { ...snapshot, termsVersion: "old" },
        options
      )
    ).toBeNull()
    expect(
      parseCheckoutPurchaseAcceptance({ ...snapshot, injected: true }, options)
    ).toBeNull()
  })
})
