import type { MarketCode } from "@/lib/market/market-runtime"

export const CHECKOUT_PURCHASE_ACCEPTANCE_SCHEMA_VERSION = 1 as const
export const CHECKOUT_TERMS_VERSION = "2026-08-21" as const
export const CHECKOUT_PRIVACY_VERSION = "2026-08-21" as const
export const CHECKOUT_PURCHASE_ACCEPTANCE_MAX_AGE_MS = 24 * 60 * 60 * 1000

const FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1000
const SNAPSHOT_KEYS = Object.freeze([
  "accepted",
  "acceptedAt",
  "cartId",
  "market",
  "privacyVersion",
  "schemaVersion",
  "termsVersion",
] as const)

export type CheckoutPurchaseAcceptanceSnapshot = Readonly<{
  accepted: true
  acceptedAt: string
  cartId: string
  market: MarketCode
  privacyVersion: typeof CHECKOUT_PRIVACY_VERSION
  schemaVersion: typeof CHECKOUT_PURCHASE_ACCEPTANCE_SCHEMA_VERSION
  termsVersion: typeof CHECKOUT_TERMS_VERSION
}>

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

const isExactTimestamp = (value: unknown, now: Date): value is string => {
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
    ageMs <= CHECKOUT_PURCHASE_ACCEPTANCE_MAX_AGE_MS
  )
}

export const createCheckoutPurchaseAcceptance = ({
  cartId,
  market,
  now = new Date(),
}: {
  cartId: string
  market: MarketCode
  now?: Date
}): CheckoutPurchaseAcceptanceSnapshot => {
  if (!cartId || cartId !== cartId.trim()) {
    throw new Error("Checkout purchase acceptance requires an exact cart ID.")
  }

  return Object.freeze({
    accepted: true,
    acceptedAt: now.toISOString(),
    cartId,
    market,
    privacyVersion: CHECKOUT_PRIVACY_VERSION,
    schemaVersion: CHECKOUT_PURCHASE_ACCEPTANCE_SCHEMA_VERSION,
    termsVersion: CHECKOUT_TERMS_VERSION,
  })
}

export const parseCheckoutPurchaseAcceptance = (
  value: unknown,
  options: Readonly<{
    cartId: string
    market: MarketCode
    now?: Date
  }>
): CheckoutPurchaseAcceptanceSnapshot | null => {
  const now = options.now ?? new Date()
  if (
    !isExactRecord(value, SNAPSHOT_KEYS) ||
    value.accepted !== true ||
    value.cartId !== options.cartId ||
    value.market !== options.market ||
    value.privacyVersion !== CHECKOUT_PRIVACY_VERSION ||
    value.schemaVersion !== CHECKOUT_PURCHASE_ACCEPTANCE_SCHEMA_VERSION ||
    value.termsVersion !== CHECKOUT_TERMS_VERSION ||
    !isExactTimestamp(value.acceptedAt, now)
  ) {
    return null
  }

  return createCheckoutPurchaseAcceptance({
    cartId: options.cartId,
    market: options.market,
    now: new Date(value.acceptedAt),
  })
}
