import type { NextResponse } from "next/server"
import { normalizeCountryCode } from "@/lib/forms/country-options"
import type { MarketRuntimeBinding } from "@/lib/market/market-runtime"
import {
  badRequest,
  buildErrorResponse,
  buildMedusaUrl,
  getPublishableHeaders,
  isConflictStatus,
  type StorefrontAuthMessages,
} from "../_lib"
import { asRecordOrUndefined, asStringOrUndefined } from "./parse-utils"

export type ParsedWholesaleRegistration = {
  companyName: string
  companyIdentifier: string
  currencyCode: string
  billingAddress: {
    address1: string
    address2?: string
    city: string
    postalCode: string
    countryCode: string
  }
}

type WholesaleParseResult = {
  error: NextResponse | null
  value: ParsedWholesaleRegistration | null
}

export const parseWholesaleRegistration = (
  value: unknown,
  {
    currencyCode,
    messages,
  }: {
    currencyCode: string
    messages: StorefrontAuthMessages
  }
): WholesaleParseResult => {
  if (value === undefined || value === null) {
    return { error: null, value: null }
  }

  const wholesale = asRecordOrUndefined(value)
  if (!wholesale) {
    return {
      error: badRequest(messages.wholesaleDataInvalid),
      value: null,
    }
  }

  const companyName = asStringOrUndefined(wholesale.company_name)
  if (!companyName) {
    return {
      error: badRequest(messages.wholesaleCompanyNameRequired),
      value: null,
    }
  }

  const companyIdentifier = asStringOrUndefined(wholesale.company_identifier)
  if (!companyIdentifier) {
    return {
      error: badRequest(messages.wholesaleCompanyIdentifierRequired),
      value: null,
    }
  }

  const billingAddress = asRecordOrUndefined(wholesale.billing_address)
  if (!billingAddress) {
    return {
      error: badRequest(messages.wholesaleBillingAddressRequired),
      value: null,
    }
  }

  const address1 = asStringOrUndefined(billingAddress.address_1)
  const city = asStringOrUndefined(billingAddress.city)
  const postalCode = asStringOrUndefined(billingAddress.postal_code)
  const rawCountryCode = asStringOrUndefined(billingAddress.country_code)

  if (!(address1 && city && postalCode && rawCountryCode)) {
    return {
      error: badRequest(messages.wholesaleBillingAddressRequired),
      value: null,
    }
  }

  const countryCode = normalizeCountryCode(rawCountryCode)
  if (!countryCode) {
    return {
      error: badRequest(messages.invalidBillingAddressCountry),
      value: null,
    }
  }

  return {
    error: null,
    value: {
      companyName,
      companyIdentifier,
      currencyCode,
      billingAddress: {
        address1,
        address2: asStringOrUndefined(billingAddress.address_2),
        city,
        postalCode,
        countryCode: countryCode.toUpperCase(),
      },
    },
  }
}

const createCompanyAddressLine = ({
  address1,
  address2,
}: ParsedWholesaleRegistration["billingAddress"]) =>
  [address1, address2].filter(Boolean).join(", ")

export const createWholesaleCompanyRequest = async ({
  binding,
  email,
  token,
  wholesale,
  messages,
}: {
  binding: MarketRuntimeBinding
  email: string
  token: string
  wholesale: ParsedWholesaleRegistration
  messages: StorefrontAuthMessages
}) => {
  const response = await fetch(buildMedusaUrl("/store/companies"), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      ...getPublishableHeaders(binding),
    },
    body: JSON.stringify({
      name: wholesale.companyName,
      email,
      currency_code: wholesale.currencyCode.toLowerCase(),
      address: createCompanyAddressLine(wholesale.billingAddress),
      city: wholesale.billingAddress.city,
      zip: wholesale.billingAddress.postalCode,
      country: wholesale.billingAddress.countryCode.toLowerCase(),
    }),
    cache: "no-store",
  })

  return response.ok || isConflictStatus(response.status)
    ? null
    : buildErrorResponse(response, messages, messages.registrationFailed)
}
