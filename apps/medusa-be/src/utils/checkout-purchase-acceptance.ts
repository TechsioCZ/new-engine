export const CHECKOUT_PURCHASE_ACCEPTANCE_SCHEMA_VERSION = 1 as const
export const CHECKOUT_TERMS_VERSION = "2026-08-21" as const
export const CHECKOUT_PRIVACY_VERSION = "2026-08-21" as const
export const CHECKOUT_PURCHASE_ACCEPTANCE_MAX_AGE_MS = 24 * 60 * 60 * 1000

const FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1000
const HERBATIKA_MARKETS = Object.freeze(["sk", "cz", "hu", "ro"] as const)
const SNAPSHOT_KEYS = Object.freeze([
  "accepted",
  "acceptedAt",
  "cartId",
  "market",
  "privacyVersion",
  "schemaVersion",
  "termsVersion",
] as const)

export type CheckoutPurchaseMarket = (typeof HERBATIKA_MARKETS)[number]
export type CheckoutPurchaseAcceptanceSnapshot = Readonly<{
  accepted: true
  acceptedAt: string
  cartId: string
  market: CheckoutPurchaseMarket
  privacyVersion: typeof CHECKOUT_PRIVACY_VERSION
  schemaVersion: typeof CHECKOUT_PURCHASE_ACCEPTANCE_SCHEMA_VERSION
  termsVersion: typeof CHECKOUT_TERMS_VERSION
}>

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value)

const isExactRecord = <TKey extends string>(
  value: unknown,
  expectedKeys: readonly TKey[]
): value is Record<TKey, unknown> => {
  if (!isRecord(value)) {
    return false
  }

  const keys = Object.keys(value)
  const expected = new Set<string>(expectedKeys)
  return (
    keys.length === expectedKeys.length &&
    keys.every((key) => expected.has(key))
  )
}

const isCheckoutPurchaseMarket = (
  value: unknown
): value is CheckoutPurchaseMarket =>
  typeof value === "string" &&
  HERBATIKA_MARKETS.includes(value as CheckoutPurchaseMarket)

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

const resolveTrustedCartMarket = ({
  regionMetadata,
  salesChannelId,
}: Readonly<{
  regionMetadata: unknown
  salesChannelId: unknown
}>): CheckoutPurchaseMarket | null => {
  if (
    !isRecord(regionMetadata) ||
    typeof salesChannelId !== "string" ||
    !salesChannelId ||
    regionMetadata.sales_channel_id !== salesChannelId ||
    !isCheckoutPurchaseMarket(regionMetadata.market_code)
  ) {
    return null
  }

  return regionMetadata.market_code
}

export const resolveCheckoutPurchaseAcceptance = ({
  cartId,
  cartMetadata,
  now = new Date(),
  regionMetadata,
  salesChannelId,
}: Readonly<{
  cartId: string
  cartMetadata: unknown
  now?: Date
  regionMetadata: unknown
  salesChannelId: unknown
}>): CheckoutPurchaseAcceptanceSnapshot | null => {
  const market = resolveTrustedCartMarket({ regionMetadata, salesChannelId })
  const value = isRecord(cartMetadata)
    ? cartMetadata.checkout_purchase_acceptance
    : null

  if (
    !(market && isExactRecord(value, SNAPSHOT_KEYS)) ||
    value.accepted !== true ||
    value.cartId !== cartId ||
    value.market !== market ||
    value.privacyVersion !== CHECKOUT_PRIVACY_VERSION ||
    value.schemaVersion !== CHECKOUT_PURCHASE_ACCEPTANCE_SCHEMA_VERSION ||
    value.termsVersion !== CHECKOUT_TERMS_VERSION ||
    !isExactTimestamp(value.acceptedAt, now)
  ) {
    return null
  }

  return Object.freeze({
    accepted: true,
    acceptedAt: value.acceptedAt,
    cartId,
    market,
    privacyVersion: CHECKOUT_PRIVACY_VERSION,
    schemaVersion: CHECKOUT_PURCHASE_ACCEPTANCE_SCHEMA_VERSION,
    termsVersion: CHECKOUT_TERMS_VERSION,
  })
}

export const checkoutPurchaseAcceptancesMatch = (
  left: CheckoutPurchaseAcceptanceSnapshot | null,
  right: CheckoutPurchaseAcceptanceSnapshot | null
) =>
  Boolean(left) &&
  Boolean(right) &&
  left?.acceptedAt === right?.acceptedAt &&
  left?.cartId === right?.cartId &&
  left?.market === right?.market &&
  left?.privacyVersion === right?.privacyVersion &&
  left?.schemaVersion === right?.schemaVersion &&
  left?.termsVersion === right?.termsVersion
