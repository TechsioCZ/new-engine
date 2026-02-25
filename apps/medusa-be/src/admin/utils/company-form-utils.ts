export const toTrimmedOrNull = (value: string): string | null => {
  const trimmedValue = value.trim()
  return trimmedValue.length > 0 ? trimmedValue : null
}

export const isDefined = <T,>(value: T | null | undefined): value is T =>
  value !== null && value !== undefined

/**
 * Normalizes company-info country code input to ISO alpha-2 lowercase (e.g. "CZ" -> "cz").
 *
 * Why this works this way:
 * - ARES now provides country code directly, so we only accept canonical alpha-2 values.
 * - Returning `undefined` for non alpha-2 input prevents silently saving bad country data.
 */
export const normalizeCountryCodeFromCompanyInfo = (
  countryCodeValue: string | null | undefined
): string | undefined => {
  if (!countryCodeValue) {
    return undefined
  }

  const raw = countryCodeValue.trim()
  if (!raw) {
    return undefined
  }

  const lower = raw.toLowerCase()

  return /^[a-z]{2}$/.test(lower) ? lower : undefined
}

/**
 * Resolves currency from country using Medusa regions as the source of truth.
 *
 * Why this works this way:
 * - Currency assignment in this app is region-driven, not hardcoded per country.
 * - A static ISO-country -> currency map could drift from actual store configuration.
 * - Matching against loaded regions guarantees we pick the currency currently
 *   configured for checkout/tax/shipping behavior.
 */
export const resolveCurrencyFromCountry = (
  countryIso2: string | undefined,
  regions:
    | Array<{
        currency_code?: string | null
        countries?:
          | Array<{
              iso_2?: string | null
            }>
          | null
      }>
    | undefined
): string | undefined => {
  if (!countryIso2) {
    return undefined
  }

  const normalizedCountry = countryIso2.toLowerCase()

  const matchedRegion = regions?.find((region) =>
    region.countries?.some(
      (country) => country?.iso_2?.toLowerCase() === normalizedCountry
    )
  )

  return matchedRegion?.currency_code ?? undefined
}

export const buildCompanyInfoLookupQuery = (formData: {
  company_identification_number?: string | null
  vat_identification_number?: string | null
  name?: string | null
}):
  | {
      vat_identification_number?: string
      company_identification_number?: string
      company_name?: string
    }
  | undefined => {
  const companyIdentificationNumber = formData.company_identification_number
    ?.trim()
    .replace(/\s+/g, "")

  if (companyIdentificationNumber) {
    return {
      company_identification_number: companyIdentificationNumber,
    }
  }

  const vatIdentificationNumber = formData.vat_identification_number
    ?.trim()
    .toUpperCase()
  if (vatIdentificationNumber) {
    return {
      vat_identification_number: vatIdentificationNumber,
    }
  }

  const companyName = formData.name?.trim()
  if (companyName) {
    return {
      company_name: companyName,
    }
  }

  return undefined
}
