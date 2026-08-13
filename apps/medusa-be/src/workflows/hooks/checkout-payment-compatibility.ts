export const ON_SITE_PAYMENT_PROVIDER_ID = "pp_system_default"

export type CheckoutShippingMethod = {
  shipping_option?: {
    provider_id?: string | null
    service_zone?: {
      fulfillment_set?: {
        type?: string | null
      } | null
    } | null
  } | null
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
  paymentProviderId,
  shippingMethods,
}: {
  paymentProviderId: string | null | undefined
  shippingMethods: CheckoutShippingMethod[] | undefined
}) {
  if (paymentProviderId !== ON_SITE_PAYMENT_PROVIDER_ID) {
    return true
  }

  return shippingMethods?.some(isPersonalPickupShippingMethod) === true
}
