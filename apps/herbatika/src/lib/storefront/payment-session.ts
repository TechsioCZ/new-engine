import type { HttpTypes } from "@medusajs/types"
import type {
  MedusaPaymentSessionBindingInput,
  MedusaPaymentSessionDataInput,
} from "@techsio/storefront-data/checkout/medusa-service"
import {
  DECLARED_HOST_OWNERSHIP,
  normalizeHost,
  ROUTES,
} from "@/lib/market/market-runtime-definitions"
import {
  bindPaymentReturnAccess,
  issuePaymentReturnAccess,
  type PaymentReturnAccess,
} from "@/lib/storefront/checkout-access"
import { buildAbsoluteUrl, withPublicSearchParams } from "@/lib/url/public-url"
import type { Market } from "@/lib/url/types"

const resolveBrowserMarket = (): Market | null => {
  if (typeof window === "undefined") {
    return null
  }

  const host = normalizeHost(window.location.host)
  return host ? (DECLARED_HOST_OWNERSHIP[host] ?? null) : null
}

export const buildHerbatikaPaymentReturnUrl = ({
  access,
  market,
}: {
  access: PaymentReturnAccess
  market: Market
}) => {
  const pathname = withPublicSearchParams(
    `/api/payments/${access.provider}/return`,
    {
      state: access.state,
      cart_id: access.cartId,
      provider_id: access.providerId,
    }
  )
  return new URL(
    pathname,
    buildAbsoluteUrl({ kind: "home" }, market)
  ).toString()
}

const resolveCartEmail = (cart: HttpTypes.StoreCart) => {
  const email = cart.email?.trim()
  return email && email.length > 0 ? email : undefined
}

export const buildHerbatikaPaymentSessionData = async ({
  cart,
  cartId,
  providerId,
}: MedusaPaymentSessionDataInput): Promise<Record<string, unknown>> => {
  const email = resolveCartEmail(cart)
  const market = resolveBrowserMarket()
  if (!market) {
    throw new Error("Payment return market could not be resolved.")
  }

  const access = await issuePaymentReturnAccess({ cartId, providerId })
  const returnUrl = buildHerbatikaPaymentReturnUrl({ access, market })
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
    cancel_url: returnUrl,
    return_url: returnUrl,
    success_url: returnUrl,
    provider_metadata: {
      cancel_url: returnUrl,
      return_url: returnUrl,
      success_url: returnUrl,
    },
  }
}

const PAYMENT_RETURN_PATH = /^\/api\/payments\/(comgate|gopay|stripe)\/return$/
const PAYMENT_RETURN_QUERY_KEYS = ["cart_id", "provider_id", "state"]

const readPaymentReturnState = (
  paymentSessionData: Record<string, unknown> | undefined,
  cartId: string,
  providerId: string,
  market: Market
): string | null => {
  const value = paymentSessionData?.return_url
  if (typeof value !== "string") {
    return null
  }

  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }

  const keys = [...url.searchParams.keys()].sort()
  const state = url.searchParams.get("state")
  if (
    url.protocol !== "https:" ||
    Boolean(url.username || url.password) ||
    url.origin !== ROUTES[market].canonicalOrigin ||
    !PAYMENT_RETURN_PATH.test(url.pathname) ||
    url.hash ||
    keys.length !== PAYMENT_RETURN_QUERY_KEYS.length ||
    !keys.every((key, index) => key === PAYMENT_RETURN_QUERY_KEYS[index]) ||
    url.searchParams.get("cart_id") !== cartId ||
    url.searchParams.get("provider_id") !== providerId ||
    !state
  ) {
    return null
  }

  return state
}

export const bindHerbatikaPaymentSessionData = async ({
  cartId,
  paymentSessionData,
  paymentSessionId,
  providerId,
}: MedusaPaymentSessionBindingInput): Promise<void> => {
  const market = resolveBrowserMarket()
  const state = market
    ? readPaymentReturnState(paymentSessionData, cartId, providerId, market)
    : null
  if (!state) {
    throw new Error("Payment return state was not prepared.")
  }

  await bindPaymentReturnAccess({
    cartId,
    paymentSessionId,
    providerId,
    state,
  })
}
