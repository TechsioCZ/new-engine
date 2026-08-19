import { createHmac, timingSafeEqual } from "node:crypto"
import { MedusaError } from "@medusajs/framework/utils"

export const CART_SESSION_COOKIE_NAME = "__Host-herbatika-cart-session"
export const CART_SESSION_TTL_SECONDS = 30 * 24 * 60 * 60

type CartSessionClaims = {
  cart_id: string
  exp: number
  sales_channel_id: string
  v: 1
}

const sign = (encodedPayload: string, secret: string) =>
  createHmac("sha256", secret)
    .update(encodedPayload, "utf8")
    .digest("base64url")

export const requireCartSessionSecret = () => {
  const secret = process.env.COOKIE_SECRET
  if (!secret) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Cart-session signing is not configured."
    )
  }
  return secret
}

export const createCartSessionToken = (
  input: {
    cart_id: string
    sales_channel_id: string
  },
  secret: string,
  now = Date.now()
) => {
  const claims: CartSessionClaims = {
    cart_id: input.cart_id,
    exp: Math.floor(now / 1000) + CART_SESSION_TTL_SECONDS,
    sales_channel_id: input.sales_channel_id,
    v: 1,
  }
  const payload = Buffer.from(JSON.stringify(claims), "utf8").toString(
    "base64url"
  )

  return `${payload}.${sign(payload, secret)}`
}

export const verifyCartSessionToken = (
  token: string,
  secret: string,
  now = Date.now()
): CartSessionClaims | undefined => {
  if (!token || token !== token.trim()) {
    return
  }

  const parts = token.split(".")
  if (parts.length !== 2) {
    return
  }

  const [payload, signature] = parts
  if (!(payload && signature)) {
    return
  }

  const expected = Buffer.from(sign(payload, secret), "base64url")
  const actual = Buffer.from(signature, "base64url")
  if (
    expected.length !== actual.length ||
    !timingSafeEqual(expected, actual) ||
    actual.toString("base64url") !== signature
  ) {
    return
  }

  let claims: unknown
  try {
    const decoded = Buffer.from(payload, "base64url")
    if (decoded.toString("base64url") !== payload) {
      return
    }
    claims = JSON.parse(decoded.toString("utf8"))
  } catch {
    return
  }

  if (!(claims && typeof claims === "object")) {
    return
  }

  const value = claims as Record<string, unknown>
  if (
    value.v !== 1 ||
    typeof value.cart_id !== "string" ||
    !value.cart_id ||
    typeof value.sales_channel_id !== "string" ||
    !value.sales_channel_id ||
    typeof value.exp !== "number" ||
    !Number.isInteger(value.exp) ||
    value.exp <= Math.floor(now / 1000)
  ) {
    return
  }

  return value as CartSessionClaims
}

export const serializeCartSessionCookie = (token: string) =>
  `${CART_SESSION_COOKIE_NAME}=${token}; Path=/; Max-Age=${CART_SESSION_TTL_SECONDS}; HttpOnly; Secure; SameSite=Lax`

export const readCookie = (cookieHeader: string | undefined, name: string) => {
  for (const item of cookieHeader?.split(";") ?? []) {
    const separator = item.indexOf("=")
    if (separator < 0 || item.slice(0, separator).trim() !== name) {
      continue
    }

    return item.slice(separator + 1).trim()
  }

  return
}
