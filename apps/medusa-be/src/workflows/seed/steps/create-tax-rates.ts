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

type ProductTaxSource = {
  id: string
  metadata?: Record<string, unknown> | null
}

export type TaxRateSeedTargets = {
  defaultRatesByCountry: Map<string, number>
  productRatesByCountry: Map<string, Map<string, number>>
}

export type CreateTaxRatesStepInput = {
  productIds: string[]
  fallbackCountryCode?: string
  countries?: string[]
}

const CreateTaxRatesStepId = "create-tax-rates-seed-step"
const TAX_METADATA_SOURCE = "herbatica-seed-tax-rates"
const RATE_EPSILON = 0.0001
export const HERBATICA_DEFAULT_TAX_RATES = new Map<string, number>([
  ["sk", 23],
  ["cz", 19],
])
const PRODUCT_OVERRIDE_COUNTRY_CODE = "sk"

function asObject(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return
  }

  return value as Record<string, unknown>
}

function normalizeCountryCode(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return
  }

  const normalized = value.trim().toLowerCase()
  if (normalized.length !== 2) {
    return
  }

  return normalized
}

function parseRate(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value < 0 || value > 100) {
      return
    }

    return Number(value.toFixed(4))
  }

  if (typeof value !== "string") {
    return
  }

  const normalized = value.trim().replace(",", ".")
  if (!normalized) {
    return
  }

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    return
  }

  return Number(parsed.toFixed(4))
}

function isSameRate(left: number | null | undefined, right: number): boolean {
  if (left === null || left === undefined) {
    return false
  }

  return Math.abs(left - right) < RATE_EPSILON
}

function getMetadataString(metadata: TaxRateMetadata | null, key: string) {
  const value = metadata?.[key]
  if (typeof value !== "string") {
    return
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

function extractProductVat(
  metadata: Record<string, unknown> | undefined
): number | undefined {
  const topOffer = asObject(metadata?.top_offer)
  if (!topOffer) {
    return
  }

  return parseRate(topOffer.vat)
}

export function buildTaxRateSeedTargets(
  products: ProductTaxSource[],
  requestedCountries: string[] = []
): TaxRateSeedTargets {
  const requestedCountrySet = new Set(
    requestedCountries
      .map((countryCode) => normalizeCountryCode(countryCode))
      .filter((countryCode): countryCode is string => Boolean(countryCode))
  )

  const defaultRatesByCountry = new Map(
    [...HERBATICA_DEFAULT_TAX_RATES.entries()].filter(
      ([countryCode]) =>
        requestedCountrySet.size === 0 || requestedCountrySet.has(countryCode)
    )
  )
  const productRatesByCountry = new Map<string, Map<string, number>>()
  const defaultOverrideRate = defaultRatesByCountry.get(
    PRODUCT_OVERRIDE_COUNTRY_CODE
  )

  if (defaultOverrideRate === undefined) {
    return {
      defaultRatesByCountry,
      productRatesByCountry,
    }
  }

  const slovakiaProductRates = new Map<string, number>()
  for (const product of products) {
    const vat = extractProductVat(asObject(product.metadata))
    if (vat === undefined || isSameRate(vat, defaultOverrideRate)) {
      continue
    }

    slovakiaProductRates.set(product.id, vat)
  }

  if (slovakiaProductRates.size > 0) {
    productRatesByCountry.set(
      PRODUCT_OVERRIDE_COUNTRY_CODE,
      slovakiaProductRates
    )
  }

  return {
    defaultRatesByCountry,
    productRatesByCountry,
  }
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

    const taxRateTargets = buildTaxRateSeedTargets(
      products,
      normalizedSeedCountries
    )

    if (taxRateTargets.defaultRatesByCountry.size === 0) {
      logger.warn(
        "No approved tax-rate countries configured, skipping tax rate seed"
      )
      return new StepResponse({
        result: {
          created,
          updated,
        },
      })
    }

    const countries = [...taxRateTargets.defaultRatesByCountry.keys()]
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

    const regionIds = [...countryToRegion.values()].map(
      (taxRegion) => taxRegion.id
    )

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

      existingProductByKey.set(
        buildProductRateKey(countryCode, productId),
        taxRate
      )
    }

    const nonDefaultRates = existingRates.filter(
      (taxRate) => !taxRate.is_default
    )
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

    for (const [
      countryCode,
      defaultRate,
    ] of taxRateTargets.defaultRatesByCountry) {
      const taxRegion = countryToRegion.get(countryCode)
      if (!taxRegion) {
        continue
      }

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

      const productRates =
        taxRateTargets.productRatesByCountry.get(countryCode) ?? new Map()
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
      const { result: createdChunk } = await createTaxRatesWorkflow(
        container
      ).run({
        input: chunk,
      })
      created.push(...createdChunk)
    }

    for (const updatePayload of updatePayloads) {
      const { result: updatedChunk } = await updateTaxRatesWorkflow(
        container
      ).run({
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
