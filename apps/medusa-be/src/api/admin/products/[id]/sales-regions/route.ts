import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { ITaxModuleService } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

type TaxRateRule = {
  reference: string
  reference_id: string
  tax_rate_id: string
}

const PRODUCT_NOT_FOUND_MESSAGE = "Product not found"

function normalizeCountryCode(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return
  }

  const normalized = value.trim().toLowerCase()

  return normalized.length === 2 ? normalized : undefined
}

function toNumber(value: unknown): number | undefined {
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

function isProductRule(rule: TaxRateRule, productId: string) {
  return rule.reference === "product" && rule.reference_id === productId
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const productId = req.params.id ?? ""
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const taxService = req.scope.resolve<ITaxModuleService>(Modules.TAX)

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "sales_channels.id", "sales_channels.name"],
    filters: { id: productId },
  })

  const product = products[0]

  if (!product) {
    res.status(404).json({ message: PRODUCT_NOT_FOUND_MESSAGE })
    return
  }

  const taxRegions = await taxService.listTaxRegions({})
  const topLevelCountryTaxRegions = taxRegions.filter(
    (taxRegion) =>
      normalizeCountryCode(taxRegion.country_code) && !taxRegion.province_code
  )
  const taxRegionIds = topLevelCountryTaxRegions.map(
    (taxRegion) => taxRegion.id
  )
  const taxRates = taxRegionIds.length
    ? await taxService.listTaxRates({ tax_region_id: taxRegionIds })
    : []
  const taxRateIds = taxRates.map((taxRate) => taxRate.id)
  const taxRateRules = taxRateIds.length
    ? ((await taxService.listTaxRateRules({
        tax_rate_id: taxRateIds,
      })) as TaxRateRule[])
    : []

  const rulesByRateId = new Map<string, TaxRateRule[]>()

  for (const rule of taxRateRules) {
    const rules = rulesByRateId.get(rule.tax_rate_id) ?? []
    rules.push(rule)
    rulesByRateId.set(rule.tax_rate_id, rules)
  }

  const ratesByCountry = topLevelCountryTaxRegions.flatMap((taxRegion) => {
    const countryCode = normalizeCountryCode(taxRegion.country_code)

    if (!countryCode) {
      return []
    }

    const regionRates = taxRates.filter(
      (taxRate) => taxRate.tax_region_id === taxRegion.id
    )
    const productRate = regionRates.find((taxRate) =>
      (rulesByRateId.get(taxRate.id) ?? []).some((rule) =>
        isProductRule(rule, productId)
      )
    )
    const defaultRate = regionRates.find((taxRate) => taxRate.is_default)
    const fallbackRate = regionRates.find(
      (taxRate) => (rulesByRateId.get(taxRate.id) ?? []).length === 0
    )
    const effectiveRate = productRate ?? defaultRate ?? fallbackRate
    const rate = toNumber(effectiveRate?.rate)

    if (rate === undefined) {
      return []
    }

    return [
      {
        country_code: countryCode,
        rate,
        tax_rate_id: effectiveRate?.id,
        tax_rate_name: effectiveRate?.name,
        tax_region_id: taxRegion.id,
      },
    ]
  })

  res.status(200).json({
    product: {
      id: product.id,
      sales_channels: product.sales_channels ?? [],
    },
    country_rates: ratesByCountry,
  })
}
