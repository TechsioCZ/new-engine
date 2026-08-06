import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type {
  IRegionModuleService,
  ITaxModuleService,
  Query,
  TaxRateDTO,
  TaxRegionDTO,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { chunk, unique } from "@techsio/std/array"

import { normalizeCountryCode } from "../../../../../utils/country-code"
import {
  getRegionCountryCodes,
  isTaxRateRule,
  resolveEffectiveRate,
  toRegionWithCountries,
  toSalesRegionProduct,
} from "./utils"
import type { RegionWithCountries, TaxRateRule } from "./utils"

const CHUNK_SIZE = 100
const MAX_QUERY_PAGES = 1000
const CONFIG_CACHE_TTL_MS = 30_000
const PRODUCT_NOT_FOUND_MESSAGE = "Product not found"

interface CacheEntry<TValue> {
  expiresAt: number
  value: Promise<TValue>
}

const regionsCache = new Map<string, CacheEntry<RegionWithCountries[]>>()
const taxRegionsCache = new Map<string, CacheEntry<TaxRegionDTO[]>>()
const taxRatesCache = new Map<string, CacheEntry<TaxRateDTO[]>>()
const taxRateRulesCache = new Map<string, CacheEntry<TaxRateRule[]>>()

const getCachedConfig = async <TValue>(
  cache: Map<string, CacheEntry<TValue>>,
  key: string,
  load: () => Promise<TValue>,
) => {
  const cached = cache.get(key)

  if (cached && cached.expiresAt > Date.now()) {
    return await cached.value
  }

  const value = load()
  cache.set(key, {
    expiresAt: Date.now() + CONFIG_CACHE_TTL_MS,
    value,
  })

  try {
    return await value
  } catch (error: unknown) {
    if (cache.get(key)?.value === value) {
      cache.delete(key)
    }
    throw error
  }
}

const getSetCacheKey = (values: string[]) => unique(values).toSorted().join(",")

const getCountryCodeSetCacheKey = (countryCodes: string[]) =>
  getSetCacheKey(
    countryCodes.flatMap(
      (countryCode) => normalizeCountryCode(countryCode) ?? [],
    ),
  )

const listAllPages = async <T>(
  loadPage: (skip: number) => Promise<T[]>,
  pageCount = 0,
): Promise<T[]> => {
  if (pageCount >= MAX_QUERY_PAGES) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Sales region query exceeded ${MAX_QUERY_PAGES} pages`,
    )
  }

  const page = await loadPage(pageCount * CHUNK_SIZE)
  if (page.length < CHUNK_SIZE) {
    return page
  }

  return [...page, ...(await listAllPages(loadPage, pageCount + 1))]
}

const listAllRegions = async (regionService: IRegionModuleService) => {
  const regions = await listAllPages(
    async (skip) =>
      await regionService.listRegions(
        {},
        { relations: ["countries"], skip, take: CHUNK_SIZE },
      ),
  )
  return regions.map(toRegionWithCountries)
}

const listAllTaxRegions = async (
  taxService: ITaxModuleService,
  countryCodes: string[],
) =>
  await listAllPages(
    async (skip) =>
      await taxService.listTaxRegions(
        { country_code: { $in: countryCodes } },
        { skip, take: CHUNK_SIZE },
      ),
  )

const listAllTaxRates = async (
  taxService: ITaxModuleService,
  taxRegionIds: string[],
) => {
  const batches = await Promise.all(
    chunk(taxRegionIds, CHUNK_SIZE).map(
      async (taxRegionIdChunk) =>
        await listAllPages(
          async (skip) =>
            await taxService.listTaxRates(
              { tax_region_id: taxRegionIdChunk },
              { skip, take: CHUNK_SIZE },
            ),
        ),
    ),
  )
  return batches.flat()
}

const listAllTaxRateRules = async (
  taxService: ITaxModuleService,
  taxRateIds: string[],
) => {
  const batches = await Promise.all(
    chunk(taxRateIds, CHUNK_SIZE).map(
      async (taxRateIdChunk) =>
        await listAllPages(async (skip) => {
          const rules = await taxService.listTaxRateRules(
            { tax_rate_id: taxRateIdChunk },
            { skip, take: CHUNK_SIZE },
          )
          return rules.filter(isTaxRateRule)
        }),
    ),
  )
  return batches.flat()
}

const get = async (req: MedusaRequest, res: MedusaResponse) => {
  const productId = req.params["id"] ?? ""
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
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
      PRODUCT_NOT_FOUND_MESSAGE,
    )
  }

  const salesChannels = product.sales_channels ?? []
  const countryCodes = salesChannels.length
    ? getRegionCountryCodes(
        await getCachedConfig(
          regionsCache,
          "all",
          async () => await listAllRegions(regionService),
        ),
      )
    : []
  const taxRegions = countryCodes.length
    ? await getCachedConfig(
        taxRegionsCache,
        getCountryCodeSetCacheKey(countryCodes),
        async () => await listAllTaxRegions(taxService, countryCodes),
      )
    : []
  const topLevelCountryTaxRegions = taxRegions.filter((taxRegion) => {
    const countryCode = normalizeCountryCode(taxRegion.country_code)
    const hasProvince =
      typeof taxRegion.province_code === "string" &&
      taxRegion.province_code.length > 0
    return countryCode !== undefined && !hasProvince
  })
  const taxRegionIds = topLevelCountryTaxRegions.map(
    (taxRegion) => taxRegion.id,
  )
  const taxRates = taxRegionIds.length
    ? await getCachedConfig(
        taxRatesCache,
        getSetCacheKey(taxRegionIds),
        async () => await listAllTaxRates(taxService, taxRegionIds),
      )
    : []
  const taxRateIds = taxRates.map((taxRate) => taxRate.id)
  const taxRateRules = taxRateIds.length
    ? await getCachedConfig(
        taxRateRulesCache,
        getSetCacheKey(taxRateIds),
        async () => await listAllTaxRateRules(taxService, taxRateIds),
      )
    : []

  const rulesByRateId = new Map<string, TaxRateRule[]>()

  for (const rule of taxRateRules) {
    const rules = rulesByRateId.get(rule.tax_rate_id) ?? []
    rules.push(rule)
    rulesByRateId.set(rule.tax_rate_id, rules)
  }

  const ratesByCountry = topLevelCountryTaxRegions.flatMap((taxRegion) => {
    const countryCode = normalizeCountryCode(taxRegion.country_code)

    if (!(typeof countryCode === "string" && countryCode.length > 0)) {
      return []
    }

    const regionRates = taxRates.filter(
      (taxRate) => taxRate.tax_region_id === taxRegion.id,
    )
    const effectiveRate = resolveEffectiveRate(
      regionRates,
      rulesByRateId,
      productId,
    )

    if (!effectiveRate) {
      return []
    }

    return [
      {
        country_code: countryCode,
        rate: effectiveRate.rate,
        tax_rate_id: effectiveRate.taxRate.id,
        tax_rate_name: effectiveRate.taxRate.name,
        tax_region_id: taxRegion.id,
      },
    ]
  })

  res.status(200).json({
    country_rates: ratesByCountry,
    product: {
      id: product.id,
      sales_channels: salesChannels,
    },
  })
}

export { get as GET }
