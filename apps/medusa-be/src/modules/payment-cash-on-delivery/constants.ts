export const CASH_ON_DELIVERY_PAYMENT_PROVIDER_IDENTIFIER = "cash_on_delivery"
export const CASH_ON_DELIVERY_PAYMENT_PROVIDER_ID = "default"
export const CASH_ON_DELIVERY_MEDUSA_PAYMENT_PROVIDER_ID = [
  "pp",
  CASH_ON_DELIVERY_PAYMENT_PROVIDER_IDENTIFIER,
  CASH_ON_DELIVERY_PAYMENT_PROVIDER_ID,
].join("_")

export function isCashOnDeliveryPaymentProviderId(
  paymentProviderId: string | null | undefined
) {
  return paymentProviderId === CASH_ON_DELIVERY_MEDUSA_PAYMENT_PROVIDER_ID
}
