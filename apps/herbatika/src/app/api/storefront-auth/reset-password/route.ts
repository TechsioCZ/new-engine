import { NextResponse } from "next/server"
import {
  badRequest,
  buildErrorResponse,
  buildMedusaUrl,
  marketAuthorityError,
  requireStorefrontMarketBinding,
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
  let body: ResetPasswordBody

  try {
    body = (await request.json()) as ResetPasswordBody
  } catch {
    return badRequest("Telo požiadavky musí byť platné JSON.")
  }

  const password = body.password
  const token = body.token?.trim()

  if (!token) {
    return badRequest("Token obnovy hesla je povinný.")
  }

  if (!password) {
    return badRequest("Nové heslo je povinné.")
  }

  try {
    requireStorefrontMarketBinding(request)
    const medusaResponse = await fetch(
      buildMedusaUrl("/auth/customer/emailpass/update"),
      {
        method: "POST",
        headers: {
          accept: "text/plain",
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          password,
        }),
        cache: "no-store",
      }
    )

    if (!medusaResponse.ok) {
      return buildErrorResponse(medusaResponse)
    }

    return NextResponse.json<ResetPasswordResponse>(
      { success: true },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof StorefrontMarketAuthorityError) {
      return marketAuthorityError()
    }
    return serverError("Nepodarilo sa obnoviť heslo.", {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
