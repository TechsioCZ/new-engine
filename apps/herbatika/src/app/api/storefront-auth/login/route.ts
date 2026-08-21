import { NextResponse } from "next/server"
import {
  applyStorefrontAuthResponsePolicy,
  badRequest,
  buildErrorResponse,
  buildMedusaUrl,
  marketAuthorityError,
  parseResponseJson,
  requireStorefrontAuthContext,
  type StorefrontAuthContext,
  StorefrontMarketAuthorityError,
  serverError,
  setSessionTokenCookie,
} from "../_lib"

type LoginBody = {
  email?: string
  password?: string
}

type LoginResponse = {
  token: string
}

export async function POST(request: Request) {
  let context: StorefrontAuthContext

  try {
    context = requireStorefrontAuthContext(request)
  } catch (error) {
    if (error instanceof StorefrontMarketAuthorityError) {
      return marketAuthorityError()
    }
    throw error
  }

  const { messages } = context
  let body: LoginBody

  try {
    body = (await request.json()) as LoginBody
  } catch {
    return badRequest(messages.invalidJson)
  }

  const email = body.email?.trim()
  const password = body.password

  if (!(email && password)) {
    return badRequest(messages.emailAndPasswordRequired)
  }

  try {
    const medusaResponse = await fetch(
      buildMedusaUrl("/auth/customer/emailpass"),
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
        cache: "no-store",
      }
    )

    if (!medusaResponse.ok) {
      return buildErrorResponse(medusaResponse, messages)
    }

    const payload = await parseResponseJson(medusaResponse)
    const token =
      payload && typeof payload.token === "string" ? payload.token : null

    if (!token) {
      return serverError(messages.customerLoginTokenMissing)
    }

    const response = NextResponse.json<LoginResponse>(
      {
        token,
      },
      { status: 200 }
    )

    setSessionTokenCookie(response, token)
    return applyStorefrontAuthResponsePolicy(response)
  } catch {
    return serverError(messages.unableToReachAuthenticationService)
  }
}
