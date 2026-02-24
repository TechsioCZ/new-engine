import * as isoCountries from "i18n-iso-countries"
import { MedusaError } from "@medusajs/framework/utils"
import { countryLocaleDataMap } from "./country-locale-data-map"

export const toTrimmedOrNull = (value: string): string | null => {
  const trimmedValue = value.trim()
  return trimmedValue.length > 0 ? trimmedValue : null
}

export const isDefined = <T,>(value: T | null | undefined): value is T =>
  value !== null && value !== undefined

const ensureLocaleRegistered = (locale: string): void => {
  if (isoCountries.langs().includes(locale)) {
    return
  }

  const localeData = countryLocaleDataMap[
    locale
  ] as Parameters<typeof isoCountries.registerLocale>[0] | undefined
  if (!localeData) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Unsupported locale for country lookup: "${locale}"`
    )
  }

  isoCountries.registerLocale(localeData)
}

/**
 * Normalizes company-info country input to ISO alpha-2 lowercase (e.g. "CZ" -> "cz").
 *
 * Why this works this way:
 * - Upstream data can contain either alpha-2 codes or localized country names.
 * - We fast-path valid alpha-2 codes to avoid locale dependency when not needed.
 * - For localized names, we resolve through `i18n-iso-countries` and require explicit
 *   locale registration so behavior is deterministic across supported locales.
 * - Unsupported locales throw a Medusa INVALID_DATA error instead of returning
 *   a silent `undefined`, which makes integration failures visible and debuggable.
 */
export const normalizeCountryFromCompanyInfo = (
  countryValue: string | null | undefined,
  locale: string
): string | undefined => {
  if (!countryValue) {
    return undefined
  }

  const raw = countryValue.trim()
  if (!raw) {
    return undefined
  }

  const lower = raw.toLowerCase()

  if (/^[a-z]{2}$/.test(lower)) {
    return isoCountries.alpha2ToAlpha3(lower.toUpperCase()) ? lower : undefined
  }

  const normalizedLocale = locale.trim().toLowerCase()
  ensureLocaleRegistered(normalizedLocale)

  return isoCountries.getAlpha2Code(raw, normalizedLocale)?.toLowerCase()
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
