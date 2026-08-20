import { buildPath, withPublicSearchParams } from "@/lib/url/public-url"
import type { Market } from "@/lib/url/types"

const CART_SESSION_ENDPOINT = "/api/storefront/checkout/cart-session"
const ORDER_CONFIRMATION_ENDPOINT =
  "/api/storefront/checkout/order-confirmation"
const PAYMENT_RETURN_ISSUE_ENDPOINT =
  "/api/storefront/checkout/payment-return/issue"
const PAYMENT_RETURN_BIND_ENDPOINT =
  "/api/storefront/checkout/payment-return/bind"

type Fetcher = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>

type CartSessionResponse = {
  cart_id?: unknown
}

type OrderConfirmationResponse = {
  ot?: unknown
  publicOrderId?: unknown
}

export type OrderConfirmationAccess = Readonly<{
  orderToken: string
  publicOrderId: string
}>

export type PaymentReturnProvider = "comgate" | "gopay" | "stripe"

export type PaymentReturnAccess = Readonly<{
  canonicalOrigin: string
  cartId: string
  expiresAt: string
  provider: PaymentReturnProvider
  providerId: string
  market: Market
  state: string
}>

const postPrivateFlow = async (
  endpoint: string,
  body: Record<string, string>,
  fetcher: Fetcher
) => {
  const response = await fetcher(endpoint, {
    body: JSON.stringify(body),
    cache: "no-store",
    credentials: "include",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    method: "POST",
  })

  if (!response.ok) {
    throw new Error("Checkout access request failed.")
  }

  try {
    return (await response.json()) as Record<string, unknown>
  } catch {
    throw new Error("Checkout access response was invalid.")
  }
}

export const syncCartSession = async (
  cartId: string,
  fetcher: Fetcher = fetch
): Promise<void> => {
  const payload = (await postPrivateFlow(
    CART_SESSION_ENDPOINT,
    { cart_id: cartId },
    fetcher
  )) as CartSessionResponse

  if (payload.cart_id !== cartId) {
    throw new Error("Checkout access response did not match the cart.")
  }
}

export const issueOrderConfirmationAccess = async (
  input: Readonly<{ cartId: string; publicOrderId: string }>,
  fetcher: Fetcher = fetch
): Promise<OrderConfirmationAccess> => {
  const payload = (await postPrivateFlow(
    ORDER_CONFIRMATION_ENDPOINT,
    {
      cart_id: input.cartId,
      public_order_id: input.publicOrderId,
    },
    fetcher
  )) as OrderConfirmationResponse

  if (
    payload.publicOrderId !== input.publicOrderId ||
    typeof payload.ot !== "string" ||
    payload.ot.length === 0
  ) {
    throw new Error("Checkout access response did not match the order.")
  }

  return {
    orderToken: payload.ot,
    publicOrderId: payload.publicOrderId,
  }
}

const isPaymentReturnProvider = (
  value: unknown
): value is PaymentReturnProvider =>
  value === "comgate" || value === "gopay" || value === "stripe"

export const issuePaymentReturnAccess = async (
  input: Readonly<{ cartId: string; providerId: string }>,
  fetcher: Fetcher = fetch
): Promise<PaymentReturnAccess> => {
  const payload = await postPrivateFlow(
    PAYMENT_RETURN_ISSUE_ENDPOINT,
    { cart_id: input.cartId, provider_id: input.providerId },
    fetcher
  )

  let canonicalOrigin: URL
  try {
    canonicalOrigin = new URL(String(payload.canonicalOrigin))
  } catch {
    throw new Error("Payment return access response did not match the cart.")
  }
  if (
    canonicalOrigin.protocol !== "https:" ||
    canonicalOrigin.origin !== payload.canonicalOrigin ||
    payload.cartId !== input.cartId ||
    payload.providerId !== input.providerId ||
    !isPaymentReturnProvider(payload.provider) ||
    typeof payload.state !== "string" ||
    payload.state.length === 0 ||
    typeof payload.expiresAt !== "string" ||
    !Number.isFinite(Date.parse(payload.expiresAt)) ||
    (payload.market !== "sk" &&
      payload.market !== "cz" &&
      payload.market !== "hu" &&
      payload.market !== "ro")
  ) {
    throw new Error("Payment return access response did not match the cart.")
  }

  return {
    canonicalOrigin: canonicalOrigin.origin,
    cartId: payload.cartId,
    expiresAt: payload.expiresAt,
    provider: payload.provider,
    providerId: payload.providerId,
    market: payload.market,
    state: payload.state,
  }
}

export const bindPaymentReturnAccess = async (
  input: Readonly<{
    cartId: string
    paymentSessionId: string
    providerId: string
    state: string
  }>,
  fetcher: Fetcher = fetch
): Promise<void> => {
  const payload = await postPrivateFlow(
    PAYMENT_RETURN_BIND_ENDPOINT,
    {
      cart_id: input.cartId,
      payment_session_id: input.paymentSessionId,
      provider_id: input.providerId,
      state: input.state,
    },
    fetcher
  )

  if (
    payload.cartId !== input.cartId ||
    payload.paymentSessionId !== input.paymentSessionId ||
    payload.providerId !== input.providerId
  ) {
    throw new Error("Payment return binding did not match the payment session.")
  }
}

export const buildOrderConfirmationHref = ({
  market,
  orderToken,
  publicOrderId,
}: Readonly<{
  market: Market
  orderToken?: string
  publicOrderId: string
}>): string => {
  const pathname = buildPath(
    { kind: "checkout", step: "confirmation", value: publicOrderId },
    market
  )

  return orderToken
    ? withPublicSearchParams(pathname, { ot: orderToken })
    : pathname
}
