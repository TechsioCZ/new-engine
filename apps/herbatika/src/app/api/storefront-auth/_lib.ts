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

type ErrorPayload = {
  message: string
}

export type StorefrontAuthContext = Readonly<{
  binding: MarketRuntimeBinding
  currencyCode: HerbatikaCurrencyCode
  messages: StorefrontAuthMessages
}>

export const AUTH_SESSION_COOKIE_NAME = "herbatika_auth_session_token"

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

  return NextResponse.json<ErrorPayload>(
    { message },
    { status: response.status || 500 }
  )
}

export const isConflictStatus = (status: number) => status === 409

export const badRequest = (message: string) =>
  NextResponse.json<ErrorPayload>({ message }, { status: 400 })

export const conflict = (message: string) =>
  NextResponse.json<ErrorPayload>({ message }, { status: 409 })

export const serverError = (message: string) =>
  NextResponse.json<ErrorPayload>({ message }, { status: 500 })

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
  NextResponse.json<ErrorPayload>(
    { message: "Unknown storefront host." },
    { status: 421 }
  )

export const getPublishableHeaders = (
  binding: MarketRuntimeBinding
): Record<string, string> => ({
  "x-publishable-api-key": binding.publishableApiKey,
})

export const setSessionTokenCookie = (
  response: NextResponse,
  token: string
) => {
  response.cookies.set({
    name: AUTH_SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: AUTH_SESSION_COOKIE_MAX_AGE_SECONDS,
  })
}

export const clearSessionTokenCookie = (response: NextResponse) => {
  response.cookies.set({
    name: AUTH_SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  })
}

export const getSessionTokenFromCookieHeader = (
  cookieHeader: string | null
) => {
  if (!cookieHeader) {
    return null
  }

  const entries = cookieHeader.split(";")
  for (const entry of entries) {
    const [rawName, ...valueParts] = entry.trim().split("=")
    if (rawName !== AUTH_SESSION_COOKIE_NAME) {
      continue
    }

    const encodedValue = valueParts.join("=")
    if (!encodedValue) {
      return null
    }

    try {
      return decodeURIComponent(encodedValue)
    } catch {
      return encodedValue
    }
  }

  return null
}
