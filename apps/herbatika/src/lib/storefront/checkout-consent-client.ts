import type { MarketCode } from "@/lib/market/market-runtime"
import {
  CHECKOUT_CONSENT_POLICY_VERSION,
  CHECKOUT_CONSENT_VERSION,
  type CheckoutConsentPurposes,
  type CheckoutConsentSnapshot,
  createDeniedCheckoutConsent,
  parseCheckoutConsentSnapshot,
} from "./checkout-consent"

const CHECKOUT_CONSENT_ENDPOINT =
  "/api/storefront/checkout/preferences" as const

type ConsentFetch = typeof fetch

const parseConsentResponse = async (
  response: Response,
  market: MarketCode
): Promise<CheckoutConsentSnapshot | null> => {
  if (!response.ok) {
    return null
  }

  try {
    return parseCheckoutConsentSnapshot(await response.json(), { market })
  } catch {
    return null
  }
}

export const fetchCheckoutConsent = async (
  market: MarketCode,
  fetcher: ConsentFetch = fetch
) => {
  const response = await fetcher(CHECKOUT_CONSENT_ENDPOINT, {
    cache: "no-store",
    credentials: "same-origin",
    headers: { accept: "application/json" },
    method: "GET",
  })

  return (
    (await parseConsentResponse(response, market)) ??
    createDeniedCheckoutConsent(market)
  )
}

export const persistCheckoutConsent = async (
  market: MarketCode,
  purposes: CheckoutConsentPurposes,
  fetcher: ConsentFetch = fetch
) => {
  const response = await fetcher(CHECKOUT_CONSENT_ENDPOINT, {
    body: JSON.stringify({
      policyVersion: CHECKOUT_CONSENT_POLICY_VERSION,
      purposes,
      version: CHECKOUT_CONSENT_VERSION,
    }),
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    method: "PUT",
  })
  const consent = await parseConsentResponse(response, market)

  if (!consent) {
    throw new Error("Checkout consent could not be persisted.")
  }

  return consent
}
