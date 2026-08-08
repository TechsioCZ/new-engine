import { getRecordValue } from "@techsio/std/object"

import {
  buildErrorResponse,
  buildMedusaUrl,
  conflict,
  isConflictStatus,
  parseResponseJson,
  serverError,
} from "../auth-route-utils"
import type { ParsedRegisterPayload } from "./register-flow"

export const refreshCustomerToken = async (loginToken: string) => {
  const refreshResponse = await fetch(buildMedusaUrl("/auth/token/refresh"), {
    cache: "no-store",
    headers: {
      authorization: `Bearer ${loginToken}`,
    },
    method: "POST",
  })

  if (!refreshResponse.ok) {
    return loginToken
  }

  const refreshPayload = await parseResponseJson(refreshResponse)
  const tokenValue =
    refreshPayload === null
      ? undefined
      : getRecordValue(refreshPayload, "token")
  return typeof tokenValue === "string" ? tokenValue : loginToken
}

export const createCustomerIdentity = async ({
  email,
  password,
  wholesale,
}: Pick<ParsedRegisterPayload, "email" | "password" | "wholesale">) => {
  const registerResponse = await fetch(
    buildMedusaUrl("/auth/customer/emailpass/register"),
    {
      body: JSON.stringify({ email, password }),
      cache: "no-store",
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    },
  )

  const registerConflict = isConflictStatus(registerResponse.status)
  if (!(registerResponse.ok || registerConflict)) {
    return await buildErrorResponse(registerResponse)
  }

  if (registerConflict && wholesale) {
    return conflict(
      "Účet s týmto e-mailom už existuje. Prihláste sa a požiadajte o VO účet cez podporu.",
    )
  }

  return null
}

export const loginCustomerIdentity = async ({
  email,
  password,
}: Pick<ParsedRegisterPayload, "email" | "password">) => {
  const loginResponse = await fetch(
    buildMedusaUrl("/auth/customer/emailpass"),
    {
      body: JSON.stringify({ email, password }),
      cache: "no-store",
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    },
  )

  if (!loginResponse.ok) {
    return {
      error: await buildErrorResponse(loginResponse),
      token: null,
    }
  }

  const loginPayload = await parseResponseJson(loginResponse)
  const tokenValue =
    loginPayload === null ? undefined : getRecordValue(loginPayload, "token")
  const loginToken = typeof tokenValue === "string" ? tokenValue : null

  if (loginToken === null) {
    return {
      error: serverError(
        "Prihlásenie zákazníka prebehlo úspešne, ale token nebol vrátený.",
      ),
      token: null,
    }
  }

  return {
    error: null,
    token: loginToken,
  }
}
