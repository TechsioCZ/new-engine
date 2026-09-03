export const ON_SITE_PAYMENT_PROVIDER_ID = "pp_system_default"
export const RO_DEMO_CHECKOUT_MARKER_KEY = "ro_demo_checkout"

const RO_DEMO_SOURCE = "herbatika-ro-demo-commerce-v1"
const RO_DEMO_MARKET = "ro"
const RO_DEMO_LOCALE = "ro-RO"
const RO_DEMO_PAYMENT_MODE = "no-debit-demo"
const RO_DEMO_PAYMENT_LABEL = "Plată demo (fără debitare)"
const SHA256_PATTERN = /^[a-f0-9]{64}$/

type RoDemoCheckoutMarker = {
  binding_sha256: string
  label: typeof RO_DEMO_PAYMENT_LABEL
  locale: typeof RO_DEMO_LOCALE
  market: typeof RO_DEMO_MARKET
  payment_mode: typeof RO_DEMO_PAYMENT_MODE
  provider_id: typeof ON_SITE_PAYMENT_PROVIDER_ID
  schema_version: 1
  source: typeof RO_DEMO_SOURCE
}

export type CheckoutPaymentCartContext = {
  currency_code?: string | null
  region?: {
    countries?: readonly ({ iso_2?: string | null } | null)[] | null
    currency_code?: string | null
    metadata?: Record<string, unknown> | null
  } | null
  sales_channel_id?: string | null
  shipping_address?: {
    country_code?: string | null
  } | null
}

export type CheckoutShippingMethod = {
  shipping_option?: {
    data?: Record<string, unknown> | null
    provider_id?: string | null
    service_zone?: {
      fulfillment_set?: {
        type?: string | null
      } | null
    } | null
  } | null
}

const markerKeys: readonly (keyof RoDemoCheckoutMarker)[] = [
  "binding_sha256",
  "label",
  "locale",
  "market",
  "payment_mode",
  "provider_id",
  "schema_version",
  "source",
]

function parseRoDemoCheckoutMarker(
  value: unknown
): RoDemoCheckoutMarker | null {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).length !== markerKeys.length
  ) {
    return null
  }

  const marker = value as Record<string, unknown>
  if (!markerKeys.every((key) => Object.hasOwn(marker, key))) {
    return null
  }

  if (
    typeof marker.binding_sha256 !== "string" ||
    !SHA256_PATTERN.test(marker.binding_sha256) ||
    marker.label !== RO_DEMO_PAYMENT_LABEL ||
    marker.locale !== RO_DEMO_LOCALE ||
    marker.market !== RO_DEMO_MARKET ||
    marker.payment_mode !== RO_DEMO_PAYMENT_MODE ||
    marker.provider_id !== ON_SITE_PAYMENT_PROVIDER_ID ||
    marker.schema_version !== 1 ||
    marker.source !== RO_DEMO_SOURCE
  ) {
    return null
  }

  return marker as RoDemoCheckoutMarker
}

function isRoDemoCarrierPaymentContext({
  cart,
  shippingMethods,
}: {
  cart: CheckoutPaymentCartContext | undefined
  shippingMethods: CheckoutShippingMethod[] | undefined
}) {
  const regionMetadata = cart?.region?.metadata
  const regionMarker = parseRoDemoCheckoutMarker(
    regionMetadata?.[RO_DEMO_CHECKOUT_MARKER_KEY]
  )
  const regionCountryCodes = cart?.region?.countries?.map((country) =>
    country?.iso_2?.trim().toLowerCase()
  )

  if (
    !regionMarker ||
    cart?.currency_code?.trim().toLowerCase() !== "ron" ||
    cart.region?.currency_code?.trim().toLowerCase() !== "ron" ||
    cart.shipping_address?.country_code?.trim().toLowerCase() !== "ro" ||
    regionCountryCodes?.length !== 1 ||
    regionCountryCodes[0] !== "ro" ||
    regionMetadata?.demo !== true ||
    regionMetadata.demo_source !== RO_DEMO_SOURCE ||
    regionMetadata.market_code !== RO_DEMO_MARKET ||
    typeof cart.sales_channel_id !== "string" ||
    cart.sales_channel_id.trim().length === 0 ||
    regionMetadata.sales_channel_id !== cart.sales_channel_id ||
    !shippingMethods?.length
  ) {
    return false
  }

  return shippingMethods.every((shippingMethod) => {
    const shippingMarker = parseRoDemoCheckoutMarker(
      shippingMethod.shipping_option?.data?.[RO_DEMO_CHECKOUT_MARKER_KEY]
    )
    return (
      shippingMarker?.binding_sha256 === regionMarker.binding_sha256 &&
      markerKeys.every((key) => shippingMarker[key] === regionMarker[key])
    )
  })
}

export function isPersonalPickupShippingMethod(
  shippingMethod: CheckoutShippingMethod | undefined
) {
  return (
    shippingMethod?.shipping_option?.service_zone?.fulfillment_set?.type
      ?.trim()
      .toLowerCase() === "pickup"
  )
}

export function isOnSitePaymentCompatibleWithShipping({
  cart,
  paymentProviderId,
  shippingMethods,
}: {
  cart?: CheckoutPaymentCartContext
  paymentProviderId: string | null | undefined
  shippingMethods: CheckoutShippingMethod[] | undefined
}) {
  if (paymentProviderId !== ON_SITE_PAYMENT_PROVIDER_ID) {
    return true
  }

  return (
    (shippingMethods?.length !== undefined &&
      shippingMethods.length > 0 &&
      shippingMethods.every(isPersonalPickupShippingMethod)) ||
    isRoDemoCarrierPaymentContext({ cart, shippingMethods })
  )
}
