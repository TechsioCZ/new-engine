import type { HttpTypes } from "@medusajs/types"
import type { SelectItem } from "@techsio/ui-kit/molecules/select"

const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/

export const COUNTRY_SELECT_ITEMS: SelectItem[] = [
  { value: "SK", label: "Slovensko" },
  { value: "CZ", label: "Česko" },
  { value: "AT", label: "Rakúsko" },
  { value: "HU", label: "Maďarsko" },
]

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

  if (
    normalizedActiveCountryCode &&
    (regionCountryCodes.size === 0 ||
      regionCountryCodes.has(normalizedActiveCountryCode))
  ) {
    return new Set([normalizedActiveCountryCode])
  }

  return regionCountryCodes
}

export const resolveCountryItemsForRegion = ({
  activeCountryCode,
  regionId,
  regions,
}: Pick<
  CountryRegionInput,
  "activeCountryCode" | "regionId" | "regions"
>): SelectItem[] => {
  const countryCodes = resolveCountryCodes({
    activeCountryCode,
    regionId,
    regions,
  })

  if (countryCodes.size === 0) {
    return COUNTRY_SELECT_ITEMS
  }

  const regionItems = COUNTRY_SELECT_ITEMS.filter((item) =>
    countryCodes.has(normalizeCountryCode(item.value) ?? "")
  )

  return regionItems.length > 0 ? regionItems : COUNTRY_SELECT_ITEMS
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
