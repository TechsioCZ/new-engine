type PaymentProvider = {
  id?: string | null
}

export type ShippingOption = {
  data?: Record<string, unknown> | null
  provider_id?: string | null
  service_zone?: {
    fulfillment_set?: {
      type?: string | null
    } | null
  } | null
}

export const CASH_ON_DELIVERY_PAYMENT_PROVIDER_ID =
  "pp_cash_on_delivery_default"
export const ON_SITE_PAYMENT_PROVIDER_ID = "pp_system_default"
export const RO_DEMO_NO_DEBIT_PAYMENT_LABEL = "Plată demo (fără debitare)"

const RO_DEMO_CHECKOUT_MARKER_KEYS = [
  "binding_sha256",
  "label",
  "locale",
  "market",
  "payment_mode",
  "provider_id",
  "schema_version",
  "source",
] as const
const RO_DEMO_CHECKOUT_MARKER_SOURCE = "herbatica-ro-demo-commerce-v1" as const
const SHA256_PATTERN = /^[0-9a-f]{64}$/

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

export function isRoDemoNoDebitCarrierShippingOption(
  option: ShippingOption | null | undefined
) {
  if (
    option?.service_zone?.fulfillment_set?.type?.trim().toLowerCase() !==
    "shipping"
  ) {
    return false
  }

  const marker = option.data?.ro_demo_checkout
  if (!isRecord(marker)) {
    return false
  }

  const keys = Object.keys(marker).sort()
  if (
    keys.length !== RO_DEMO_CHECKOUT_MARKER_KEYS.length ||
    keys.some((key, index) => key !== RO_DEMO_CHECKOUT_MARKER_KEYS[index])
  ) {
    return false
  }

  return (
    marker.schema_version === 1 &&
    marker.market === "ro" &&
    marker.locale === "ro-RO" &&
    marker.source === RO_DEMO_CHECKOUT_MARKER_SOURCE &&
    typeof marker.binding_sha256 === "string" &&
    SHA256_PATTERN.test(marker.binding_sha256) &&
    marker.payment_mode === "no-debit-demo" &&
    marker.provider_id === ON_SITE_PAYMENT_PROVIDER_ID &&
    marker.label === RO_DEMO_NO_DEBIT_PAYMENT_LABEL
  )
}

export function resolveRoDemoNoDebitPaymentLabel({
  paymentProviderId,
  shippingOption,
}: {
  paymentProviderId: string | null | undefined
  shippingOption: ShippingOption | null | undefined
}) {
  return paymentProviderId === ON_SITE_PAYMENT_PROVIDER_ID &&
    isRoDemoNoDebitCarrierShippingOption(shippingOption)
    ? RO_DEMO_NO_DEBIT_PAYMENT_LABEL
    : undefined
}

export function isCashOnDeliveryShippingOption(
  option: ShippingOption | null | undefined
) {
  const data = option?.data
  const code =
    typeof data?.code === "string" ? data.code.trim().toLowerCase() : ""

  return (
    data?.supports_cod === true ||
    code === "z_point_cod" ||
    code.endsWith("_cod") ||
    code.endsWith("-cod")
  )
}

export function isPersonalPickupShippingOption(
  option: ShippingOption | null | undefined
) {
  return (
    option?.service_zone?.fulfillment_set?.type?.trim().toLowerCase() ===
    "pickup"
  )
}

export function isPaymentProviderCompatibleWithShipping({
  paymentProviderId,
  shippingOption,
}: {
  paymentProviderId: string | null | undefined
  shippingOption: ShippingOption | null | undefined
}) {
  if (!paymentProviderId) {
    return false
  }

  if (isRoDemoNoDebitCarrierShippingOption(shippingOption)) {
    return Boolean(
      resolveRoDemoNoDebitPaymentLabel({ paymentProviderId, shippingOption })
    )
  }

  const isCashOnDeliveryPayment =
    paymentProviderId === CASH_ON_DELIVERY_PAYMENT_PROVIDER_ID
  const isCashOnDeliveryShipping =
    isCashOnDeliveryShippingOption(shippingOption)

  if (isCashOnDeliveryShipping) {
    return isCashOnDeliveryPayment
  }

  if (isCashOnDeliveryPayment) {
    return false
  }

  return paymentProviderId === ON_SITE_PAYMENT_PROVIDER_ID
    ? isPersonalPickupShippingOption(shippingOption)
    : true
}

export function filterPaymentProvidersForShipping<
  TPaymentProvider extends PaymentProvider,
>({
  paymentProviders,
  shippingOption,
}: {
  paymentProviders: TPaymentProvider[]
  shippingOption: ShippingOption | null | undefined
}) {
  return paymentProviders.filter((paymentProvider) =>
    isPaymentProviderCompatibleWithShipping({
      paymentProviderId: paymentProvider.id,
      shippingOption,
    })
  )
}
