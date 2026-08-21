import { NextResponse } from "next/server"
import {
  applyStorefrontAuthResponsePolicy,
  badRequest,
  buildErrorResponse,
  buildMedusaUrl,
  getPublishableHeaders,
  marketAuthorityError,
  requireStorefrontAuthContext,
  type StorefrontAuthContext,
  StorefrontMarketAuthorityError,
  serverError,
} from "../_lib"

type ForgotPasswordBody = {
  email?: string
}

type ForgotPasswordResponse = {
  accepted: true
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

  const { binding, messages } = context
  let body: ForgotPasswordBody

  try {
    body = (await request.json()) as ForgotPasswordBody
  } catch {
    return badRequest(messages.invalidJson)
  }

  const email = body.email?.trim()

  if (!email) {
    return badRequest(messages.emailRequired)
  }

  try {
    const medusaResponse = await fetch(
      buildMedusaUrl("/auth/customer/emailpass/reset-password"),
      {
        method: "POST",
        headers: {
          accept: "text/plain",
          "content-type": "application/json",
          ...getPublishableHeaders(binding),
        },
        body: JSON.stringify({
          identifier: email,
          metadata: {
            storefront_market_code: binding.market,
          },
        }),
        cache: "no-store",
      }
    )

    if (!medusaResponse.ok) {
      return buildErrorResponse(
        medusaResponse,
        messages,
        messages.resetPasswordLinkFailed
      )
    }

    return applyStorefrontAuthResponsePolicy(
      NextResponse.json<ForgotPasswordResponse>(
        { accepted: true },
        { status: 202 }
      )
    )
  } catch {
    return serverError(messages.resetPasswordLinkFailed)
  }
}
