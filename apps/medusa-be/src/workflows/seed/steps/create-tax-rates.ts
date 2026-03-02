import type {
  IProductModuleService,
  ITaxModuleService,
  Logger,
  TaxRateDTO,
  TaxRegionDTO,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import {
  createTaxRatesWorkflow,
  updateTaxRatesWorkflow,
} from "@medusajs/medusa/core-flows"

type TaxRateMetadata = Record<string, unknown>

type CreateTaxRatePayload = {
  tax_region_id: string
  rate: number
  code: string
  name: string
  is_default?: boolean
  metadata?: TaxRateMetadata
  rules?: { reference: string; reference_id: string }[]
}

type UpdateTaxRatePayload = {
  selector: { id: string }
  update: {
    rate: number
    code: string
    name: string
    is_default?: boolean
    metadata?: TaxRateMetadata
    rules?: { reference: string; reference_id: string }[]
  }
}

type CreateTaxRatesStepOutput = {
  created: TaxRateDTO[]
  updated: TaxRateDTO[]
}

export type CreateTaxRatesStepInput = {
  productIds: string[]
  fallbackCountryCode?: string
  countries?: string[]
}

const CreateTaxRatesStepId = "create-tax-rates-seed-step"
const TAX_METADATA_SOURCE = "herbatica-seed-tax-rates"
const RATE_EPSILON = 0.0001

function asObject(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined
  }

  return value as Record<string, unknown>
}

function normalizeCountryCode(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined
  }

  const normalized = value.trim().toLowerCase()
  if (normalized.length !== 2) {
    return undefined
  }

  return normalized
}

function parseRate(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value < 0 || value > 100) {
      return undefined
    }

    return Number(value.toFixed(4))
  }

  if (typeof value !== "string") {
    return undefined
  }

  const normalized = value.trim().replace(",", ".")
  if (!normalized) {
    return undefined
  }

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    return undefined
  }

  return Number(parsed.toFixed(4))
}

function parseOssRate(
  value: unknown,
  fallbackRate: number | undefined
): number | undefined {
  const parsed = parseRate(value)
  if (parsed !== undefined) {
    return parsed
  }

  if (typeof value !== "string") {
    return undefined
  }

  const normalized = value.trim().toLowerCase()
  if ((normalized === "high" || normalized === "low") && fallbackRate !== undefined) {
    return fallbackRate
  }

  return undefined
}

function isSameRate(left: number | null | undefined, right: number): boolean {
  if (left === null || left === undefined) {
    return false
  }

  return Math.abs(left - right) < RATE_EPSILON
}

function pickDefaultRate(values: number[]): number {
  const counters = new Map<string, { count: number; value: number }>()

  for (const value of values) {
    const key = value.toFixed(4)
    const existing = counters.get(key)
    if (!existing) {
      counters.set(key, { count: 1, value })
      continue
    }

    existing.count += 1
  }

  let picked = values[0] ?? 0
  let maxCount = -1

  for (const entry of counters.values()) {
    if (entry.count > maxCount) {
      picked = entry.value
      maxCount = entry.count
      continue
    }

    if (entry.count === maxCount && entry.value > picked) {
      picked = entry.value
    }
  }

  return picked
}

function getMetadataString(metadata: TaxRateMetadata | null, key: string) {
  const value = metadata?.[key]
  if (typeof value !== "string") {
    return undefined
  }

  const normalized = value.trim()
  return normalized || undefined
}

function buildDefaultRateMetadata(countryCode: string): TaxRateMetadata {
  return {
    seed_source: TAX_METADATA_SOURCE,
    seed_scope: "default",
    seed_country_code: countryCode,
  }
}

function buildProductRateMetadata(
  countryCode: string,
  productId: string
): TaxRateMetadata {
  return {
    seed_source: TAX_METADATA_SOURCE,
    seed_scope: "product",
    seed_country_code: countryCode,
    seed_product_id: productId,
  }
}

function extractProductTaxRates(
  metadata: Record<string, unknown> | undefined,
  fallbackCountryCode: string,
  targetCountries: string[]
): Map<string, number> {
  const result = new Map<string, number>()

  const topOffer = asObject(metadata?.top_offer)
  if (!topOffer) {
    return result
  }

  const fallbackVat = parseRate(topOffer.vat)
  if (fallbackVat !== undefined) {
    const seedCountries = targetCountries.length > 0 ? targetCountries : [fallbackCountryCode]
    for (const countryCode of seedCountries) {
      result.set(countryCode, fallbackVat)
    }
  }

  const ossTaxRates = Array.isArray(topOffer.oss_tax_rates)
    ? topOffer.oss_tax_rates
    : []

  for (const ossTaxRate of ossTaxRates) {
    const entry = asObject(ossTaxRate)
    const countryCode = normalizeCountryCode(entry?.country)
    const rate = parseOssRate(entry?.level, fallbackVat)

    if (!countryCode || rate === undefined) {
      continue
    }

    result.set(countryCode, rate)
  }

  return result
}

function mapCountryToRegion(taxRegions: TaxRegionDTO[]) {
  const countryToRegion = new Map<string, TaxRegionDTO>()

  for (const taxRegion of taxRegions) {
    const countryCode = normalizeCountryCode(taxRegion.country_code)
    if (!countryCode) {
      continue
    }

    countryToRegion.set(countryCode, taxRegion)
  }

  return countryToRegion
}

function buildProductRateKey(countryCode: string, productId: string): string {
  return `${countryCode}:${productId}`
}

function buildProductRateCode(countryCode: string, productId: string): string {
  const normalizedProductId = productId.replace(/[^a-zA-Z0-9]/g, "").slice(-18)
  return `vat_${countryCode}_${normalizedProductId}`
}

export const createTaxRatesStep = createStep(
  CreateTaxRatesStepId,
  async (input: CreateTaxRatesStepInput, { container }) => {
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const productService = container.resolve<IProductModuleService>(
      Modules.PRODUCT
    )
    const taxService = container.resolve<ITaxModuleService>(Modules.TAX)

    const created: TaxRateDTO[] = []
    const updated: TaxRateDTO[] = []

    const uniqueProductIds = [...new Set(input.productIds)]
    if (uniqueProductIds.length === 0) {
      return new StepResponse({
        result: {
          created,
          updated,
        },
      })
    }

    const fallbackCountryCode =
      normalizeCountryCode(input.fallbackCountryCode) ?? "sk"
    const normalizedSeedCountries = [
      ...new Set(
        (input.countries ?? [])
          .map((countryCode) => normalizeCountryCode(countryCode))
          .filter((countryCode): countryCode is string => Boolean(countryCode))
      ),
    ]

    const products = await productService.listProducts(
      {
        id: { $in: uniqueProductIds },
      },
      {
        select: ["id", "metadata"],
      }
    )

    const countryToProductRates = new Map<string, Map<string, number>>()

    for (const product of products) {
      const metadata = asObject(product.metadata)
      const productTaxRates = extractProductTaxRates(
        metadata,
        fallbackCountryCode,
        normalizedSeedCountries
      )

      for (const [countryCode, rate] of productTaxRates.entries()) {
        if (!countryToProductRates.has(countryCode)) {
          countryToProductRates.set(countryCode, new Map())
        }

        countryToProductRates.get(countryCode)?.set(product.id, rate)
      }
    }

    if (countryToProductRates.size === 0) {
      logger.warn("No VAT information found in product metadata, skipping tax rate seed")
      return new StepResponse({
        result: {
          created,
          updated,
        },
      })
    }

    const countries = [...countryToProductRates.keys()]
    const taxRegions = await taxService.listTaxRegions({
      country_code: { $in: countries },
    })
    const countryToRegion = mapCountryToRegion(taxRegions)

    const missingCountries = countries.filter(
      (countryCode) => !countryToRegion.has(countryCode)
    )

    if (missingCountries.length > 0) {
      logger.warn(
        `Tax regions missing for countries: ${missingCountries.join(", ")}. These rates will be skipped.`
      )
    }

    const regionIds = [...countryToRegion.values()].map((taxRegion) => taxRegion.id)

    if (regionIds.length === 0) {
      return new StepResponse({
        result: {
          created,
          updated,
        },
      })
    }

    const existingRates = await taxService.listTaxRates({
      tax_region_id: regionIds,
    })

    const existingDefaultByRegionId = new Map<string, TaxRateDTO>()
    const existingProductByKey = new Map<string, TaxRateDTO>()

    for (const taxRate of existingRates) {
      if (
        taxRate.is_default &&
        !existingDefaultByRegionId.has(taxRate.tax_region_id)
      ) {
        existingDefaultByRegionId.set(taxRate.tax_region_id, taxRate)
      }

      const seedSource = getMetadataString(taxRate.metadata, "seed_source")
      const productId = getMetadataString(taxRate.metadata, "seed_product_id")
      const countryCode = normalizeCountryCode(
        getMetadataString(taxRate.metadata, "seed_country_code")
      )

      if (seedSource !== TAX_METADATA_SOURCE || !productId || !countryCode) {
        continue
      }

      existingProductByKey.set(buildProductRateKey(countryCode, productId), taxRate)
    }

    const nonDefaultRates = existingRates.filter((taxRate) => !taxRate.is_default)
    if (nonDefaultRates.length > 0) {
      const productRules = await taxService.listTaxRateRules({
        tax_rate_id: nonDefaultRates.map((taxRate) => taxRate.id),
        reference: "product",
      })

      const rulesByRateId = new Map<string, string[]>()
      for (const rule of productRules) {
        if (!rulesByRateId.has(rule.tax_rate_id)) {
          rulesByRateId.set(rule.tax_rate_id, [])
        }

        rulesByRateId.get(rule.tax_rate_id)?.push(rule.reference_id)
      }

      const countryByRegionId = new Map(
        [...countryToRegion.entries()].map(([countryCode, taxRegion]) => [
          taxRegion.id,
          countryCode,
        ])
      )

      for (const taxRate of nonDefaultRates) {
        const references = rulesByRateId.get(taxRate.id) ?? []
        if (references.length !== 1) {
          continue
        }

        const countryCode = countryByRegionId.get(taxRate.tax_region_id)
        if (!countryCode) {
          continue
        }

        const referenceId = references[0]
        if (!referenceId) {
          continue
        }

        const key = buildProductRateKey(countryCode, referenceId)
        if (!existingProductByKey.has(key)) {
          existingProductByKey.set(key, taxRate)
        }
      }
    }

    const createPayloads: CreateTaxRatePayload[] = []
    const updatePayloads: UpdateTaxRatePayload[] = []

    for (const [countryCode, productRates] of countryToProductRates.entries()) {
      const taxRegion = countryToRegion.get(countryCode)
      if (!taxRegion) {
        continue
      }

      const defaultRate = pickDefaultRate([...productRates.values()])
      const defaultName = `VAT ${countryCode.toUpperCase()}`
      const defaultCode = `vat_${countryCode}`
      const defaultMetadata = buildDefaultRateMetadata(countryCode)

      const existingDefault = existingDefaultByRegionId.get(taxRegion.id)

      if (!existingDefault) {
        createPayloads.push({
          tax_region_id: taxRegion.id,
          rate: defaultRate,
          code: defaultCode,
          name: defaultName,
          is_default: true,
          metadata: defaultMetadata,
        })
      } else if (
        !isSameRate(existingDefault.rate, defaultRate) ||
        existingDefault.code !== defaultCode ||
        existingDefault.name !== defaultName
      ) {
        updatePayloads.push({
          selector: { id: existingDefault.id },
          update: {
            rate: defaultRate,
            code: defaultCode,
            name: defaultName,
            is_default: true,
            metadata: defaultMetadata,
          },
        })
      }

      for (const [productId, rate] of productRates.entries()) {
        if (isSameRate(defaultRate, rate)) {
          continue
        }

        const key = buildProductRateKey(countryCode, productId)
        const code = buildProductRateCode(countryCode, productId)
        const name = `VAT ${countryCode.toUpperCase()} product`
        const metadata = buildProductRateMetadata(countryCode, productId)
        const rules = [{ reference: "product", reference_id: productId }]

        const existingProductRate = existingProductByKey.get(key)

        if (!existingProductRate) {
          createPayloads.push({
            tax_region_id: taxRegion.id,
            rate,
            code,
            name,
            metadata,
            rules,
          })
          continue
        }

        if (
          !isSameRate(existingProductRate.rate, rate) ||
          existingProductRate.code !== code ||
          existingProductRate.name !== name
        ) {
          updatePayloads.push({
            selector: { id: existingProductRate.id },
            update: {
              rate,
              code,
              name,
              metadata,
              rules,
            },
          })
        }
      }
    }

    const CHUNK_SIZE = 250

    for (let i = 0; i < createPayloads.length; i += CHUNK_SIZE) {
      const chunk = createPayloads.slice(i, i + CHUNK_SIZE)
      const { result: createdChunk } = await createTaxRatesWorkflow(container).run({
        input: chunk,
      })
      created.push(...createdChunk)
    }

    for (const updatePayload of updatePayloads) {
      const { result: updatedChunk } = await updateTaxRatesWorkflow(container).run({
        input: updatePayload,
      })
      updated.push(...updatedChunk)
    }

    logger.info(
      `Tax rates seed complete: created ${created.length}, updated ${updated.length}`
    )

    const output: CreateTaxRatesStepOutput = {
      created,
      updated,
    }

    return new StepResponse({ result: output })
  }
)
