import type { HttpTypes } from "@medusajs/types"
import type { HerbatikaMarketCode } from "@/lib/storefront/market-context"
import {
  buildErrorResponse,
  buildMedusaUrl,
  conflict,
  getPublishableHeaders,
  isConflictStatus,
  parseResponseJson,
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
  wholesale: ParsedWholesaleRegistration | null
}

export type RegistrationMarketContext = {
  marketCode: HerbatikaMarketCode
  regionId: string
  salesChannelId: string
  storefrontNamespace: string
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
  password,
  wholesale,
}: Pick<ParsedRegisterPayload, "email" | "password" | "wholesale">) => {
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
    return buildErrorResponse(registerResponse)
  }

  if (registerConflict && wholesale) {
    return conflict(
      "Účet s týmto e-mailom už existuje. Prihláste sa a požiadajte o VO účet cez podporu."
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
        "Prihlásenie zákazníka prebehlo úspešne, ale token nebol vrátený."
      ),
      token: null,
    }
  }

  return {
    error: null,
    token: loginToken,
  }
}

export const buildCustomerProfile = ({
  email,
  firstName,
  lastName,
  marketContext,
  wholesale,
}: Omit<ParsedRegisterPayload, "password"> & {
  marketContext: RegistrationMarketContext
}): HttpTypes.StoreCreateCustomer => ({
  email,
  first_name: firstName,
  last_name: lastName,
  metadata: {
    storefront_market_code: marketContext.marketCode,
    storefront_region_id: marketContext.regionId,
    storefront_sales_channel_id: marketContext.salesChannelId,
    storefront_shop_namespace: marketContext.storefrontNamespace,
    ...(wholesale ? { company_identifier: wholesale.companyIdentifier } : {}),
  },
  ...(wholesale
    ? {
        company_name: wholesale.companyName,
      }
    : {}),
})

export const createCustomerProfile = async ({
  loginToken,
  marketContext,
  payload,
}: {
  loginToken: string
  marketContext: RegistrationMarketContext
  payload: Omit<ParsedRegisterPayload, "password">
}) => {
  const createCustomerResponse = await fetch(
    buildMedusaUrl("/store/customers"),
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${loginToken}`,
        ...getPublishableHeaders(),
      },
      body: JSON.stringify(buildCustomerProfile({ ...payload, marketContext })),
      cache: "no-store",
    }
  )

  if (createCustomerResponse.ok) {
    return null
  }

  return buildErrorResponse(createCustomerResponse)
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
    ? createWholesaleCompanyRequest({
        email,
        token: sessionToken,
        wholesale,
      })
    : null
