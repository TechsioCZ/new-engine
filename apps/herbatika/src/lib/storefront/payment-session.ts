import type { HttpTypes } from "@medusajs/types"
import type { MedusaPaymentSessionDataInput } from "@techsio/storefront-data/checkout/medusa-service"
import { buildCheckoutUrl } from "@/lib/url/builder"
import type { Market } from "@/lib/url/types"

export const resolveHerbatikaPaymentReturnPath = (market: Market) =>
  buildCheckoutUrl(market, "checkout.paymentReturn")

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
  market,
}: {
  cartId: string
  providerId: string
  paymentCancelled?: boolean
  market: Market
}) => {
  const origin = resolveBrowserOrigin()
  if (!origin) {
    return
  }

  const url = new URL(resolveHerbatikaPaymentReturnPath(market), origin)
  url.searchParams.set("cart_id", cartId)
  url.searchParams.set("provider_id", providerId)
  if (paymentCancelled) {
    url.searchParams.set("payment_cancelled", "true")
  }
  return url.toString()
}

const resolvePaymentMarket = (cart: HttpTypes.StoreCart): Market => {
  const countryCode = (
    cart.shipping_address?.country_code ?? cart.billing_address?.country_code
  )?.toLowerCase()

  if (countryCode === "sk" || countryCode === "cz" || countryCode === "hu" || countryCode === "ro") {
    return countryCode
  }

  throw new Error("Cannot build payment return URL without a supported cart market")
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
  const market = resolvePaymentMarket(cart)
  const returnUrl = buildHerbatikaPaymentReturnUrl({ cartId, providerId, market })
  const cancelUrl = buildHerbatikaPaymentReturnUrl({
    cartId,
    paymentCancelled: true,
    providerId,
    market,
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
