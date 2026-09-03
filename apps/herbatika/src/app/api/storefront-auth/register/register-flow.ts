import type { HttpTypes } from "@medusajs/types"
import type { RegistrationTermsVersion } from "@/lib/auth/registration-policy"
import type { MarketRuntimeBinding } from "@/lib/market/market-runtime"
import type { HerbatikaMarketCode } from "@/lib/storefront/market-context"
import {
  buildErrorResponse,
  buildMedusaUrl,
  conflict,
  getPublishableHeaders,
  isConflictStatus,
  parseResponseJson,
  type StorefrontAuthMessages,
  serverError,
} from "../_lib"
import {
  createWholesaleCompanyRequest,
  type ParsedWholesaleRegistration,
} from "./wholesale"

export type ParsedRegisterPayload = {
  email: string
  password: string
  firstName?: string
  lastName?: string
  termsAcceptance: {
    acceptedAt: string
    version: RegistrationTermsVersion
  }
  wholesale: ParsedWholesaleRegistration | null
}

export const refreshCustomerToken = async (loginToken: string) => {
  const refreshResponse = await fetch(buildMedusaUrl("/auth/token/refresh"), {
    method: "POST",
    headers: {
      authorization: `Bearer ${loginToken}`,
    },
    cache: "no-store",
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
  messages,
  password,
  wholesale,
}: Pick<ParsedRegisterPayload, "email" | "password" | "wholesale"> & {
  messages: StorefrontAuthMessages
}) => {
  const registerResponse = await fetch(
    buildMedusaUrl("/auth/customer/emailpass/register"),
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

  const registerConflict = isConflictStatus(registerResponse.status)
  if (!(registerResponse.ok || registerConflict)) {
    return buildErrorResponse(
      registerResponse,
      messages,
      messages.registrationFailed
    )
  }

  if (registerConflict && wholesale) {
    return conflict(messages.wholesaleConflict)
  }

  return null
}

export const loginCustomerIdentity = async ({
  email,
  messages,
  password,
}: Pick<ParsedRegisterPayload, "email" | "password"> & {
  messages: StorefrontAuthMessages
}) => {
  const loginResponse = await fetch(
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

  if (!loginResponse.ok) {
    return {
      error: await buildErrorResponse(
        loginResponse,
        messages,
        messages.registrationFailed
      ),
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
      error: serverError(messages.customerLoginTokenMissing),
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
  marketCode,
  termsAcceptance,
  wholesale,
}: Omit<ParsedRegisterPayload, "password"> & {
  marketCode: HerbatikaMarketCode
}): HttpTypes.StoreCreateCustomer => ({
  email,
  first_name: firstName,
  last_name: lastName,
  metadata: {
    storefront_market_code: marketCode,
    registration_terms_accepted_at: termsAcceptance.acceptedAt,
    registration_terms_version: termsAcceptance.version,
    ...(wholesale ? { company_identifier: wholesale.companyIdentifier } : {}),
  },
  ...(wholesale
    ? {
        company_name: wholesale.companyName,
      }
    : {}),
})

export const createCustomerProfile = async ({
  binding,
  loginToken,
  messages,
  payload,
}: {
  binding: MarketRuntimeBinding
  loginToken: string
  messages: StorefrontAuthMessages
  payload: Omit<ParsedRegisterPayload, "password"> & {
    marketCode: HerbatikaMarketCode
  }
}) => {
  const createCustomerResponse = await fetch(
    buildMedusaUrl("/store/customers"),
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${loginToken}`,
        ...getPublishableHeaders(binding),
      },
      body: JSON.stringify(buildCustomerProfile(payload)),
      cache: "no-store",
    }
  )

  if (createCustomerResponse.ok) {
    return null
  }

  return buildErrorResponse(
    createCustomerResponse,
    messages,
    messages.registrationFailed
  )
}

export const createWholesaleProfile = async ({
  binding,
  email,
  messages,
  sessionToken,
  wholesale,
}: {
  binding: MarketRuntimeBinding
  email: string
  messages: StorefrontAuthMessages
  sessionToken: string
  wholesale: ParsedWholesaleRegistration | null
}) =>
  wholesale
    ? createWholesaleCompanyRequest({
        binding,
        email,
        messages,
        token: sessionToken,
        wholesale,
      })
    : null
