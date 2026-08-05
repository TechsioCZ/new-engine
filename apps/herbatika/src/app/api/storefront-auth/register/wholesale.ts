import type { NextResponse } from "next/server"

import { normalizeCountryCode } from "@/lib/forms/country-options"

import {
  badRequest,
  buildErrorResponse,
  buildMedusaUrl,
  getPublishableHeaders,
  isConflictStatus,
} from "../_lib"
import { asRecordOrUndefined, asStringOrUndefined } from "./parse-utils"

export interface ParsedWholesaleRegistration {
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

interface WholesaleParseResult {
  error: NextResponse | null
  value: ParsedWholesaleRegistration | null
}

export const parseWholesaleRegistration = (
  value: unknown,
): WholesaleParseResult => {
  if (value === undefined || value === null) {
    return { error: null, value: null }
  }

  const wholesale = asRecordOrUndefined(value)
  if (!wholesale) {
    return {
      error: badRequest("Firemné údaje musia byť platný objekt."),
      value: null,
    }
  }

  const companyName = asStringOrUndefined(wholesale.company_name)
  if (!companyName) {
    return {
      error: badRequest("Názov firmy je povinný."),
      value: null,
    }
  }

  const companyIdentifier = asStringOrUndefined(wholesale.company_identifier)
  if (!companyIdentifier) {
    return {
      error: badRequest("IČO alebo firemný identifikátor je povinný."),
      value: null,
    }
  }

  const billingAddress = asRecordOrUndefined(wholesale.billing_address)
  if (!billingAddress) {
    return {
      error: badRequest("Fakturačná adresa je povinná."),
      value: null,
    }
  }

  const address1 = asStringOrUndefined(billingAddress.address_1)
  const city = asStringOrUndefined(billingAddress.city)
  const postalCode = asStringOrUndefined(billingAddress.postal_code)
  const rawCountryCode = asStringOrUndefined(billingAddress.country_code)

  if (!(address1 && city && postalCode && rawCountryCode)) {
    return {
      error: badRequest("Fakturačná adresa je povinná."),
      value: null,
    }
  }

  const countryCode = normalizeCountryCode(rawCountryCode)
  if (!countryCode) {
    return {
      error: badRequest("Vyberte platnú krajinu fakturačnej adresy."),
      value: null,
    }
  }

  const address2 = asStringOrUndefined(billingAddress.address_2)

  return {
    error: null,
    value: {
      billingAddress: {
        address1,
        ...(address2 === undefined ? {} : { address2 }),
        city,
        postalCode,
        countryCode: countryCode.toUpperCase(),
      },
      companyIdentifier,
      companyName,
      currencyCode:
        asStringOrUndefined(wholesale.currency_code)?.toUpperCase() ?? "EUR",
    },
  }
}

const createCompanyAddressLine = ({
  address1,
  address2,
}: ParsedWholesaleRegistration["billingAddress"]) =>
  [address1, address2].filter(Boolean).join(", ")

export const createWholesaleCompanyRequest = async ({
  email,
  token,
  wholesale,
}: {
  email: string
  token: string
  wholesale: ParsedWholesaleRegistration
}) => {
  const response = await fetch(buildMedusaUrl("/store/companies"), {
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
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...getPublishableHeaders(),
    },
    method: "POST",
  })

  return response.ok || isConflictStatus(response.status)
    ? null
    : await buildErrorResponse(response)
}
