import { describe, expect, it, vi } from "vitest"
import {
  CHECKOUT_CONSENT_POLICY_VERSION,
  CHECKOUT_CONSENT_VERSION,
  createDeniedCheckoutConsent,
} from "./checkout-consent"
import {
  fetchCheckoutConsent,
  persistCheckoutConsent,
} from "./checkout-consent-client"

describe("checkout consent client", () => {
  it("uses only the fixed same-origin no-store endpoint", async () => {
    const snapshot = createDeniedCheckoutConsent("ro")
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(snapshot))

    await expect(fetchCheckoutConsent("ro", fetcher)).resolves.toEqual(snapshot)
    expect(fetcher).toHaveBeenCalledWith(
      "/api/storefront/checkout/preferences",
      expect.objectContaining({
        cache: "no-store",
        credentials: "same-origin",
        method: "GET",
      })
    )
  })

  it("sends only explicit purpose booleans and policy identifiers", async () => {
    const snapshot = {
      ...createDeniedCheckoutConsent("sk"),
      purposes: { heureka: true, marketing: false },
    }
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(snapshot))

    await expect(
      persistCheckoutConsent("sk", { heureka: true, marketing: false }, fetcher)
    ).resolves.toEqual(snapshot)

    const [, init] = fetcher.mock.calls[0] ?? []
    expect(JSON.parse(String(init?.body))).toEqual({
      policyVersion: CHECKOUT_CONSENT_POLICY_VERSION,
      purposes: { heureka: true, marketing: false },
      version: CHECKOUT_CONSENT_VERSION,
    })
  })

  it("fails closed on invalid or mismatched responses", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ market: "sk" }))

    await expect(fetchCheckoutConsent("ro", fetcher)).resolves.toMatchObject({
      market: "ro",
      purposes: { heureka: false, marketing: false },
    })
    await expect(
      persistCheckoutConsent("ro", { heureka: false, marketing: true }, fetcher)
    ).rejects.toThrow("could not be persisted")
  })
})
