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

type TaxRateRule = { reference: string; reference_id: string }

type ExistingTaxRateIndexes = {
  existingDefaultByRegionId: Map<string, TaxRateDTO>
  existingProductByKey: Map<string, TaxRateDTO>
  rulesByRateId: Map<string, TaxRateRule[]>
}

type TaxRateSeedPlan = {
  createPayloads: CreateTaxRatePayload[]
  updatePayloads: UpdateTaxRatePayload[]
}

type WorkflowContainer = Parameters<typeof createTaxRatesWorkflow>[0]

export type TaxRateSeedConfig = {
  metadataSource: string
  defaultRates: { countryCode: string; rate: number }[]
  productOverrides?: {
    countryCode: string
    metadataPath?: string[]
    groupByRate?: boolean
  }
  defaultRateNameTemplate?: string
  defaultRateCodeTemplate?: string
  productRateNameTemplate?: string
  productRateCodeTemplate?: string
}

export type TaxRateSeedTargets = {
  defaultRatesByCountry: Map<string, number>
  productRateGroupsByCountry: Map<string, Map<number, string[]>>
}

export type CreateTaxRatesStepInput = {
  productIds: string[]
  enabled?: boolean
  countries?: string[]
  config?: TaxRateSeedConfig
}

const CreateTaxRatesStepId = "create-tax-rates-seed-step"
const RATE_EPSILON = 0.0001
const DEFAULT_TAX_RATE_NAME_TEMPLATE = "VAT {COUNTRY}"
const DEFAULT_TAX_RATE_CODE_TEMPLATE = "vat_{country}"
const DEFAULT_PRODUCT_TAX_RATE_NAME_TEMPLATE = "VAT {COUNTRY} Product {rate}%"
const DEFAULT_PRODUCT_TAX_RATE_CODE_TEMPLATE =
  "vat_{country}_product_{rate_code}"
const DEFAULT_TAX_RATE_SEED_CONFIG: TaxRateSeedConfig = {
  metadataSource: "seed-tax-rates",
  defaultRates: [],
  defaultRateNameTemplate: DEFAULT_TAX_RATE_NAME_TEMPLATE,
  defaultRateCodeTemplate: DEFAULT_TAX_RATE_CODE_TEMPLATE,
  productRateNameTemplate: DEFAULT_PRODUCT_TAX_RATE_NAME_TEMPLATE,
  productRateCodeTemplate: DEFAULT_PRODUCT_TAX_RATE_CODE_TEMPLATE,
}

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

function buildDefaultRateMetadata(
  countryCode: string,
  config: TaxRateSeedConfig
): TaxRateMetadata {
  return {
    seed_source: config.metadataSource,
    seed_scope: "default",
    seed_country_code: countryCode,
  }
}

function buildProductRateMetadata(
  countryCode: string,
  rate: number,
  config: TaxRateSeedConfig
): TaxRateMetadata {
  return {
    seed_source: config.metadataSource,
    seed_scope: "product_rate",
    seed_country_code: countryCode,
    seed_rate: formatRateValue(rate),
  }
}

function extractProductVat(
  metadata: Record<string, unknown> | undefined,
  metadataPath: string[] = ["top_offer", "vat"]
): number | undefined {
  let current: unknown = metadata
  for (const segment of metadataPath) {
    const currentObject = asObject(current)
    if (!currentObject) {
      return
    }
    current = currentObject[segment]
  }

  return parseRate(current)
}

export function buildTaxRateSeedTargets(
  products: ProductTaxSource[],
  requestedCountries: string[] = [],
  config: TaxRateSeedConfig = DEFAULT_TAX_RATE_SEED_CONFIG
): TaxRateSeedTargets {
  const requestedCountrySet = new Set(
    requestedCountries
      .map((countryCode) => normalizeCountryCode(countryCode))
      .filter((countryCode): countryCode is string => Boolean(countryCode))
  )

  const defaultRatesByCountry = new Map<string, number>(
    config.defaultRates.flatMap(({ countryCode, rate }) => {
      const normalizedCountryCode = normalizeCountryCode(countryCode)
      const normalizedRate = parseRate(rate)
      if (!normalizedCountryCode || normalizedRate === undefined) {
        return []
      }
      if (
        requestedCountrySet.size > 0 &&
        !requestedCountrySet.has(normalizedCountryCode)
      ) {
        return []
      }
      return [[normalizedCountryCode, normalizedRate]]
    })
  )
  const productRateGroupsByCountry = new Map<string, Map<number, string[]>>()
  const productOverridesCountryCode = normalizeCountryCode(
    config.productOverrides?.countryCode
  )
  if (!productOverridesCountryCode) {
    return {
      defaultRatesByCountry,
      productRateGroupsByCountry,
    }
  }

  const defaultOverrideRate = defaultRatesByCountry.get(
    productOverridesCountryCode
  )

  if (defaultOverrideRate === undefined) {
    return {
      defaultRatesByCountry,
      productRateGroupsByCountry,
    }
  }

  const overrideProductRateGroups = new Map<number, string[]>()
  for (const product of products) {
    const vat = extractProductVat(
      asObject(product.metadata),
      config.productOverrides?.metadataPath
    )
    if (vat === undefined || isSameRate(vat, defaultOverrideRate)) {
      continue
    }

    const existing = overrideProductRateGroups.get(vat) ?? []
    existing.push(product.id)
    overrideProductRateGroups.set(vat, existing)
  }

  if (overrideProductRateGroups.size > 0) {
    productRateGroupsByCountry.set(
      productOverridesCountryCode,
      overrideProductRateGroups
    )
  }

  return {
    defaultRatesByCountry,
    productRateGroupsByCountry,
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

function buildProductRateKey(countryCode: string, rate: number): string {
  return `${countryCode}:${rate.toFixed(4)}`
}

function formatRateValue(rate: number): string {
  return Number(rate.toFixed(4)).toString()
}

function formatTemplate(
  template: string,
  countryCode: string,
  rate?: number
): string {
  const rateValue = rate === undefined ? "" : formatRateValue(rate)
  const rateCode = rateValue.replace(/[^0-9]+/g, "_")
  return template
    .replace(/\{country\}/g, countryCode.toLowerCase())
    .replace(/\{COUNTRY\}/g, countryCode.toUpperCase())
    .replace(/\{rate\}/g, rateValue)
    .replace(/\{rate_code\}/g, rateCode)
}

function buildDefaultRateCode(countryCode: string, config: TaxRateSeedConfig) {
  return formatTemplate(
    config.defaultRateCodeTemplate ?? DEFAULT_TAX_RATE_CODE_TEMPLATE,
    countryCode
  )
}

function buildDefaultRateName(countryCode: string, config: TaxRateSeedConfig) {
  return formatTemplate(
    config.defaultRateNameTemplate ?? DEFAULT_TAX_RATE_NAME_TEMPLATE,
    countryCode
  )
}

function buildProductRateCode(
  countryCode: string,
  rate: number,
  config: TaxRateSeedConfig
): string {
  return formatTemplate(
    config.productRateCodeTemplate ?? DEFAULT_PRODUCT_TAX_RATE_CODE_TEMPLATE,
    countryCode,
    rate
  )
}

function buildProductRateName(
  countryCode: string,
  rate: number,
  config: TaxRateSeedConfig
): string {
  return formatTemplate(
    config.productRateNameTemplate ?? DEFAULT_PRODUCT_TAX_RATE_NAME_TEMPLATE,
    countryCode,
    rate
  )
}

export function buildProductTaxRateIdentity(
  countryCode: string,
  rate: number,
  config: TaxRateSeedConfig = DEFAULT_TAX_RATE_SEED_CONFIG
) {
  return {
    code: buildProductRateCode(countryCode, rate, config),
    name: buildProductRateName(countryCode, rate, config),
  }
}

function buildProductRules(productIds: string[]) {
  return [...new Set(productIds)].sort().map((productId) => ({
    reference: "product",
    reference_id: productId,
  }))
}

function areProductRulesEqual(
  left: { reference: string; reference_id: string }[],
  right: { reference: string; reference_id: string }[]
): boolean {
  if (left.length !== right.length) {
    return false
  }

  return left.every((rule, index) => {
    const rightRule = right[index]
    return (
      rightRule?.reference === rule.reference &&
      rightRule.reference_id === rule.reference_id
    )
  })
}

function emptyOutput(): CreateTaxRatesStepOutput {
  return {
    created: [],
    updated: [],
  }
}

function normalizeSeedCountries(countries: string[] | undefined): string[] {
  return [
    ...new Set(
      (countries ?? [])
        .map((countryCode) => normalizeCountryCode(countryCode))
        .filter((countryCode): countryCode is string => Boolean(countryCode))
    ),
  ]
}

function buildExistingDefaultIndex(
  existingRates: TaxRateDTO[]
): Map<string, TaxRateDTO> {
  const existingDefaultByRegionId = new Map<string, TaxRateDTO>()

  for (const taxRate of existingRates) {
    if (
      taxRate.is_default &&
      !existingDefaultByRegionId.has(taxRate.tax_region_id)
    ) {
      existingDefaultByRegionId.set(taxRate.tax_region_id, taxRate)
    }
  }

  return existingDefaultByRegionId
}

function getSeededProductRateKey(
  taxRate: TaxRateDTO,
  metadataSource: string
): string | undefined {
  const seedSource = getMetadataString(taxRate.metadata, "seed_source")
  const countryCode = normalizeCountryCode(
    getMetadataString(taxRate.metadata, "seed_country_code")
  )
  const seedScope = getMetadataString(taxRate.metadata, "seed_scope")
  const seedRate = parseRate(getMetadataString(taxRate.metadata, "seed_rate"))

  if (
    seedSource !== metadataSource ||
    seedScope !== "product_rate" ||
    !countryCode ||
    seedRate === undefined
  ) {
    return
  }

  return buildProductRateKey(countryCode, seedRate)
}

function buildSeededProductRateIndex(
  existingRates: TaxRateDTO[],
  config: TaxRateSeedConfig
): Map<string, TaxRateDTO> {
  const existingProductByKey = new Map<string, TaxRateDTO>()

  for (const taxRate of existingRates) {
    const key = getSeededProductRateKey(taxRate, config.metadataSource)
    if (key) {
      existingProductByKey.set(key, taxRate)
    }
  }

  return existingProductByKey
}

async function loadRulesByRateId(
  taxService: ITaxModuleService,
  nonDefaultRates: TaxRateDTO[]
): Promise<Map<string, TaxRateRule[]>> {
  const rulesByRateId = new Map<string, TaxRateRule[]>()

  if (nonDefaultRates.length === 0) {
    return rulesByRateId
  }

  const taxRateRules = await taxService.listTaxRateRules({
    tax_rate_id: nonDefaultRates.map((taxRate) => taxRate.id),
  })

  for (const rule of taxRateRules) {
    const rules = rulesByRateId.get(rule.tax_rate_id) ?? []
    rules.push({
      reference: rule.reference,
      reference_id: rule.reference_id,
    })
    rulesByRateId.set(rule.tax_rate_id, rules)
  }

  return rulesByRateId
}

function shouldIndexLegacyProductRate(params: {
  taxRate: TaxRateDTO
  rules: TaxRateRule[]
  metadataSource: string
}): boolean {
  const seedSource = getMetadataString(params.taxRate.metadata, "seed_source")
  const seedScope = getMetadataString(params.taxRate.metadata, "seed_scope")
  const hasOnlyProductRules =
    params.rules.length > 0 &&
    params.rules.every(
      (rule) => rule.reference === "product" && rule.reference_id
    )

  return (
    seedSource === params.metadataSource ||
    hasOnlyProductRules ||
    seedScope === "product"
  )
}

function addLegacyProductRateIndexes(params: {
  nonDefaultRates: TaxRateDTO[]
  countryToRegion: Map<string, TaxRegionDTO>
  rulesByRateId: Map<string, TaxRateRule[]>
  existingProductByKey: Map<string, TaxRateDTO>
  config: TaxRateSeedConfig
}): void {
  const countryByRegionId = new Map(
    [...params.countryToRegion.entries()].map(([countryCode, taxRegion]) => [
      taxRegion.id,
      countryCode,
    ])
  )

  for (const taxRate of params.nonDefaultRates) {
    const countryCode = countryByRegionId.get(taxRate.tax_region_id)
    const rate = parseRate(taxRate.rate)
    if (!countryCode || rate === undefined) {
      continue
    }

    const key = buildProductRateKey(countryCode, rate)
    if (params.existingProductByKey.has(key)) {
      continue
    }

    const rules = params.rulesByRateId.get(taxRate.id) ?? []
    if (
      shouldIndexLegacyProductRate({
        taxRate,
        rules,
        metadataSource: params.config.metadataSource,
      })
    ) {
      params.existingProductByKey.set(key, taxRate)
    }
  }
}

async function buildExistingTaxRateIndexes(params: {
  taxService: ITaxModuleService
  countryToRegion: Map<string, TaxRegionDTO>
  existingRates: TaxRateDTO[]
  config: TaxRateSeedConfig
}): Promise<ExistingTaxRateIndexes> {
  const existingDefaultByRegionId = buildExistingDefaultIndex(
    params.existingRates
  )
  const existingProductByKey = buildSeededProductRateIndex(
    params.existingRates,
    params.config
  )
  const nonDefaultRates = params.existingRates.filter(
    (taxRate) => !taxRate.is_default
  )
  const rulesByRateId = await loadRulesByRateId(
    params.taxService,
    nonDefaultRates
  )

  addLegacyProductRateIndexes({
    nonDefaultRates,
    countryToRegion: params.countryToRegion,
    rulesByRateId,
    existingProductByKey,
    config: params.config,
  })

  return {
    existingDefaultByRegionId,
    existingProductByKey,
    rulesByRateId,
  }
}

function addDefaultRatePlan(params: {
  plan: TaxRateSeedPlan
  taxRegion: TaxRegionDTO
  countryCode: string
  defaultRate: number
  existingDefaultByRegionId: Map<string, TaxRateDTO>
  config: TaxRateSeedConfig
}): void {
  const defaultName = buildDefaultRateName(params.countryCode, params.config)
  const defaultCode = buildDefaultRateCode(params.countryCode, params.config)
  const defaultMetadata = buildDefaultRateMetadata(
    params.countryCode,
    params.config
  )
  const existingDefault = params.existingDefaultByRegionId.get(
    params.taxRegion.id
  )

  if (!existingDefault) {
    params.plan.createPayloads.push({
      tax_region_id: params.taxRegion.id,
      rate: params.defaultRate,
      code: defaultCode,
      name: defaultName,
      is_default: true,
      metadata: defaultMetadata,
    })
    return
  }

  if (
    !isSameRate(existingDefault.rate, params.defaultRate) ||
    existingDefault.code !== defaultCode ||
    existingDefault.name !== defaultName
  ) {
    params.plan.updatePayloads.push({
      selector: { id: existingDefault.id },
      update: {
        rate: params.defaultRate,
        code: defaultCode,
        name: defaultName,
        is_default: true,
        metadata: defaultMetadata,
      },
    })
  }
}

function getProductRuleIds(rules: TaxRateRule[]): string[] {
  return rules
    .filter((rule) => rule.reference === "product" && rule.reference_id)
    .map((rule) => rule.reference_id)
}

function addProductRatePlan(params: {
  plan: TaxRateSeedPlan
  taxRegion: TaxRegionDTO
  countryCode: string
  rate: number
  productIds: string[]
  existingProductByKey: Map<string, TaxRateDTO>
  rulesByRateId: Map<string, TaxRateRule[]>
  config: TaxRateSeedConfig
}): void {
  const key = buildProductRateKey(params.countryCode, params.rate)
  const { code, name } = buildProductTaxRateIdentity(
    params.countryCode,
    params.rate,
    params.config
  )
  const metadata = buildProductRateMetadata(
    params.countryCode,
    params.rate,
    params.config
  )
  const existingProductRate = params.existingProductByKey.get(key)
  const existingRules = existingProductRate
    ? (params.rulesByRateId.get(existingProductRate.id) ?? [])
    : []
  const existingProductIds = getProductRuleIds(existingRules)
  const rules = buildProductRules([...existingProductIds, ...params.productIds])

  if (!existingProductRate) {
    params.plan.createPayloads.push({
      tax_region_id: params.taxRegion.id,
      rate: params.rate,
      code,
      name,
      metadata,
      rules,
    })
    return
  }

  if (
    !isSameRate(existingProductRate.rate, params.rate) ||
    existingProductRate.code !== code ||
    existingProductRate.name !== name ||
    !areProductRulesEqual(buildProductRules(existingProductIds), rules)
  ) {
    params.plan.updatePayloads.push({
      selector: { id: existingProductRate.id },
      update: {
        rate: params.rate,
        code,
        name,
        metadata,
        rules,
      },
    })
  }
}

function buildTaxRateSeedPlan(params: {
  targets: TaxRateSeedTargets
  countryToRegion: Map<string, TaxRegionDTO>
  indexes: ExistingTaxRateIndexes
  config: TaxRateSeedConfig
}): TaxRateSeedPlan {
  const plan: TaxRateSeedPlan = {
    createPayloads: [],
    updatePayloads: [],
  }

  for (const [countryCode, defaultRate] of params.targets
    .defaultRatesByCountry) {
    const taxRegion = params.countryToRegion.get(countryCode)
    if (!taxRegion) {
      continue
    }

    addDefaultRatePlan({
      plan,
      taxRegion,
      countryCode,
      defaultRate,
      existingDefaultByRegionId: params.indexes.existingDefaultByRegionId,
      config: params.config,
    })

    const productRateGroups =
      params.targets.productRateGroupsByCountry.get(countryCode) ?? new Map()
    for (const [rate, productIds] of productRateGroups.entries()) {
      if (isSameRate(defaultRate, rate)) {
        continue
      }

      addProductRatePlan({
        plan,
        taxRegion,
        countryCode,
        rate,
        productIds,
        existingProductByKey: params.indexes.existingProductByKey,
        rulesByRateId: params.indexes.rulesByRateId,
        config: params.config,
      })
    }
  }

  return plan
}

async function runCreateTaxRates(params: {
  container: WorkflowContainer
  createPayloads: CreateTaxRatePayload[]
  created: TaxRateDTO[]
}): Promise<void> {
  const CHUNK_SIZE = 250

  for (let i = 0; i < params.createPayloads.length; i += CHUNK_SIZE) {
    const chunk = params.createPayloads.slice(i, i + CHUNK_SIZE)
    const { result: createdChunk } = await createTaxRatesWorkflow(
      params.container
    ).run({
      input: chunk,
    })
    params.created.push(...createdChunk)
  }
}

async function runUpdateTaxRates(params: {
  container: WorkflowContainer
  updatePayloads: UpdateTaxRatePayload[]
  updated: TaxRateDTO[]
}): Promise<void> {
  for (const updatePayload of params.updatePayloads) {
    const { result: updatedChunk } = await updateTaxRatesWorkflow(
      params.container
    ).run({
      input: updatePayload,
    })
    params.updated.push(...updatedChunk)
  }
}

export const createTaxRatesStep = createStep(
  CreateTaxRatesStepId,
  async (input: CreateTaxRatesStepInput, { container }) => {
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const productService = container.resolve<IProductModuleService>(
      Modules.PRODUCT
    )
    const taxService = container.resolve<ITaxModuleService>(Modules.TAX)

    if (input.enabled === false) {
      return new StepResponse({ result: emptyOutput() })
    }

    const config = input.config ?? DEFAULT_TAX_RATE_SEED_CONFIG
    const uniqueProductIds = [...new Set(input.productIds)]
    if (uniqueProductIds.length === 0) {
      return new StepResponse({ result: emptyOutput() })
    }

    const normalizedSeedCountries = normalizeSeedCountries(input.countries)

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
      normalizedSeedCountries,
      config
    )

    if (taxRateTargets.defaultRatesByCountry.size === 0) {
      logger.warn(
        "No approved tax-rate countries configured, skipping tax rate seed"
      )
      return new StepResponse({ result: emptyOutput() })
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
      return new StepResponse({ result: emptyOutput() })
    }

    const existingRates = await taxService.listTaxRates({
      tax_region_id: regionIds,
    })
    const indexes = await buildExistingTaxRateIndexes({
      taxService,
      countryToRegion,
      existingRates,
      config,
    })
    const { createPayloads, updatePayloads } = buildTaxRateSeedPlan({
      targets: taxRateTargets,
      countryToRegion,
      indexes,
      config,
    })

    const created: TaxRateDTO[] = []
    const updated: TaxRateDTO[] = []
    await runCreateTaxRates({ container, createPayloads, created })
    await runUpdateTaxRates({ container, updatePayloads, updated })

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
