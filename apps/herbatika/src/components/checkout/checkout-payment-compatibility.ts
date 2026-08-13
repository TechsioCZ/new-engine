type PaymentProvider = {
  id?: string | null
}

type ShippingOption = {
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
