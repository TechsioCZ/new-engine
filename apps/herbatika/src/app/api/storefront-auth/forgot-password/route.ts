import { NextResponse } from "next/server"

import {
  badRequest,
  buildErrorResponse,
  buildMedusaUrl,
  serverError,
} from "../_lib"

interface ForgotPasswordBody {
  email?: string
}

interface ForgotPasswordResponse {
  success: true
}

export async function POST(request: Request) {
  let body: ForgotPasswordBody

  try {
    body = (await request.json()) as ForgotPasswordBody
  } catch {
    return badRequest("Telo požiadavky musí byť platné JSON.")
  }

  const email = body.email?.trim()

  if (!email) {
    return badRequest("E-mail je povinný.")
  }

  try {
    const medusaResponse = await fetch(
      buildMedusaUrl("/auth/customer/emailpass/reset-password"),
      {
        body: JSON.stringify({
          identifier: email,
        }),
        cache: "no-store",
        headers: {
          accept: "text/plain",
          "content-type": "application/json",
        },
        method: "POST",
      }
    )

    if (!medusaResponse.ok) {
      return buildErrorResponse(medusaResponse)
    }

    return NextResponse.json<ForgotPasswordResponse>(
      { success: true },
      { status: 200 }
    )
  } catch (error) {
    return serverError("Nepodarilo sa odoslať odkaz na obnovu hesla.", {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
