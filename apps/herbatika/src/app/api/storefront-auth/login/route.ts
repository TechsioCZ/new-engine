import { NextResponse } from "next/server"
import {
  badRequest,
  buildErrorResponse,
  buildMedusaUrl,
  parseResponseJson,
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
  let body: LoginBody

  try {
    body = (await request.json()) as LoginBody
  } catch {
    return badRequest("Telo požiadavky musí byť platné JSON.")
  }

  const email = body.email?.trim()
  const password = body.password

  if (!(email && password)) {
    return badRequest("E-mail aj heslo sú povinné.")
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
