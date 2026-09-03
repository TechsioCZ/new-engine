import { getSessionTokenFromCookieHeader } from "@/app/api/storefront-auth/_lib"

export const CART_ID_HINT_COOKIE_NAME = "herbatika_cart_id"
export const CART_SESSION_COOKIE_NAME = "__Host-herbatika-cart-session"
export const ORDER_CONFIRMATION_TOKEN_COOKIE_NAME =
  "__Host-herbatika-order-confirmation"
export const ORDER_CONFIRMATION_TOKEN_COOKIE_MAX_AGE_SECONDS = 24 * 60 * 60
export const PAYMENT_RESULT_COOKIE_NAME = "__Host-herbatika-payment-result"

const exactCookie = (cookieHeader: string | undefined, name: string) => {
  const matches: string[] = []
  for (const entry of cookieHeader?.split(";") ?? []) {
    const separator = entry.indexOf("=")
    if (separator < 0 || entry.slice(0, separator).trim() !== name) {
      continue
    }
    const encoded = entry.slice(separator + 1).trim()
    try {
      matches.push(decodeURIComponent(encoded))
    } catch {
      return null
    }
  }
  return matches.length === 1 && matches[0] ? matches[0] : null
}

export const readCustomerToken = (cookieHeader: string | undefined) =>
  getSessionTokenFromCookieHeader(cookieHeader ?? null) ?? undefined

export const readCartSessionId = (cookieHeader: string | undefined) =>
  exactCookie(cookieHeader, CART_ID_HINT_COOKIE_NAME)

export const readCartSessionToken = (cookieHeader: string | undefined) =>
  exactCookie(cookieHeader, CART_SESSION_COOKIE_NAME)

export const readOrderConfirmationToken = (cookieHeader: string | undefined) =>
  exactCookie(cookieHeader, ORDER_CONFIRMATION_TOKEN_COOKIE_NAME)

export const readPaymentResultToken = (cookieHeader: string | undefined) =>
  exactCookie(cookieHeader, PAYMENT_RESULT_COOKIE_NAME)
