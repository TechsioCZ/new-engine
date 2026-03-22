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

const resolveSelectedPaymentSession = (
  cart: HttpTypes.StoreCart | null | undefined
) => {
  const paymentSessions = cart?.payment_collection?.payment_sessions
  if (!paymentSessions?.length) {
    return
  }

  return (
    paymentSessions.find(
      (session) => (session as { is_selected?: unknown }).is_selected === true
    ) ?? paymentSessions[0]
  )
}

export const resolveSelectedPaymentProviderId = (
  cart: HttpTypes.StoreCart | null | undefined
): string | undefined => resolveSelectedPaymentSession(cart)?.provider_id

export const resolveExistingPaymentCollection = (
  cart: HttpTypes.StoreCart | null | undefined,
  paymentProviderId: string
): HttpTypes.StorePaymentCollection | null => {
  const paymentCollection = cart?.payment_collection
  if (!paymentCollection) {
    return null
  }

  return resolveSelectedPaymentProviderId(cart) === paymentProviderId
    ? paymentCollection
    : null
}
