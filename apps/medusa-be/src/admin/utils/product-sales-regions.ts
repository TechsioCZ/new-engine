import { normalizeCountryCode } from "../../utils/country-code"

export interface ProductSalesRegionsResponse {
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

export interface RegionCountry {
  iso_2?: string | null
  iso_3?: string | null
  display_name?: string | null
  name?: string | null
}

export interface AdminRegionWithCountries {
  id: string
  name: string
  countries?: RegionCountry[]
}

const REGION_PRIORITY = ["sk", "cz"]
const MAX_PERCENT_FORMATTERS = 32
const PERCENT_FORMATTERS = new Map<string, Intl.NumberFormat>()

const getPercentFormatter = (locale: string, minimumFractionDigits: number) => {
  const cacheKey = JSON.stringify([locale, minimumFractionDigits])
  const cachedFormatter = PERCENT_FORMATTERS.get(cacheKey)
  if (cachedFormatter !== undefined) {
    PERCENT_FORMATTERS.delete(cacheKey)
    PERCENT_FORMATTERS.set(cacheKey, cachedFormatter)
    return cachedFormatter
  }

  const formatter = Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
    minimumFractionDigits,
  })
  if (PERCENT_FORMATTERS.size >= MAX_PERCENT_FORMATTERS) {
    const oldestKey = PERCENT_FORMATTERS.keys().next().value
    if (oldestKey !== undefined) {
      PERCENT_FORMATTERS.delete(oldestKey)
    }
  }
  PERCENT_FORMATTERS.set(cacheKey, formatter)
  return formatter
}

export const formatPercent = (rate: number, locale: string) =>
  `${getPercentFormatter(locale, Number.isInteger(rate) ? 0 : 2).format(rate)}%`

export const getCountryName = (
  country: RegionCountry | undefined,
  countryCode: string,
  locale: string,
) => {
  const explicitName = country?.display_name ?? country?.name

  if (
    explicitName !== undefined &&
    explicitName !== null &&
    explicitName !== ""
  ) {
    return explicitName
  }

  try {
    return (
      new Intl.DisplayNames(locale, { type: "region" }).of(
        countryCode.toUpperCase(),
      ) ?? countryCode.toUpperCase()
    )
  } catch {
    return countryCode.toUpperCase()
  }
}

export const getCountriesByCode = (
  regions: AdminRegionWithCountries[] = [],
) => {
  const countriesByCode = new Map<string, RegionCountry>()

  for (const region of regions) {
    for (const country of region.countries ?? []) {
      const countryCode = normalizeCountryCode(country.iso_2)

      if (typeof countryCode === "string") {
        countriesByCode.set(countryCode, country)
      }
    }
  }

  return countriesByCode
}

type SalesRegionRow = ProductSalesRegionsResponse["country_rates"][number] & {
  countryName: string
}

export const sortSalesRegionRows = <
  TRow extends { country_code: string; countryName: string },
>(
  first: TRow,
  second: TRow,
) => {
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

export const getSalesRegionRows = (
  data: ProductSalesRegionsResponse | undefined,
  countriesByCode: Map<string, RegionCountry>,
  locale: string,
): SalesRegionRow[] => {
  const availableCountryCodes = new Set(countriesByCode.keys())

  const rows: SalesRegionRow[] = (data?.country_rates ?? []).flatMap(
    (countryRate) =>
      availableCountryCodes.size === 0 ||
      availableCountryCodes.has(countryRate.country_code)
        ? [
            {
              ...countryRate,
              countryName: getCountryName(
                countriesByCode.get(countryRate.country_code),
                countryRate.country_code,
                locale,
              ),
            },
          ]
        : [],
  )

  const sortedRows: SalesRegionRow[] = []
  for (const row of rows) {
    const insertionIndex = sortedRows.findIndex(
      (sortedRow) => sortSalesRegionRows(row, sortedRow) < 0,
    )
    if (insertionIndex === -1) {
      sortedRows.push(row)
    } else {
      sortedRows.splice(insertionIndex, 0, row)
    }
  }
  return sortedRows
}
