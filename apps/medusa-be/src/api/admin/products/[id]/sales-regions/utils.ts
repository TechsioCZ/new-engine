import { normalizeCountryCode } from "../../../../../utils/country-code"

export type SalesRegionProduct = {
  id: string
  sales_channels?: { id: string; name?: string | null }[]
}

export type RegionCountry = {
  iso_2?: string | null
}

export type RegionWithCountries = {
  countries?: RegionCountry[]
}

export type TaxRateRule = {
  reference: string
  reference_id: string
  tax_rate_id: string
}

export type SalesRegionTaxRate = {
  id: string
  is_default?: boolean
  name?: string | null
  rate?: unknown
}

export function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string") {
    const parsed = Number(value)

    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return
}

export function isProductRule(rule: TaxRateRule, productId: string) {
  return rule.reference === "product" && rule.reference_id === productId
}

export function resolveEffectiveRate(
  regionRates: SalesRegionTaxRate[],
  rulesByRateId: Map<string, TaxRateRule[]>,
  productId: string
) {
  const productRate = regionRates.find((candidateRate) =>
    (rulesByRateId.get(candidateRate.id) ?? []).some((rule) =>
      isProductRule(rule, productId)
    )
  )
  const defaultRate = regionRates.find(
    (candidateRate) => candidateRate.is_default
  )
  const fallbackRate = regionRates.find(
    (candidateRate) => (rulesByRateId.get(candidateRate.id) ?? []).length === 0
  )
  const selectedRate = productRate ?? defaultRate ?? fallbackRate
  const rate = toNumber(selectedRate?.rate)

  return rate === undefined || !selectedRate
    ? undefined
    : { rate, taxRate: selectedRate }
}

export function getStringField(
  value: unknown,
  field: string
): string | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return
  }

  const fieldValue: unknown = Reflect.get(value, field)

  return typeof fieldValue === "string" ? fieldValue : undefined
}

export function getArrayField(value: unknown, field: string): unknown[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return []
  }

  const fieldValue: unknown = Reflect.get(value, field)

  return Array.isArray(fieldValue) ? fieldValue : []
}

export function isTaxRateRule(value: unknown): value is TaxRateRule {
  return Boolean(
    getStringField(value, "reference") &&
    getStringField(value, "reference_id") &&
    getStringField(value, "tax_rate_id")
  )
}

export function isRegionCountry(value: unknown): value is RegionCountry {
  return Boolean(normalizeCountryCode(getStringField(value, "iso_2")))
}

export function toRegionWithCountries(value: unknown): RegionWithCountries {
  return {
    countries: getArrayField(value, "countries").filter(isRegionCountry),
  }
}

export function toSalesRegionProduct(
  value: unknown
): SalesRegionProduct | undefined {
  const id = getStringField(value, "id")

  if (!id) {
    return
  }

  return {
    id,
    sales_channels: getArrayField(value, "sales_channels").flatMap(
      (salesChannel) => {
        const salesChannelId = getStringField(salesChannel, "id")

        if (!salesChannelId) {
          return []
        }

        return [
          {
            id: salesChannelId,
            name: getStringField(salesChannel, "name") ?? null,
          },
        ]
      }
    ),
  }
}

export function getRegionCountryCodes(regions: RegionWithCountries[]) {
  return [
    ...new Set(
      regions
        .flatMap((region) => region.countries ?? [])
        .map((country) => normalizeCountryCode(country.iso_2))
        .filter((countryCode): countryCode is string => Boolean(countryCode))
    ),
  ]
}
