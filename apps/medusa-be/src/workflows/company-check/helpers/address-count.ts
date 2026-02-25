import type { AresStandardizedAddress } from "../../../modules/company-check/types"

const STANDARDIZED_ADDRESS_FILTER_KEYS = [
  "kodAdresnihoMista",
  "kodObce",
  "kodUlice",
  "kodCastiObce",
  "kodMestskeCastiObvodu",
  "kodKraje",
  "kodOkresu",
  "kodSpravnihoObvodu",
  "kodStatu",
  "cisloDomovni",
] as const

export type CompanyCheckCzAddressCountWorkflowInput = {
  street: string
  city: string
}

export type AddressCountWorkflowState = {
  street: string
  city: string
  textAddress: string
  sidloFilter: Record<string, unknown> | null
}

type AresAddressStandardizationType =
  | "UPLNA_STANDARDIZACE"
  | "VYHOVUJICI_ADRESY"

const DEFAULT_ARES_ADDRESS_STANDARDIZATION_TYPE: AresAddressStandardizationType =
  "VYHOVUJICI_ADRESY"

type ParsedStreetAddress = {
  streetName: string
  houseNumber: number | null
  orientationNumber: number | null
  orientationLetter: string | null
}

// hasValue intentionally treats `0` as present because ARES codes (e.g., `kodObce`) may be zero.
function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false
  }

  if (typeof value === "string") {
    return value.trim().length > 0
  }

  return true
}

export function buildTextAddress(input: {
  street: string
  city: string
}): string {
  return [input.street, input.city]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .join(", ")
}

function parseStreetAddress(street: string): ParsedStreetAddress {
  const normalizedStreet = street.trim().replace(/\s+/g, " ")
  const match = normalizedStreet.match(
    /^(.*\S)\s+(\d+)(?:\/(\d+))?([A-Za-z])?$/u
  )

  if (!match) {
    return {
      streetName: normalizedStreet,
      houseNumber: null,
      orientationNumber: null,
      orientationLetter: null,
    }
  }

  const streetName = match[1]?.trim()
  const houseNumber = match[2]
  const orientationNumber = match[3]
  const orientationLetter = match[4]

  // Defensive guard for TypeScript and unexpected regexp edge-cases.
  if (!streetName || !houseNumber) {
    return {
      streetName: normalizedStreet,
      houseNumber: null,
      orientationNumber: null,
      orientationLetter: null,
    }
  }

  return {
    streetName,
    houseNumber: Number(houseNumber),
    orientationNumber: orientationNumber ? Number(orientationNumber) : null,
    orientationLetter: orientationLetter ?? null,
  }
}

/**
 * ARES address standardization accepts top-level structured fields.
 * We prefer structured components over `textovaAdresa`, which proved more
 * reliable for this endpoint.
 */
export function buildAresStandardizationPayload(input: {
  street: string
  city: string
}): Record<string, unknown> {
  const parsedStreet = parseStreetAddress(input.street)
  const payload: Record<string, unknown> = {
    typStandardizaceAdresy: DEFAULT_ARES_ADDRESS_STANDARDIZATION_TYPE,
    nazevObce: input.city,
    nazevUlice: parsedStreet.streetName,
  }

  if (parsedStreet.houseNumber !== null) {
    payload.cisloDomovni = parsedStreet.houseNumber
  }

  if (parsedStreet.orientationNumber !== null) {
    payload.cisloOrientacni = parsedStreet.orientationNumber
  }

  if (parsedStreet.orientationLetter) {
    payload.cisloOrientacniPismeno = parsedStreet.orientationLetter
  }

  return payload
}

export function buildSidloFilterFromStandardizedAddress(
  address: AresStandardizedAddress | null | undefined
): Record<string, unknown> | null {
  if (!address) {
    return null
  }

  const sidloFilter: Record<string, unknown> = {}

  for (const key of STANDARDIZED_ADDRESS_FILTER_KEYS) {
    const value: unknown = address[key]
    if (hasValue(value)) {
      sidloFilter[key] = value
    }
  }

  return Object.keys(sidloFilter).length > 0 ? sidloFilter : null
}
