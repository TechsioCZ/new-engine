import { NextResponse } from "next/server"
import { resolveStorefrontApiMessages } from "@/app/api/_messages"
import {
  buildMedusaUrl,
  getPublishableHeaders,
  getSessionTokenFromCookieHeader,
  parseResponseJson,
  requireStorefrontMarketBinding,
  StorefrontMarketAuthorityError,
} from "@/app/api/storefront-auth/_lib"
import type { MarketRuntimeBinding } from "@/lib/market/market-runtime"

export const CART_SESSION_COOKIE_NAME = "__Host-herbatika-cart-session"
const CART_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

const PRIVATE_NO_STORE_HEADERS = {
  "cache-control": "private, no-store",
} as const

export const privateJson = <TBody>(body: TBody, status = 200) =>
  NextResponse.json(body, {
    headers: PRIVATE_NO_STORE_HEADERS,
    status,
  })

export const readExactBodyStrings = async <TKeys extends string>(
  request: Request,
  keys: readonly TKeys[]
): Promise<Record<TKeys, string> | null> => {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return null
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null
  }

  const payloadRecord = payload as Record<string, unknown>
  const allowedKeys = new Set<string>(keys)
  const payloadKeys = Object.keys(payloadRecord)
  if (
    payloadKeys.length !== keys.length ||
    payloadKeys.some((key) => !allowedKeys.has(key))
  ) {
    return null
  }

  const values = {} as Record<TKeys, string>
  for (const key of keys) {
    const value = payloadRecord[key]
    if (typeof value !== "string" || value.length === 0) {
      return null
    }
    values[key] = value
  }

  return values
}

export const fetchPrivateFlow = (
  request: Request,
  path: string,
  body: Record<string, string>,
  options: {
    headers?: Record<string, string>
    signal?: AbortSignal
  } = {}
) =>
  fetch(buildMedusaUrl(path), {
    body: JSON.stringify(body),
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      ...getPublishableHeaders(requireStorefrontMarketBinding(request)),
      ...options.headers,
    },
    method: "POST",
    signal: options.signal,
  })

const unknownStorefrontHost = () =>
  privateJson({ message: "Unknown storefront host." }, 421)

export const proxyFailure = (request: Request, status: number) => {
  let binding: MarketRuntimeBinding
  try {
    binding = requireStorefrontMarketBinding(request)
  } catch {
    return unknownStorefrontHost()
  }

  return privateJson(
    {
      message: resolveStorefrontApiMessages(binding.market)
        .checkoutAccessFailed,
    },
    status > 0 ? status : 502
  )
}

export const proxyCaughtFailure = (request: Request, error: unknown) =>
  error instanceof StorefrontMarketAuthorityError
    ? unknownStorefrontHost()
    : proxyFailure(request, 502)

export const readUpstreamJson = parseResponseJson

export const readAuthToken = (request: Request) =>
  getSessionTokenFromCookieHeader(request.headers.get("cookie"))

export const readCartSession = (request: Request) => {
  const cookieHeader = request.headers.get("cookie")
  if (!cookieHeader) {
    return null
  }

  let cartSession: string | null = null
  for (const entry of cookieHeader.split(";")) {
    const [rawName, ...valueParts] = entry.trim().split("=")
    if (rawName !== CART_SESSION_COOKIE_NAME) {
      continue
    }

    if (cartSession !== null) {
      return null
    }

    const encodedValue = valueParts.join("=")
    if (!encodedValue) {
      return null
    }

    try {
      cartSession = decodeURIComponent(encodedValue)
    } catch {
      return null
    }

    if (!cartSession) {
      return null
    }
  }

  return cartSession
}

export const requireCartSessionHeaders = (
  request: Request
): Record<string, string> | null => {
  const cartSession = readCartSession(request)
  return cartSession ? { "x-cart-session": cartSession } : null
}

export const setCartSessionCookie = (
  response: NextResponse,
  cartSession: string
) => {
  response.cookies.set({
    httpOnly: true,
    maxAge: CART_SESSION_MAX_AGE_SECONDS,
    name: CART_SESSION_COOKIE_NAME,
    path: "/",
    sameSite: "lax",
    secure: true,
    value: cartSession,
  })
}
