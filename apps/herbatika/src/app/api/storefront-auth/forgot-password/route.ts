import { isRecord, getRecordValue } from "@techsio/std/object"
import { NextResponse } from "next/server"

import {
  badRequest,
  buildErrorResponse,
  buildMedusaUrl,
  serverError,
} from "../auth-route-utils"

interface ForgotPasswordResponse {
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

  const emailValue = getRecordValue(body, "email")
  const email = typeof emailValue === "string" ? emailValue.trim() : undefined

  if ((email ?? "").length <= 0) {
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
      },
    )

    if (!medusaResponse.ok) {
      return await buildErrorResponse(medusaResponse)
    }

    return NextResponse.json<ForgotPasswordResponse>(
      { success: true },
      { status: 200 },
    )
  } catch (error) {
    return serverError("Nepodarilo sa odoslať odkaz na obnovu hesla.", {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

export { post as POST }
