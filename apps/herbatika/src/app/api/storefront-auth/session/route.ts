import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import {
  buildMedusaUrl,
  clearSessionTokenCookie,
  getPublishableHeaders,
  getSessionTokenFromCookieHeader,
  parseResponseJson,
  serverError,
  setSessionTokenCookie,
} from "../_lib"

interface SessionResponse {
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
  const token = getSessionTokenFromCookieHeader(request.headers.get("cookie"))

  if (!token) {
    return NextResponse.json<SessionResponse>(
      {
        authenticated: false,
        message: "Authentication required.",
        token: null,
      },
      { status: 200 }
    )
  }

  try {
    const refreshResponse = await fetch(buildMedusaUrl("/auth/token/refresh"), {
      cache: "no-store",
      headers: {
        authorization: `Bearer ${token}`,
      },
      method: "POST",
    })

    if (refreshResponse.ok) {
      const refreshPayload = await parseResponseJson(refreshResponse)
      const refreshedToken = resolveToken(refreshPayload, token)
      const response = NextResponse.json<SessionResponse>(
        { authenticated: true, token: refreshedToken },
        { status: 200 }
      )
      setSessionTokenCookie(response, refreshedToken)
      return response
    }

    const customerResponse = await fetch(
      buildMedusaUrl("/store/customers/me"),
      {
        cache: "no-store",
        headers: {
          authorization: `Bearer ${token}`,
          ...getPublishableHeaders(),
        },
        method: "GET",
      }
    )

    if (!customerResponse.ok) {
      const unauthorizedResponse = NextResponse.json<SessionResponse>(
        {
          authenticated: false,
          message: "Authentication required.",
          token: null,
        },
        { status: 200 }
      )
      clearSessionTokenCookie(unauthorizedResponse)
      return unauthorizedResponse
    }

    const response = NextResponse.json<SessionResponse>(
      { authenticated: true, token },
      { status: 200 }
    )
    setSessionTokenCookie(response, token)
    return response
  } catch (error) {
    return serverError("Unable to restore auth session.", {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
