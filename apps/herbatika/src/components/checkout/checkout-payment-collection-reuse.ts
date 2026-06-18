import type { HttpTypes } from "@medusajs/types"
import {
  resolveExistingPaymentCollection,
} from "@techsio/storefront-data/shared/checkout-flow-utils"
import {
  asFiniteNumber,
  resolveCartTotalAmount,
} from "@/lib/storefront/cart-calculations"

const PAYMENT_AMOUNT_EPSILON = 0.0001

const areAmountsEqual = (left: number, right: number) =>
  Math.abs(left - right) < PAYMENT_AMOUNT_EPSILON

const resolveProviderPaymentSession = (
  paymentCollection: HttpTypes.StorePaymentCollection,
  selectedPaymentProviderId: string
) => {
  const paymentSessions = paymentCollection.payment_sessions
  if (!paymentSessions?.length) {
    return null
  }

  return (
    paymentSessions.find(
      (session) =>
        session.provider_id === selectedPaymentProviderId &&
        (session as { is_selected?: unknown }).is_selected === true
    ) ??
    paymentSessions.find(
      (session) => session.provider_id === selectedPaymentProviderId
    ) ??
    null
  )
}

export const resolveReusablePaymentCollection = ({
  cart,
  selectedPaymentProviderId,
}: {
  cart?: HttpTypes.StoreCart | null
  selectedPaymentProviderId: string
}): HttpTypes.StorePaymentCollection | null => {
  const paymentCollection = resolveExistingPaymentCollection(
    cart,
    selectedPaymentProviderId
  )
  if (!paymentCollection) {
    return null
  }

  const cartTotalAmount = resolveCartTotalAmount(cart)
  const paymentCollectionAmount = asFiniteNumber(paymentCollection.amount)
  if (
    paymentCollectionAmount === null ||
    !areAmountsEqual(paymentCollectionAmount, cartTotalAmount)
  ) {
    return null
  }

  const selectedPaymentSession = resolveProviderPaymentSession(
    paymentCollection,
    selectedPaymentProviderId
  )
  const paymentSessionAmount = asFiniteNumber(selectedPaymentSession?.amount)
  if (
    paymentSessionAmount === null ||
    !areAmountsEqual(paymentSessionAmount, cartTotalAmount)
  ) {
    return null
  }

  return paymentCollection
}
