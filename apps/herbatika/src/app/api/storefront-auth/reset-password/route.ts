import { NextResponse } from "next/server"
import { getAuthPasswordPolicyViolation } from "@/lib/auth/registration-policy"
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

type ResetPasswordBody = {
  password?: string
  token?: string
}

type ResetPasswordResponse = {
  success: true
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
  let body: ResetPasswordBody

  try {
    body = (await request.json()) as ResetPasswordBody
  } catch {
    return badRequest(messages.invalidJson)
  }

  const password = body.password
  const token = body.token?.trim()

  if (!token) {
    return badRequest(messages.resetPasswordTokenRequired)
  }

  if (!password) {
    return badRequest(messages.newPasswordRequired)
  }

  if (getAuthPasswordPolicyViolation(password)) {
    return badRequest(messages.resetPasswordFailed)
  }

  try {
    const medusaResponse = await fetch(
      buildMedusaUrl("/auth/customer/emailpass/reset-password/complete"),
      {
        method: "POST",
        headers: {
          accept: "text/plain",
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
          ...getPublishableHeaders(binding),
        },
        body: JSON.stringify({
          password,
        }),
        cache: "no-store",
      }
    )

    if (!medusaResponse.ok) {
      return buildErrorResponse(
        medusaResponse,
        messages,
        messages.resetPasswordFailed
      )
    }

    return applyStorefrontAuthResponsePolicy(
      NextResponse.json<ResetPasswordResponse>(
        { success: true },
        { status: 200 }
      )
    )
  } catch {
    return serverError(messages.resetPasswordFailed)
  }
}
