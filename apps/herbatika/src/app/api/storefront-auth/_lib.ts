import type { HttpTypes } from "@medusajs/types"
import { NextResponse } from "next/server"

import type { MarketRuntimeBinding } from "@/lib/market/market-runtime"
import { resolveConfiguredMarketRuntimeBindingByHost } from "@/lib/market/market-runtime.server"
import {
  getHerbatikaMarketContext,
  type HerbatikaCurrencyCode,
} from "@/lib/storefront/market-context"
import { resolveMedusaBackendUrl } from "@/lib/storefront/runtime-env"
import {
  resolveStorefrontAuthMessages,
  type StorefrontAuthMessages,
} from "./_messages"

export type { StorefrontAuthMessages } from "./_messages"

const MEDUSA_BACKEND_URL = resolveMedusaBackendUrl()
const AUTH_SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 14
const AUTH_SESSION_COOKIE_BASE_NAME = "herbatika_auth_session_token"
const IS_PRODUCTION = process.env.NODE_ENV === "production"
const PRIVATE_AUTH_CACHE_CONTROL = "private, no-store"

type ErrorPayload = {
  message: string
}

export type StorefrontAuthContext = Readonly<{
  binding: MarketRuntimeBinding
  currencyCode: HerbatikaCurrencyCode
  messages: StorefrontAuthMessages
}>

export const AUTH_SESSION_COOKIE_NAME = IS_PRODUCTION
  ? `__Host-${AUTH_SESSION_COOKIE_BASE_NAME}`
  : AUTH_SESSION_COOKIE_BASE_NAME

export const applyStorefrontAuthResponsePolicy = <TResponse extends Response>(
  response: TResponse
): TResponse => {
  response.headers.set("cache-control", PRIVATE_AUTH_CACHE_CONTROL)

  const vary = response.headers.get("vary")
  const varyValues = vary
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean)

  if (!varyValues?.some((value) => value === "*")) {
    const hasCookieVary = varyValues?.some(
      (value) => value.toLowerCase() === "cookie"
    )
    if (!hasCookieVary) {
      response.headers.set("vary", [...(varyValues ?? []), "Cookie"].join(", "))
    }
  }

  return response
}

export const buildMedusaUrl = (path: string) =>
  new URL(path, MEDUSA_BACKEND_URL).toString()

export const parseResponseJson = async (response: Response) => {
  try {
    return (await response.json()) as Record<string, unknown>
  } catch {
    return null
  }
}

export const discardResponseBody = async (response: Response) => {
  try {
    await response.body?.cancel()
  } catch {
    // The upstream payload is private; cancellation is best-effort.
  }
}

const fallbackErrorMessage = (
  status: number,
  messages: StorefrontAuthMessages
) => {
  if (status === 400) {
    return messages.invalidAuthenticationRequest
  }

  if (status === 401 || status === 403) {
    return messages.authenticationFailed
  }

  return messages.authenticationRequestFailed(status)
}

export const buildErrorResponse = async (
  response: Response,
  messages: StorefrontAuthMessages,
  message = fallbackErrorMessage(response.status, messages)
) => {
  await discardResponseBody(response)

  return applyStorefrontAuthResponsePolicy(
    NextResponse.json<ErrorPayload>(
      { message },
      { status: response.status || 500 }
    )
  )
}

export const isConflictStatus = (status: number) => status === 409

export const badRequest = (message: string) =>
  applyStorefrontAuthResponsePolicy(
    NextResponse.json<ErrorPayload>({ message }, { status: 400 })
  )

export const conflict = (message: string) =>
  applyStorefrontAuthResponsePolicy(
    NextResponse.json<ErrorPayload>({ message }, { status: 409 })
  )

export const serverError = (message: string) =>
  applyStorefrontAuthResponsePolicy(
    NextResponse.json<ErrorPayload>({ message }, { status: 500 })
  )

export class StorefrontMarketAuthorityError extends Error {
  constructor() {
    super("Request host does not belong to an enabled storefront market")
    this.name = "StorefrontMarketAuthorityError"
  }
}

export const requireStorefrontMarketBinding = (
  request: Request
): MarketRuntimeBinding => {
  const binding = resolveConfiguredMarketRuntimeBindingByHost(
    request.headers.get("host")
  )
  if (!binding) {
    throw new StorefrontMarketAuthorityError()
  }
  return binding
}

export const requireStorefrontAuthContext = (
  request: Request
): StorefrontAuthContext => {
  const binding = requireStorefrontMarketBinding(request)
  const marketContext = getHerbatikaMarketContext(binding.market)

  return {
    binding,
    currencyCode: marketContext.currencyCode,
    messages: resolveStorefrontAuthMessages(marketContext.code),
  }
}

export const marketAuthorityError = () =>
  applyStorefrontAuthResponsePolicy(
    NextResponse.json<ErrorPayload>(
      { message: "Unknown storefront host." },
      { status: 421 }
    )
  )

export const getPublishableHeaders = (
  binding: MarketRuntimeBinding
): Record<string, string> => ({
  "x-publishable-api-key": binding.publishableApiKey,
})

export const fetchAuthenticatedCustomer = async (
  binding: MarketRuntimeBinding,
  token: string
): Promise<HttpTypes.StoreCustomer | null> => {
  const response = await fetch(buildMedusaUrl("/store/customers/me"), {
    method: "GET",
    headers: {
      authorization: `Bearer ${token}`,
      ...getPublishableHeaders(binding),
    },
    cache: "no-store",
  })

  if (!response.ok) {
    await discardResponseBody(response)
    return null
  }

  const payload = await parseResponseJson(response)
  const customer = payload?.customer
  if (
    !customer ||
    typeof customer !== "object" ||
    typeof (customer as { id?: unknown }).id !== "string"
  ) {
    return null
  }

  return customer as HttpTypes.StoreCustomer
}

export const setSessionTokenCookie = (
  response: NextResponse,
  token: string
) => {
  applyStorefrontAuthResponsePolicy(response)
  response.cookies.set({
    name: AUTH_SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: IS_PRODUCTION,
    maxAge: AUTH_SESSION_COOKIE_MAX_AGE_SECONDS,
  })
}

export const authenticatedCustomerResponse = (
  customer: HttpTypes.StoreCustomer,
  token: string
) => {
  const response = NextResponse.json(
    {
      authenticated: true as const,
      user: customer,
    },
    { status: 200 }
  )
  setSessionTokenCookie(response, token)
  return applyStorefrontAuthResponsePolicy(response)
}

export const clearSessionTokenCookie = (response: NextResponse) => {
  applyStorefrontAuthResponsePolicy(response)
  response.cookies.set({
    name: AUTH_SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: IS_PRODUCTION,
    maxAge: 0,
  })
}

export const getSessionTokenFromCookieHeader = (
  cookieHeader: string | null
) => {
  if (!cookieHeader) {
    return null
  }

  const matches: string[] = []
  for (const entry of cookieHeader.split(";")) {
    const [rawName, ...valueParts] = entry.trim().split("=")
    if (rawName !== AUTH_SESSION_COOKIE_NAME) {
      continue
    }

    matches.push(valueParts.join("="))
  }

  if (matches.length !== 1 || !matches[0]) {
    return null
  }

  try {
    return decodeURIComponent(matches[0])
  } catch {
    return matches[0]
  }
}
