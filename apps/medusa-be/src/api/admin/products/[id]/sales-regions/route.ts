import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type {
  IRegionModuleService,
  ITaxModuleService,
  TaxRateDTO,
  TaxRegionDTO,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { normalizeCountryCode } from "../../../../../utils/country-code"
import {
  getRegionCountryCodes,
  isProductRule,
  isTaxRateRule,
  type RegionWithCountries,
  type TaxRateRule,
  toNumber,
  toRegionWithCountries,
  toSalesRegionProduct,
} from "./utils"

const CHUNK_SIZE = 100
const PRODUCT_NOT_FOUND_MESSAGE = "Product not found"

async function listAllRegions(regionService: IRegionModuleService) {
  const regions: RegionWithCountries[] = []
  let skip = 0

  while (true) {
    const chunk = await regionService.listRegions(
      {},
      {
        relations: ["countries"],
        skip,
        take: CHUNK_SIZE,
      }
    )

    regions.push(...chunk.map(toRegionWithCountries))

    if (chunk.length < CHUNK_SIZE) {
      return regions
    }

    skip += CHUNK_SIZE
  }
}

async function listAllTaxRegions(
  taxService: ITaxModuleService,
  countryCodes: string[]
) {
  const taxRegions: TaxRegionDTO[] = []
  let skip = 0

  while (true) {
    const chunk = await taxService.listTaxRegions(
      {
        country_code: { $in: countryCodes },
      },
      {
        skip,
        take: CHUNK_SIZE,
      }
    )

    taxRegions.push(...chunk)

    if (chunk.length < CHUNK_SIZE) {
      return taxRegions
    }

    skip += CHUNK_SIZE
  }
}

async function listAllTaxRates(
  taxService: ITaxModuleService,
  taxRegionIds: string[]
) {
  const taxRates: TaxRateDTO[] = []

  for (let index = 0; index < taxRegionIds.length; index += CHUNK_SIZE) {
    const taxRegionIdChunk = taxRegionIds.slice(index, index + CHUNK_SIZE)
    let skip = 0

    while (true) {
      const chunk = await taxService.listTaxRates(
        { tax_region_id: taxRegionIdChunk },
        { skip, take: CHUNK_SIZE }
      )

      taxRates.push(...chunk)

      if (chunk.length < CHUNK_SIZE) {
        break
      }

      skip += CHUNK_SIZE
    }
  }

  return taxRates
}

async function listAllTaxRateRules(
  taxService: ITaxModuleService,
  taxRateIds: string[]
) {
  const taxRateRules: TaxRateRule[] = []

  for (let index = 0; index < taxRateIds.length; index += CHUNK_SIZE) {
    const taxRateIdChunk = taxRateIds.slice(index, index + CHUNK_SIZE)
    let skip = 0

    while (true) {
      const chunk = await taxService.listTaxRateRules(
        { tax_rate_id: taxRateIdChunk },
        { skip, take: CHUNK_SIZE }
      )

      taxRateRules.push(...chunk.filter(isTaxRateRule))

      if (chunk.length < CHUNK_SIZE) {
        break
      }

      skip += CHUNK_SIZE
    }
  }

  return taxRateRules
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const productId = req.params.id ?? ""
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const regionService = req.scope.resolve<IRegionModuleService>(Modules.REGION)
  const taxService = req.scope.resolve<ITaxModuleService>(Modules.TAX)

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "sales_channels.id", "sales_channels.name"],
    filters: { id: productId },
  })

  const product = toSalesRegionProduct(products[0])

  if (!product) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      PRODUCT_NOT_FOUND_MESSAGE
    )
  }

  const salesChannels = product.sales_channels ?? []
  const countryCodes = salesChannels.length
    ? getRegionCountryCodes(await listAllRegions(regionService))
    : []
  const taxRegions = countryCodes.length
    ? await listAllTaxRegions(taxService, countryCodes)
    : []
  const topLevelCountryTaxRegions = taxRegions.filter(
    (taxRegion) =>
      normalizeCountryCode(taxRegion.country_code) && !taxRegion.province_code
  )
  const taxRegionIds = topLevelCountryTaxRegions.map(
    (taxRegion) => taxRegion.id
  )
  const taxRates = taxRegionIds.length
    ? await listAllTaxRates(taxService, taxRegionIds)
    : []
  const taxRateIds = taxRates.map((taxRate) => taxRate.id)
  const taxRateRules = taxRateIds.length
    ? await listAllTaxRateRules(taxService, taxRateIds)
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
      sales_channels: salesChannels,
    },
    country_rates: ratesByCountry,
  })
}
