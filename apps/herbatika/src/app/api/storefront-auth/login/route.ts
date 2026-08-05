import { NextResponse } from "next/server"

import {
  badRequest,
  buildErrorResponse,
  buildMedusaUrl,
  parseResponseJson,
  serverError,
  setSessionTokenCookie,
} from "../_lib"

interface LoginBody {
  email?: string
  password?: string
}

interface LoginResponse {
  token: string
}

export async function POST(request: Request) {
  let body: LoginBody

  try {
    body = (await request.json()) as LoginBody
  } catch {
    return badRequest("Telo požiadavky musí byť platné JSON.")
  }

  const email = body.email?.trim()
  const { password } = body

  if (!(email && password)) {
    return badRequest("E-mail aj heslo sú povinné.")
  }

  try {
    const medusaResponse = await fetch(
      buildMedusaUrl("/auth/customer/emailpass"),
      {
        body: JSON.stringify({
          email,
          password,
        }),
        cache: "no-store",
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      }
    )

    if (!medusaResponse.ok) {
      return buildErrorResponse(medusaResponse)
    }

    const payload = await parseResponseJson(medusaResponse)
    const token =
      payload && typeof payload.token === "string" ? payload.token : null

    if (!token) {
      return serverError(
        "Prihlásenie prebehlo úspešne, ale autentifikačný token nebol vrátený."
      )
    }

    const response = NextResponse.json<LoginResponse>(
      {
        token,
      },
      { status: 200 }
    )

    setSessionTokenCookie(response, token)
    return response
  } catch (error) {
    return serverError(
      "Nepodarilo sa spojiť s autentifikačnou službou Medusa.",
      {
        error: error instanceof Error ? error.message : String(error),
      }
    )
  }
}
