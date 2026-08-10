import { isRecord, getRecordValue } from "@techsio/std/object"
import { NextResponse } from "next/server"

import {
  badRequest,
  buildErrorResponse,
  buildMedusaUrl,
  serverError,
} from "../auth-route-utils"

interface ResetPasswordResponse {
  success: true
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

  const passwordValue = getRecordValue(body, "password")
  const password = typeof passwordValue === "string" ? passwordValue : undefined
  const tokenValue = getRecordValue(body, "token")
  const token = typeof tokenValue === "string" ? tokenValue.trim() : undefined

  if ((token ?? "").length <= 0) {
    return badRequest("Token obnovy hesla je povinný.")
  }

  if ((password ?? "").length <= 0) {
    return badRequest("Nové heslo je povinné.")
  }

  try {
    const medusaResponse = await fetch(
      buildMedusaUrl("/auth/customer/emailpass/update"),
      {
        body: JSON.stringify({
          password,
        }),
        cache: "no-store",
        headers: {
          accept: "text/plain",
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        method: "POST",
      },
    )

    if (!medusaResponse.ok) {
      return await buildErrorResponse(medusaResponse)
    }

    return NextResponse.json<ResetPasswordResponse>(
      { success: true },
      { status: 200 },
    )
  } catch (error) {
    return serverError("Nepodarilo sa obnoviť heslo.", {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

export { post as POST }
