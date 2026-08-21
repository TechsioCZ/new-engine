import { describe, expect, it } from "vitest"
import {
  CHECKOUT_CONSENT_COOKIE_NAME,
  CHECKOUT_CONSENT_POLICY_VERSION,
  CHECKOUT_CONSENT_VERSION,
  createCheckoutConsentSnapshot,
  createDeniedCheckoutConsent,
  parseCheckoutConsentSnapshot,
  readCheckoutConsentCookie,
  readCheckoutConsentFromMetadata,
  serializeCheckoutConsentSnapshot,
} from "./checkout-consent"
import { isOptionalCheckoutProviderAllowed } from "./checkout-consent-provider-gate"

const NOW = new Date("2026-08-21T12:00:00.000Z")

describe("checkout consent", () => {
  it.each([
    "sk",
    "cz",
    "hu",
    "ro",
  ] as const)("defaults every purpose to denied for %s", (market) => {
    expect(createDeniedCheckoutConsent(market, NOW)).toEqual({
      market,
      policyVersion: CHECKOUT_CONSENT_POLICY_VERSION,
      purposes: { heureka: false, marketing: false },
      timestamp: NOW.toISOString(),
      version: CHECKOUT_CONSENT_VERSION,
    })
  })

  it("keeps purpose decisions independent", () => {
    expect(
      createCheckoutConsentSnapshot({
        market: "sk",
        now: NOW,
        purposes: { heureka: false, marketing: true },
      })?.purposes
    ).toEqual({ heureka: false, marketing: true })
    expect(
      createCheckoutConsentSnapshot({
        market: "sk",
        now: NOW,
        purposes: { heureka: true, marketing: false },
      })?.purposes
    ).toEqual({ heureka: true, marketing: false })
  })

  it.each([
    "cz",
    "hu",
    "ro",
  ] as const)("rejects Heureka consent for unapproved market %s", (market) => {
    expect(
      createCheckoutConsentSnapshot({
        market,
        now: NOW,
        purposes: { heureka: true, marketing: false },
      })
    ).toBeNull()
  })

  it("fails closed for policy, market, timestamp, shape, or Heureka mismatch", () => {
    const valid = createDeniedCheckoutConsent("sk", NOW)
    const options = { market: "sk" as const, now: NOW }

    expect(parseCheckoutConsentSnapshot(valid, options)).toEqual(valid)
    expect(
      parseCheckoutConsentSnapshot({ ...valid, policyVersion: "old" }, options)
    ).toBeNull()
    expect(
      parseCheckoutConsentSnapshot({ ...valid, market: "cz" }, options)
    ).toBeNull()
    expect(
      parseCheckoutConsentSnapshot(
        { ...valid, timestamp: "2024-01-01T00:00:00.000Z" },
        options
      )
    ).toBeNull()
    expect(
      parseCheckoutConsentSnapshot(
        { ...valid, timestamp: 1_787_310_000 },
        options
      )
    ).toBeNull()
    expect(
      parseCheckoutConsentSnapshot(
        { ...valid, timestamp: "2026-08-21T12:00:00Z" },
        options
      )
    ).toBeNull()
    expect(
      parseCheckoutConsentSnapshot({ ...valid, unexpected: true }, options)
    ).toBeNull()
    expect(
      parseCheckoutConsentSnapshot(
        { ...valid, purposes: { heureka: true, marketing: false } },
        { market: "ro", now: NOW }
      )
    ).toBeNull()
  })

  it("accepts exactly one encoded cookie and rejects duplicate cookies", () => {
    const snapshot = createDeniedCheckoutConsent("sk", NOW)
    const encoded = encodeURIComponent(
      serializeCheckoutConsentSnapshot(snapshot)
    )

    expect(
      readCheckoutConsentCookie({
        cookieHeader: `other=1; ${CHECKOUT_CONSENT_COOKIE_NAME}=${encoded}`,
        market: "sk",
        now: NOW,
      })
    ).toEqual(snapshot)
    expect(
      readCheckoutConsentCookie({
        cookieHeader: `${CHECKOUT_CONSENT_COOKIE_NAME}=${encoded}; ${CHECKOUT_CONSENT_COOKIE_NAME}=${encoded}`,
        market: "sk",
        now: NOW,
      })
    ).toBeNull()
  })

  it("gates metadata consumers by exact purpose, market, policy, and time", () => {
    const snapshot = createCheckoutConsentSnapshot({
      market: "sk",
      now: NOW,
      purposes: { heureka: true, marketing: false },
    })
    const metadata = { checkout_consent: snapshot }

    expect(readCheckoutConsentFromMetadata(metadata, "sk", NOW)).toEqual(
      snapshot
    )
    expect(
      isOptionalCheckoutProviderAllowed({
        market: "sk",
        now: NOW,
        provider: "heureka",
        snapshot,
      })
    ).toBe(true)
    expect(
      isOptionalCheckoutProviderAllowed({
        market: "sk",
        now: NOW,
        provider: "marketing",
        snapshot,
      })
    ).toBe(false)
    expect(readCheckoutConsentFromMetadata(metadata, "ro", NOW)).toBeNull()
  })
})
