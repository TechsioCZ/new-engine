import { normalizeCountryCode } from "../../../../../utils/country-code"

export interface SalesRegionProduct {
  id: string
  sales_channels?: { id: string; name?: string | null }[]
}

export interface RegionCountry {
  iso_2?: string | null
}

export interface RegionWithCountries {
  countries?: RegionCountry[]
}

export interface TaxRateRule {
  reference: string
  reference_id: string
  tax_rate_id: string
}

export interface SalesRegionTaxRate {
  id: string
  is_default?: boolean
  name?: string | null
  rate?: unknown
}

export const toNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string") {
    const parsed = Number(value)

    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return undefined
}

export const isProductRule = (rule: TaxRateRule, productId: string) =>
  rule.reference === "product" && rule.reference_id === productId

export const resolveEffectiveRate = (
  regionRates: SalesRegionTaxRate[],
  rulesByRateId: Map<string, TaxRateRule[]>,
  productId: string,
) => {
  const productRate = regionRates.find((candidateRate) =>
    (rulesByRateId.get(candidateRate.id) ?? []).some((rule) =>
      isProductRule(rule, productId),
    ),
  )
  const defaultRate = regionRates.find(
    (candidateRate) => candidateRate.is_default === true,
  )
  const fallbackRate = regionRates.find(
    (candidateRate) => (rulesByRateId.get(candidateRate.id) ?? []).length === 0,
  )
  const selectedRate = productRate ?? defaultRate ?? fallbackRate
  const rate = toNumber(selectedRate?.rate)

  return rate === undefined || selectedRate === undefined
    ? undefined
    : { rate, taxRate: selectedRate }
}

export const getStringField = (
  value: unknown,
  field: string,
): string | undefined => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return undefined
  }

  const fieldValue: unknown = Reflect.get(value, field)

  return typeof fieldValue === "string" ? fieldValue : undefined
}

export const getArrayField = (value: unknown, field: string): unknown[] => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return []
  }

  const fieldValue: unknown = Reflect.get(value, field)

  return Array.isArray(fieldValue) ? fieldValue : []
}

const isNonEmptyString = (value: string | undefined) =>
  value !== undefined && value.length > 0

export const isTaxRateRule = (value: unknown): value is TaxRateRule =>
  isNonEmptyString(getStringField(value, "reference")) &&
  isNonEmptyString(getStringField(value, "reference_id")) &&
  isNonEmptyString(getStringField(value, "tax_rate_id"))

export const isRegionCountry = (value: unknown): value is RegionCountry =>
  normalizeCountryCode(getStringField(value, "iso_2")) !== undefined

export const toRegionWithCountries = (value: unknown): RegionWithCountries => ({
  countries: getArrayField(value, "countries").filter(isRegionCountry),
})

export const toSalesRegionProduct = (
  value: unknown,
): SalesRegionProduct | undefined => {
  const id = getStringField(value, "id")

  if (id === undefined || id.length === 0) {
    return undefined
  }

  return {
    id,
    sales_channels: getArrayField(value, "sales_channels").flatMap(
      (salesChannel) => {
        const salesChannelId = getStringField(salesChannel, "id")

        if (salesChannelId === undefined || salesChannelId.length === 0) {
          return []
        }

        return [
          {
            id: salesChannelId,
            name: getStringField(salesChannel, "name") ?? null,
          },
        ]
      },
    ),
  }
}

export const getRegionCountryCodes = (regions: RegionWithCountries[]) => [
  ...new Set(
    regions.flatMap((region) =>
      (region.countries ?? []).flatMap((country) => {
        const countryCode = normalizeCountryCode(country.iso_2)
        return countryCode === undefined ? [] : [countryCode]
      }),
    ),
  ),
]
