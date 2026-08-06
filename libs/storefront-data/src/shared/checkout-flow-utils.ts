import type { HttpTypes } from "@medusajs/types"
import { omitUndefined } from "@techsio/std/object"

export interface CheckoutCartWithId {
  id?: string | null
}

export interface ResolveCheckoutCartInputResult<
  TCart extends CheckoutCartWithId,
> {
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

  const hasCart = cart !== null && cart !== undefined
  const hasResolvedCartId = resolvedCartId !== undefined
  let cartHasDifferentId = false
  if (hasCart) {
    const currentCartId = cart.id
    cartHasDifferentId =
      currentCartId !== null &&
      currentCartId !== undefined &&
      currentCartId !== "" &&
      currentCartId !== resolvedCartId
  }
  if (hasResolvedCartId && cartHasDifferentId) {
    return { resolvedCartId }
  }

  return omitUndefined({
    normalizedCart: cart,
    resolvedCartId,
  })
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
  cart: HttpTypes.StoreCart | null | undefined,
) => {
  const paymentSessions = cart?.payment_collection?.payment_sessions
  if (paymentSessions === undefined || paymentSessions.length === 0) {
    return null
  }

  return (
    paymentSessions.find(
      (session) =>
        typeof session === "object" &&
        session !== null &&
        "is_selected" in session &&
        session.is_selected === true,
    ) ?? paymentSessions[0]
  )
}

export const resolveSelectedPaymentProviderId = (
  cart: HttpTypes.StoreCart | null | undefined,
): string | undefined => resolveSelectedPaymentSession(cart)?.provider_id

export const resolveExistingPaymentCollection = (
  cart: HttpTypes.StoreCart | null | undefined,
  paymentProviderId: string,
): HttpTypes.StorePaymentCollection | null => {
  const paymentCollection = cart?.payment_collection
  if (paymentCollection === null || paymentCollection === undefined) {
    return null
  }

  return resolveSelectedPaymentProviderId(cart) === paymentProviderId
    ? paymentCollection
    : null
}
