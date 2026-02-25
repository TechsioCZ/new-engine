import { MedusaError } from "@medusajs/framework/utils"
import { isRecord } from "../../utils/type-guards"
import type {
  AresEconomicSubject,
  MojeDaneStatusResponse,
  TaxReliabilityResult,
  ViesCheckVatResponse,
  ViesCheckVatResult,
} from "./types"
import { VAT_ID_REGEX, VAT_ID_REGEX_MESSAGE } from "./constants"

const DIC_DIGITS_REGEX = /^\d{1,10}$/
const MOJE_DANE_MAX_DEPTH = 6
const VIES_GROUP_REGISTRATION_NAME =
  "GROUP REGISTRATION - THIS VAT ID CORRESPONDS TO A GROUP OF TAXPAYERS"
const WHITESPACE_REGEX = /\s+/g

export function parseVatIdentificationNumber(value: string): {
  countryCode: string
  vatNumber: string
} {
  const normalized = value?.trim().toUpperCase()

  if (!normalized || !VAT_ID_REGEX.test(normalized)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      VAT_ID_REGEX_MESSAGE
    )
  }

  return {
    countryCode: normalized.slice(0, 2),
    vatNumber: normalized.slice(2),
  }
}

export function resolveAresSubjectVatIdentificationNumber(
  subject: Pick<AresEconomicSubject, "dic" | "dicSkDph">
): string | null {
  const preferredVatIdentificationNumber =
    subject.dicSkDph ?? subject.dic
  const normalizedVatIdentificationNumber = preferredVatIdentificationNumber
    ?.trim()
    .toUpperCase()

  return normalizedVatIdentificationNumber || null
}

export function normalizeDicDigits(value: string): string {
  const normalized = value?.trim().toUpperCase()
  if (!normalized) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "DIC value is required"
    )
  }

  const digits = normalized.startsWith("CZ")
    ? normalized.slice(2)
    : normalized

  if (!DIC_DIGITS_REGEX.test(digits)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "DIC must be 1 to 10 digits"
    )
  }

  return digits
}

export function extractMojeDaneStatusPayload(
  value: unknown,
  depth = 0
): Record<string, unknown> | null {
  if (depth > MOJE_DANE_MAX_DEPTH) {
    return null
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = extractMojeDaneStatusPayload(entry, depth + 1)
      if (found) {
        return found
      }
    }
    return null
  }

  if (!isRecord(value)) {
    return null
  }

  if ("nespolehlivyPlatce" in value) {
    return value
  }

  for (const entry of Object.values(value)) {
    const found = extractMojeDaneStatusPayload(entry, depth + 1)
    if (found) {
      return found
    }
  }

  return null
}

export function mapMojeDaneStatus(
  response: MojeDaneStatusResponse
): TaxReliabilityResult {
  let reliable: boolean | null

  switch (response.nespolehlivyPlatce) {
    case "ANO":
      reliable = false
      break
    case "NE":
      reliable = true
      break
    case "NENALEZEN":
      reliable = null
      break
    default:
      reliable = null
      break
  }

  return {
    reliable,
    unreliable_published_at:
      reliable === false ? response.datumZverejneniNespolehlivosti ?? null : null,
    subject_type: reliable === null ? null : response.typSubjektu ?? null,
  }
}

export function mapViesResponse(
  response: ViesCheckVatResponse
): ViesCheckVatResult {
  const isGroupRegistration =
    response.valid && isViesGroupRegistrationName(response.name)
  const normalizedName = response.name?.trim() || null
  const normalizedAddress = response.address?.trim() || null

  return {
    valid: response.valid,
    name: isGroupRegistration ? null : normalizedName,
    address: isGroupRegistration ? null : normalizedAddress,
    is_group_registration: isGroupRegistration,
    request_date: response.requestDate ?? null,
    request_identifier: response.requestIdentifier ?? null,
    trader_name_match: response.traderNameMatch ?? null,
    trader_address_match: response.traderAddressMatch ?? null,
    trader_company_type_match: response.traderCompanyTypeMatch ?? null,
    trader_street_match: response.traderStreetMatch ?? null,
    trader_postal_code_match: response.traderPostalCodeMatch ?? null,
    trader_city_match: response.traderCityMatch ?? null,
  }
}

export function isViesGroupRegistrationName(
  value: string | null | undefined
): boolean {
  const normalized = value?.trim()
  if (!normalized) {
    return false
  }

  return (
    normalized.replace(WHITESPACE_REGEX, " ").toUpperCase() ===
    VIES_GROUP_REGISTRATION_NAME
  )
}
