import type { HttpTypes } from "@medusajs/types"
import type { MedusaPaymentSessionDataInput } from "@techsio/storefront-data/checkout/medusa-service"

export const HERBATIKA_PAYMENT_RETURN_PATH = "/checkout/platba-navrat"

const resolveBrowserOrigin = () => {
  if (typeof window === "undefined") {
    return null
  }

  return window.location.origin
}

export const buildHerbatikaPaymentReturnUrl = ({
  cartId,
  providerId,
  paymentCancelled = false,
}: {
  cartId: string
  providerId: string
  paymentCancelled?: boolean
}) => {
  const origin = resolveBrowserOrigin()
  if (!origin) {
    return
  }

  const url = new URL(HERBATIKA_PAYMENT_RETURN_PATH, origin)
  url.searchParams.set("cart_id", cartId)
  url.searchParams.set("provider_id", providerId)
  if (paymentCancelled) {
    url.searchParams.set("payment_cancelled", "true")
  }
  return url.toString()
}

const resolveCartEmail = (cart: HttpTypes.StoreCart) => {
  const email = cart.email?.trim()
  return email && email.length > 0 ? email : undefined
}

export const buildHerbatikaPaymentSessionData = ({
  cart,
  cartId,
  providerId,
}: MedusaPaymentSessionDataInput): Record<string, unknown> => {
  const email = resolveCartEmail(cart)
  const returnUrl = buildHerbatikaPaymentReturnUrl({ cartId, providerId })
  const cancelUrl = buildHerbatikaPaymentReturnUrl({
    cartId,
    paymentCancelled: true,
    providerId,
  })
  const metadata = {
    cart_id: cartId,
    provider_id: providerId,
  }

  return {
    cart_id: cartId,
    item_id: cartId,
    session_id: cartId,
    metadata,
    ...(email
      ? {
          customer: { email },
          customer_email: email,
          email,
        }
      : {}),
    ...(returnUrl
      ? {
          cancel_url: cancelUrl ?? returnUrl,
          return_url: returnUrl,
          success_url: returnUrl,
          provider_metadata: {
            cancel_url: cancelUrl ?? returnUrl,
            return_url: returnUrl,
            success_url: returnUrl,
          },
        }
      : {}),
  }
}
