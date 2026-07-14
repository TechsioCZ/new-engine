import type { HttpTypes } from "@medusajs/types"
import type { SelectItem } from "@techsio/ui-kit/molecules/select"

const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/

const countryDisplayNamesByLocale = new Map<string, Intl.DisplayNames>()

export type CountryRegionInput = {
  activeCountryCode?: string | null
  countryCode?: string | null
  regionId?: string | null
  regions: HttpTypes.StoreRegion[]
}

export const normalizeCountryCode = (
  countryCode: string | null | undefined
) => {
  const normalized = countryCode?.trim().toUpperCase()
  return normalized && COUNTRY_CODE_PATTERN.test(normalized) ? normalized : null
}

const getCountryDisplayNames = (locale: string) => {
  const existing = countryDisplayNamesByLocale.get(locale)

  if (existing) {
    return existing
  }

  const displayNames = new Intl.DisplayNames([locale], { type: "region" })
  countryDisplayNamesByLocale.set(locale, displayNames)
  return displayNames
}

export const resolveCountryDisplayName = (
  countryCode: string,
  locale: string
) => {
  const normalizedCountryCode = normalizeCountryCode(countryCode)

  if (!normalizedCountryCode) {
    return countryCode
  }

  return (
    getCountryDisplayNames(locale).of(normalizedCountryCode) ??
    normalizedCountryCode
  )
}

const findRegion = ({
  regionId,
  regions,
}: Pick<CountryRegionInput, "regionId" | "regions">) => {
  if (!regionId) {
    return null
  }

  return regions.find((region) => region.id === regionId) ?? null
}

const resolveRegionCountryCodes = (region: HttpTypes.StoreRegion | null) =>
  new Set(
    region?.countries
      ?.map((country) => normalizeCountryCode(country.iso_2))
      .filter((countryCode): countryCode is string => Boolean(countryCode)) ??
      []
  )

const resolveCountryCodes = ({
  activeCountryCode,
  regionId,
  regions,
}: Pick<CountryRegionInput, "activeCountryCode" | "regionId" | "regions">) => {
  const regionCountryCodes = resolveRegionCountryCodes(
    findRegion({ regionId, regions })
  )
  const normalizedActiveCountryCode = normalizeCountryCode(activeCountryCode)

  if (normalizedActiveCountryCode) {
    return new Set([normalizedActiveCountryCode])
  }

  return regionCountryCodes
}

export const resolveCountryItemsForRegion = ({
  activeCountryCode,
  locale,
  regionId,
  regions,
}: Pick<
  CountryRegionInput,
  "activeCountryCode" | "regionId" | "regions"
> & { locale: string }): SelectItem[] => {
  const countryCodes = resolveCountryCodes({
    activeCountryCode,
    regionId,
    regions,
  })

  return [...countryCodes].map((countryCode) => ({
    label: resolveCountryDisplayName(countryCode, locale),
    value: countryCode,
  }))
}

export const isCountryAvailableForRegion = ({
  activeCountryCode,
  countryCode,
  regionId,
  regions,
}: CountryRegionInput) => {
  const normalizedCountryCode = normalizeCountryCode(countryCode)
  const countryCodes = resolveCountryCodes({
    activeCountryCode,
    regionId,
    regions,
  })

  if (!normalizedCountryCode || countryCodes.size === 0) {
    return false
  }

  return countryCodes.has(normalizedCountryCode)
}
