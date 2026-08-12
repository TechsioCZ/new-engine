type PaymentProvider = {
  id?: string | null
}

type ShippingOption = {
  data?: Record<string, unknown> | null
}

export const CASH_ON_DELIVERY_PAYMENT_PROVIDER_ID =
  "pp_cash_on_delivery_default"

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

  return isCashOnDeliveryShippingOption(shippingOption)
    ? isCashOnDeliveryPayment
    : !isCashOnDeliveryPayment
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
