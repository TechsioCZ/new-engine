import { normalizeCountryCode } from "../../utils/country-code"

export type ProductSalesRegionsResponse = {
  product: {
    id: string
    sales_channels: { id: string; name?: string | null }[]
  }
  country_rates: {
    country_code: string
    rate: number
    tax_rate_id?: string
    tax_rate_name?: string | null
    tax_region_id: string
  }[]
}

export type RegionCountry = {
  iso_2?: string | null
  iso_3?: string | null
  display_name?: string | null
  name?: string | null
}

export type AdminRegionWithCountries = {
  id: string
  name: string
  countries?: RegionCountry[]
}

const REGION_PRIORITY = ["sk", "cz"]

export function formatPercent(rate: number, locale: string) {
  return `${new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(rate) ? 0 : 2,
  }).format(rate)}%`
}

export function getCountryName(
  country: RegionCountry | undefined,
  countryCode: string,
  locale: string
) {
  const explicitName = country?.display_name ?? country?.name

  if (explicitName) {
    return explicitName
  }

  try {
    return (
      new Intl.DisplayNames(locale, { type: "region" }).of(
        countryCode.toUpperCase()
      ) ?? countryCode.toUpperCase()
    )
  } catch {
    return countryCode.toUpperCase()
  }
}

export function getCountriesByCode(regions: AdminRegionWithCountries[] = []) {
  const countriesByCode = new Map<string, RegionCountry>()

  for (const region of regions) {
    for (const country of region.countries ?? []) {
      const countryCode = normalizeCountryCode(country.iso_2)

      if (countryCode) {
        countriesByCode.set(countryCode, country)
      }
    }
  }

  return countriesByCode
}

export function sortSalesRegionRows<
  TRow extends { country_code: string; countryName: string },
>(first: TRow, second: TRow) {
  const firstPriority = REGION_PRIORITY.indexOf(first.country_code)
  const secondPriority = REGION_PRIORITY.indexOf(second.country_code)

  if (firstPriority !== -1 || secondPriority !== -1) {
    return (
      (firstPriority === -1 ? REGION_PRIORITY.length : firstPriority) -
      (secondPriority === -1 ? REGION_PRIORITY.length : secondPriority)
    )
  }

  return first.countryName.localeCompare(second.countryName)
}

export function getSalesRegionRows(
  data: ProductSalesRegionsResponse | undefined,
  countriesByCode: Map<string, RegionCountry>,
  locale: string
) {
  const availableCountryCodes = new Set(countriesByCode.keys())

  return (data?.country_rates ?? [])
    .filter(
      ({ country_code }) =>
        availableCountryCodes.size === 0 ||
        availableCountryCodes.has(country_code)
    )
    .map((countryRate) => ({
      ...countryRate,
      countryName: getCountryName(
        countriesByCode.get(countryRate.country_code),
        countryRate.country_code,
        locale
      ),
    }))
    .sort(sortSalesRegionRows)
}
