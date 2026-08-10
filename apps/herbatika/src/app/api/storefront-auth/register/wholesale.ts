import { getRecordValue } from "@techsio/std/object"
import type { NextResponse } from "next/server"

import { normalizeCountryCode } from "@/lib/forms/country-options"

import {
  badRequest,
  buildErrorResponse,
  buildMedusaUrl,
  getPublishableHeaders,
  isConflictStatus,
} from "../auth-route-utils"
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

const hasRequiredAddressFields = (
  fields: (string | undefined)[],
): fields is [string, string, string, string] =>
  fields.every((field) => field !== undefined)

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

  const companyName = asStringOrUndefined(
    getRecordValue(wholesale, "company_name"),
  )
  if (companyName === undefined) {
    return {
      error: badRequest("Názov firmy je povinný."),
      value: null,
    }
  }

  const companyIdentifier = asStringOrUndefined(
    getRecordValue(wholesale, "company_identifier"),
  )
  if (companyIdentifier === undefined) {
    return {
      error: badRequest("IČO alebo firemný identifikátor je povinný."),
      value: null,
    }
  }

  const billingAddress = asRecordOrUndefined(
    getRecordValue(wholesale, "billing_address"),
  )
  if (!billingAddress) {
    return {
      error: badRequest("Fakturačná adresa je povinná."),
      value: null,
    }
  }

  const requiredAddressFields = [
    asStringOrUndefined(getRecordValue(billingAddress, "address_1")),
    asStringOrUndefined(getRecordValue(billingAddress, "city")),
    asStringOrUndefined(getRecordValue(billingAddress, "postal_code")),
    asStringOrUndefined(getRecordValue(billingAddress, "country_code")),
  ]
  if (!hasRequiredAddressFields(requiredAddressFields)) {
    return {
      error: badRequest("Fakturačná adresa je povinná."),
      value: null,
    }
  }

  const [address1, city, postalCode, rawCountryCode] = requiredAddressFields
  const countryCode = normalizeCountryCode(rawCountryCode)
  if (countryCode === null) {
    return {
      error: badRequest("Vyberte platnú krajinu fakturačnej adresy."),
      value: null,
    }
  }

  const address2 = asStringOrUndefined(
    getRecordValue(billingAddress, "address_2"),
  )

  return {
    error: null,
    value: {
      billingAddress: {
        address1,
        ...(address2 === undefined ? {} : { address2 }),
        city,
        countryCode: countryCode.toUpperCase(),
        postalCode,
      },
      companyIdentifier,
      companyName,
      currencyCode:
        asStringOrUndefined(
          getRecordValue(wholesale, "currency_code"),
        )?.toUpperCase() ?? "EUR",
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
      address: createCompanyAddressLine(wholesale.billingAddress),
      city: wholesale.billingAddress.city,
      country: wholesale.billingAddress.countryCode.toLowerCase(),
      currency_code: wholesale.currencyCode.toLowerCase(),
      email,
      name: wholesale.companyName,
      zip: wholesale.billingAddress.postalCode,
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
