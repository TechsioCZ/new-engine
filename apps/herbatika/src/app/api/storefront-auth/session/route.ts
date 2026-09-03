import { type NextRequest, NextResponse } from "next/server"
import {
  applyStorefrontAuthResponsePolicy,
  authenticatedCustomerResponse,
  buildMedusaUrl,
  clearSessionTokenCookie,
  discardResponseBody,
  fetchAuthenticatedCustomer,
  getSessionTokenFromCookieHeader,
  marketAuthorityError,
  parseResponseJson,
  requireStorefrontAuthContext,
  type StorefrontAuthContext,
  StorefrontMarketAuthorityError,
  serverError,
} from "../_lib"

type SessionResponse = {
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

    let activeToken = token
    if (refreshResponse.ok) {
      const refreshPayload = await parseResponseJson(refreshResponse)
      activeToken = resolveToken(refreshPayload, token)
    } else {
      await discardResponseBody(refreshResponse)
    }

    const customer = await fetchAuthenticatedCustomer(binding, activeToken)
    if (!customer) {
      const unauthorizedResponse = NextResponse.json<SessionResponse>(
        {
          authenticated: false,
          message: messages.authenticationRequired,
        },
        { status: 200 }
      )
      clearSessionTokenCookie(unauthorizedResponse)
      return applyStorefrontAuthResponsePolicy(unauthorizedResponse)
    }

    return authenticatedCustomerResponse(customer, activeToken)
  } catch {
    return serverError(messages.sessionRestoreFailed)
  }
}
