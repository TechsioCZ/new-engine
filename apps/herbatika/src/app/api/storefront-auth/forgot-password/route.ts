import { NextResponse } from "next/server"
import { resolveMarketContextFromHeaders } from "@/lib/storefront/market-context.server"
import {
  badRequest,
  buildErrorResponse,
  buildMedusaUrl,
  serverError,
} from "../_lib"

type ForgotPasswordBody = {
  email?: string
}

type ForgotPasswordResponse = {
  accepted: true
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
    const market = resolveMarketContextFromHeaders(request.headers)
    if (!market) {
      return badRequest("Doména obchodu nezodpovedá podporovanému trhu.")
    }
    const medusaResponse = await fetch(
      buildMedusaUrl("/auth/customer/emailpass/reset-password"),
      {
        method: "POST",
        headers: {
          accept: "text/plain",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          identifier: email,
          metadata: {
            storefront_market_code: market.code,
          },
        }),
        cache: "no-store",
      }
    )

    if (!medusaResponse.ok) {
      return buildErrorResponse(medusaResponse)
    }

    return NextResponse.json<ForgotPasswordResponse>(
      { accepted: true },
      { status: 202 }
    )
  } catch (error) {
    return serverError("Nepodarilo sa odoslať odkaz na obnovu hesla.", {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
