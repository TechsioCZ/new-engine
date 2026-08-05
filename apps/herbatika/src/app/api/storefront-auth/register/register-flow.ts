import type { HttpTypes } from "@medusajs/types"

import {
  buildErrorResponse,
  buildMedusaUrl,
  conflict,
  getPublishableHeaders,
  isConflictStatus,
  parseResponseJson,
  serverError,
} from "../_lib"
import { createWholesaleCompanyRequest } from "./wholesale"
import type { ParsedWholesaleRegistration } from "./wholesale"

export interface ParsedRegisterPayload {
  email: string
  password: string
  firstName?: string
  lastName?: string
  wholesale: ParsedWholesaleRegistration | null
}

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
  return refreshPayload && typeof refreshPayload.token === "string"
    ? refreshPayload.token
    : loginToken
}

export const createCustomerIdentity = async ({
  email,
  password,
  wholesale,
}: Pick<ParsedRegisterPayload, "email" | "password" | "wholesale">) => {
  const registerResponse = await fetch(
    buildMedusaUrl("/auth/customer/emailpass/register"),
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

  if (!loginResponse.ok) {
    return {
      error: await buildErrorResponse(loginResponse),
      token: null,
    }
  }

  const loginPayload = await parseResponseJson(loginResponse)
  const loginToken =
    loginPayload && typeof loginPayload.token === "string"
      ? loginPayload.token
      : null

  if (!loginToken) {
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

const buildCustomerProfile = ({
  email,
  firstName,
  lastName,
  wholesale,
}: Omit<ParsedRegisterPayload, "password">): HttpTypes.StoreCreateCustomer => ({
  email,
  ...(firstName === undefined ? {} : { first_name: firstName }),
  ...(lastName === undefined ? {} : { last_name: lastName }),
  ...(wholesale
    ? {
        company_name: wholesale.companyName,
        metadata: {
          company_identifier: wholesale.companyIdentifier,
        },
      }
    : {}),
})

export const createCustomerProfile = async ({
  loginToken,
  payload,
}: {
  loginToken: string
  payload: Omit<ParsedRegisterPayload, "password">
}) => {
  const createCustomerResponse = await fetch(
    buildMedusaUrl("/store/customers"),
    {
      body: JSON.stringify(buildCustomerProfile(payload)),
      cache: "no-store",
      headers: {
        authorization: `Bearer ${loginToken}`,
        "content-type": "application/json",
        ...getPublishableHeaders(),
      },
      method: "POST",
    },
  )

  const customerConflict = isConflictStatus(createCustomerResponse.status)
  return createCustomerResponse.ok || customerConflict
    ? null
    : await buildErrorResponse(createCustomerResponse)
}

export const createWholesaleProfile = async ({
  email,
  sessionToken,
  wholesale,
}: {
  email: string
  sessionToken: string
  wholesale: ParsedWholesaleRegistration | null
}) =>
  wholesale
    ? await createWholesaleCompanyRequest({
        email,
        token: sessionToken,
        wholesale,
      })
    : null
