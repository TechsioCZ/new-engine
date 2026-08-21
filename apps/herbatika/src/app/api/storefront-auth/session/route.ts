import { type NextRequest, NextResponse } from "next/server"
import {
  applyStorefrontAuthResponsePolicy,
  buildMedusaUrl,
  clearSessionTokenCookie,
  discardResponseBody,
  getPublishableHeaders,
  getSessionTokenFromCookieHeader,
  marketAuthorityError,
  parseResponseJson,
  requireStorefrontAuthContext,
  type StorefrontAuthContext,
  StorefrontMarketAuthorityError,
  serverError,
  setSessionTokenCookie,
} from "../_lib"

type SessionResponse = {
  token: string | null
  authenticated: boolean
  message?: string
}

const resolveToken = (
  payload: Record<string, unknown> | null,
  fallbackToken: string
) => {
  if (
    payload &&
    typeof payload.token === "string" &&
    payload.token.length > 0
  ) {
    return payload.token
  }

  return fallbackToken
}

export async function GET(request: NextRequest) {
  let context: StorefrontAuthContext
  try {
    context = requireStorefrontAuthContext(request)
  } catch (error) {
    if (error instanceof StorefrontMarketAuthorityError) {
      return marketAuthorityError()
    }
    throw error
  }
  const { binding, messages } = context
  const token = getSessionTokenFromCookieHeader(request.headers.get("cookie"))

  if (!token) {
    return applyStorefrontAuthResponsePolicy(
      NextResponse.json<SessionResponse>(
        {
          token: null,
          authenticated: false,
          message: messages.authenticationRequired,
        },
        { status: 200 }
      )
    )
  }

  try {
    const refreshResponse = await fetch(buildMedusaUrl("/auth/token/refresh"), {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    })

    if (refreshResponse.ok) {
      const refreshPayload = await parseResponseJson(refreshResponse)
      const refreshedToken = resolveToken(refreshPayload, token)
      const response = NextResponse.json<SessionResponse>(
        { token: refreshedToken, authenticated: true },
        { status: 200 }
      )
      setSessionTokenCookie(response, refreshedToken)
      return applyStorefrontAuthResponsePolicy(response)
    }
    await discardResponseBody(refreshResponse)

    const customerResponse = await fetch(
      buildMedusaUrl("/store/customers/me"),
      {
        method: "GET",
        headers: {
          authorization: `Bearer ${token}`,
          ...getPublishableHeaders(binding),
        },
        cache: "no-store",
      }
    )
    await discardResponseBody(customerResponse)

    if (!customerResponse.ok) {
      const unauthorizedResponse = NextResponse.json<SessionResponse>(
        {
          token: null,
          authenticated: false,
          message: messages.authenticationRequired,
        },
        { status: 200 }
      )
      clearSessionTokenCookie(unauthorizedResponse)
      return applyStorefrontAuthResponsePolicy(unauthorizedResponse)
    }

    const response = NextResponse.json<SessionResponse>(
      { token, authenticated: true },
      { status: 200 }
    )
    setSessionTokenCookie(response, token)
    return applyStorefrontAuthResponsePolicy(response)
  } catch {
    return serverError(messages.sessionRestoreFailed)
  }
}
