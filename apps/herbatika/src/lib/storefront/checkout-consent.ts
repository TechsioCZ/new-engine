import type { MarketCode } from "@/lib/market/market-runtime"
import { isReviewTrustProviderSupported } from "./review-market-policy"

export const CHECKOUT_CONSENT_COOKIE_NAME =
  "__Host-herbatika-checkout-consent" as const
export const CHECKOUT_CONSENT_VERSION = 1 as const
export const CHECKOUT_CONSENT_POLICY_VERSION = "2026-08-21" as const
export const CHECKOUT_CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180

export type CheckoutConsentPurposes = Readonly<{
  heureka: boolean
  marketing: boolean
}>

export type CheckoutConsentSnapshot = Readonly<{
  market: MarketCode
  policyVersion: typeof CHECKOUT_CONSENT_POLICY_VERSION
  purposes: CheckoutConsentPurposes
  timestamp: string
  version: typeof CHECKOUT_CONSENT_VERSION
}>

const SNAPSHOT_KEYS = Object.freeze([
  "market",
  "policyVersion",
  "purposes",
  "timestamp",
  "version",
] as const)
const PURPOSE_KEYS = Object.freeze(["heureka", "marketing"] as const)
const FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1000

const isExactRecord = <TKey extends string>(
  value: unknown,
  expectedKeys: readonly TKey[]
): value is Record<TKey, unknown> => {
  if (!(value && typeof value === "object") || Array.isArray(value)) {
    return false
  }

  const keys = Object.keys(value)
  const expected = new Set<string>(expectedKeys)
  return (
    keys.length === expectedKeys.length &&
    keys.every((key) => expected.has(key))
  )
}

const isMarketCode = (value: unknown): value is MarketCode =>
  value === "sk" || value === "cz" || value === "hu" || value === "ro"

const isValidConsentTimestamp = (
  value: unknown,
  now: Date
): value is string => {
  if (typeof value !== "string") {
    return false
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    return false
  }

  const ageMs = now.getTime() - parsed.getTime()
  return (
    ageMs >= -FUTURE_CLOCK_SKEW_MS &&
    ageMs <= CHECKOUT_CONSENT_MAX_AGE_SECONDS * 1000
  )
}

export const createDeniedCheckoutConsent = (
  market: MarketCode,
  now = new Date()
): CheckoutConsentSnapshot => ({
  market,
  policyVersion: CHECKOUT_CONSENT_POLICY_VERSION,
  purposes: {
    heureka: false,
    marketing: false,
  },
  timestamp: now.toISOString(),
  version: CHECKOUT_CONSENT_VERSION,
})

export const createCheckoutConsentSnapshot = ({
  market,
  now = new Date(),
  purposes,
}: {
  market: MarketCode
  now?: Date
  purposes: CheckoutConsentPurposes
}): CheckoutConsentSnapshot | null => {
  if (purposes.heureka && !isReviewTrustProviderSupported(market, "heureka")) {
    return null
  }

  return {
    market,
    policyVersion: CHECKOUT_CONSENT_POLICY_VERSION,
    purposes: {
      heureka: purposes.heureka,
      marketing: purposes.marketing,
    },
    timestamp: now.toISOString(),
    version: CHECKOUT_CONSENT_VERSION,
  }
}

export const parseCheckoutConsentSnapshot = (
  value: unknown,
  options: {
    market: MarketCode
    now?: Date
  }
): CheckoutConsentSnapshot | null => {
  if (!isExactRecord(value, SNAPSHOT_KEYS)) {
    return null
  }

  if (
    value.version !== CHECKOUT_CONSENT_VERSION ||
    value.policyVersion !== CHECKOUT_CONSENT_POLICY_VERSION ||
    value.market !== options.market ||
    !isMarketCode(value.market) ||
    !isValidConsentTimestamp(value.timestamp, options.now ?? new Date()) ||
    !isExactRecord(value.purposes, PURPOSE_KEYS) ||
    typeof value.purposes.marketing !== "boolean" ||
    typeof value.purposes.heureka !== "boolean"
  ) {
    return null
  }

  return createCheckoutConsentSnapshot({
    market: value.market,
    now: new Date(value.timestamp),
    purposes: {
      heureka: value.purposes.heureka,
      marketing: value.purposes.marketing,
    },
  })
}

export const serializeCheckoutConsentSnapshot = (
  snapshot: CheckoutConsentSnapshot
) => JSON.stringify(snapshot)

export const parseSerializedCheckoutConsent = (
  value: string,
  options: Parameters<typeof parseCheckoutConsentSnapshot>[1]
) => {
  try {
    return parseCheckoutConsentSnapshot(JSON.parse(value), options)
  } catch {
    return null
  }
}

export const readCheckoutConsentCookie = ({
  cookieHeader,
  market,
  now,
}: {
  cookieHeader: string | null | undefined
  market: MarketCode
  now?: Date
}): CheckoutConsentSnapshot | null => {
  const matches: string[] = []

  for (const entry of cookieHeader?.split(";") ?? []) {
    const separator = entry.indexOf("=")
    if (
      separator < 0 ||
      entry.slice(0, separator).trim() !== CHECKOUT_CONSENT_COOKIE_NAME
    ) {
      continue
    }

    try {
      matches.push(decodeURIComponent(entry.slice(separator + 1).trim()))
    } catch {
      return null
    }
  }

  if (matches.length !== 1 || !matches[0]) {
    return null
  }

  return parseSerializedCheckoutConsent(matches[0], { market, now })
}

export const readCheckoutConsentFromMetadata = (
  metadata: unknown,
  market: MarketCode,
  now?: Date
) => {
  if (!(metadata && typeof metadata === "object") || Array.isArray(metadata)) {
    return null
  }

  return parseCheckoutConsentSnapshot(
    (metadata as Record<string, unknown>).checkout_consent,
    { market, now }
  )
}
