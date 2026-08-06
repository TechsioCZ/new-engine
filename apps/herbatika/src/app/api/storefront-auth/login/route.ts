import { isRecord, getRecordValue } from "@techsio/std/object"
import { NextResponse } from "next/server"

import {
  badRequest,
  buildErrorResponse,
  buildMedusaUrl,
  parseResponseJson,
  serverError,
  setSessionTokenCookie,
} from "../auth-route-utils"

interface LoginResponse {
  token: string
}

const post = async (request: Request) => {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return badRequest("Telo požiadavky musí byť platné JSON.")
  }

  if (!isRecord(body)) {
    return badRequest("Telo požiadavky musí byť objekt JSON.")
  }

  const emailValue = getRecordValue(body, "email")
  const email = typeof emailValue === "string" ? emailValue.trim() : undefined
  const passwordValue = getRecordValue(body, "password")
  const password = typeof passwordValue === "string" ? passwordValue : undefined

  if (email === undefined || password === undefined) {
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
      },
    )

    if (!medusaResponse.ok) {
      return await buildErrorResponse(medusaResponse)
    }

    const payload = await parseResponseJson(medusaResponse)
    const tokenValue =
      payload === null ? undefined : getRecordValue(payload, "token")
    const token = typeof tokenValue === "string" ? tokenValue : null

    if (token === null) {
      return serverError(
        "Prihlásenie prebehlo úspešne, ale autentifikačný token nebol vrátený.",
      )
    }

    const response = NextResponse.json<LoginResponse>(
      {
        token,
      },
      { status: 200 },
    )

    setSessionTokenCookie(response, token)
    return response
  } catch (error) {
    return serverError(
      "Nepodarilo sa spojiť s autentifikačnou službou Medusa.",
      {
        error: error instanceof Error ? error.message : String(error),
      },
    )
  }
}

export { post as POST }
