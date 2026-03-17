import type { HttpTypes } from "@medusajs/types"

export type CheckoutCartWithId = {
  id?: string | null
}

export type ResolveCheckoutCartInputResult<TCart extends CheckoutCartWithId> = {
  resolvedCartId?: string
  normalizedCart?: TCart | null
}

export const resolveCheckoutCartInput = <TCart extends CheckoutCartWithId>({
  cartId,
  cart,
}: {
  cartId?: string
  cart?: TCart | null
}): ResolveCheckoutCartInputResult<TCart> => {
  const resolvedCartId =
    cartId ?? (typeof cart?.id === "string" ? cart.id : undefined)

  if (cart && resolvedCartId && cart.id && cart.id !== resolvedCartId) {
    return { resolvedCartId }
  }

  return {
    resolvedCartId,
    normalizedCart: cart,
  }
}

export const resolveEffectiveCheckoutCart = <TCart>({
  cartId,
  cart,
  getCachedCart,
}: {
  cartId: string
  cart?: TCart | null
  getCachedCart: (cartId: string) => TCart | null
}): TCart | null => cart ?? getCachedCart(cartId)

export const resolveExistingPaymentCollection = (
  cart: HttpTypes.StoreCart | null | undefined,
  paymentProviderId: string
): HttpTypes.StorePaymentCollection | null => {
  const paymentCollection = cart?.payment_collection
  const paymentSessions = paymentCollection?.payment_sessions
  if (!(paymentCollection && paymentSessions?.length)) {
    return null
  }

  const selectedSession =
    paymentSessions.find(
      (session) => (session as { is_selected?: unknown }).is_selected === true
    ) ?? paymentSessions[0]

  return selectedSession?.provider_id === paymentProviderId
    ? paymentCollection
    : null
}
