export const CASH_ON_DELIVERY_PAYMENT_PROVIDER_IDENTIFIER = "cash_on_delivery"
export const CASH_ON_DELIVERY_PAYMENT_PROVIDER_ID = "default"

export function isCashOnDeliveryPaymentProviderId(
  paymentProviderId: string | null | undefined
) {
  return (
    paymentProviderId ===
    [
      "pp",
      CASH_ON_DELIVERY_PAYMENT_PROVIDER_IDENTIFIER,
      CASH_ON_DELIVERY_PAYMENT_PROVIDER_ID,
    ].join("_")
  )
}
