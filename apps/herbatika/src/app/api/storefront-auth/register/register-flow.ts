import type { HttpTypes } from "@medusajs/types"

import {
  buildErrorResponse,
  buildMedusaUrl,
  getPublishableHeaders,
} from "../auth-route-utils"
import { createWholesaleCompanyRequest } from "./wholesale"
import type { ParsedWholesaleRegistration } from "./wholesale"

export interface ParsedRegisterPayload {
  email: string
  password: string
  firstName?: string
  lastName?: string
  wholesale: ParsedWholesaleRegistration | null
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

  return createCustomerResponse.ok
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
