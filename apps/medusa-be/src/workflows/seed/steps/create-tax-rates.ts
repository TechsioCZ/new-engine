import type {
  IProductModuleService,
  ITaxModuleService,
  Logger,
  MetadataType,
  TaxRateDTO,
  TaxRegionDTO,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type {
  CreateTaxRatesWorkflowInput,
  UpdateTaxRatesWorkflowInput,
} from "@medusajs/medusa/core-flows"
import {
  createTaxRatesWorkflow,
  updateTaxRatesWorkflow,
} from "@medusajs/medusa/core-flows"
import { getRecordValue, isRecord } from "@techsio/std/object"

type TaxRateSeedMetadataKey =
  | "seed_country_code"
  | "seed_rate"
  | "seed_scope"
  | "seed_source"

export interface CreateTaxRatesStepOutput {
  created: TaxRateDTO[]
  updated: TaxRateDTO[]
}

interface ProductTaxSource {
  id: string
  metadata?: MetadataType
}

interface TaxRateRule {
  reference: string
  reference_id: string
}

interface ExistingTaxRateIndexes {
  existingDefaultByRegionId: Map<string, TaxRateDTO>
  existingProductByKey: Map<string, TaxRateDTO>
  rulesByRateId: Map<string, TaxRateRule[]>
}

interface TaxRateSeedPlan {
  createPayloads: CreateTaxRatesWorkflowInput
  updatePayloads: UpdateTaxRatesWorkflowInput[]
}

type WorkflowContainer = Parameters<typeof createTaxRatesWorkflow>[0]

export interface TaxRateSeedConfig {
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

export interface TaxRateSeedTargets {
  defaultRatesByCountry: Map<string, number>
  productRateGroupsByCountry: Map<string, Map<number, string[]>>
}

export interface CreateTaxRatesStepInput {
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
  defaultRateCodeTemplate: DEFAULT_TAX_RATE_CODE_TEMPLATE,
  defaultRateNameTemplate: DEFAULT_TAX_RATE_NAME_TEMPLATE,
  defaultRates: [],
  metadataSource: "seed-tax-rates",
  productRateCodeTemplate: DEFAULT_PRODUCT_TAX_RATE_CODE_TEMPLATE,
  productRateNameTemplate: DEFAULT_PRODUCT_TAX_RATE_NAME_TEMPLATE,
}

const asObject = (value: unknown): object | undefined =>
  isRecord(value) ? value : undefined

const normalizeCountryCode = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined
  }

  const normalized = value.trim().toLowerCase()
  if (normalized.length !== 2) {
    return undefined
  }

  return normalized
}

const parseRate = (value: unknown): number | undefined => {
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
  if (normalized === "") {
    return undefined
  }

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    return undefined
  }

  return Number(parsed.toFixed(4))
}

const isSameRate = (
  left: number | null | undefined,
  right: number,
): boolean => {
  if (left === null || left === undefined) {
    return false
  }

  return Math.abs(left - right) < RATE_EPSILON
}

const getMetadataString = (
  metadata: object | null,
  key: TaxRateSeedMetadataKey,
): string | undefined => {
  if (metadata === null) {
    return undefined
  }

  const value = getRecordValue(metadata, key)
  if (typeof value !== "string") {
    return undefined
  }

  const normalized = value.trim()
  return normalized === "" ? undefined : normalized
}

const formatRateValue = (rate: number): string =>
  Number(rate.toFixed(4)).toString()

const buildDefaultRateMetadata = (
  countryCode: string,
  config: TaxRateSeedConfig,
) => ({
  seed_country_code: countryCode,
  seed_scope: "default",
  seed_source: config.metadataSource,
})

const buildProductRateMetadata = (
  countryCode: string,
  rate: number,
  config: TaxRateSeedConfig,
) => ({
  seed_country_code: countryCode,
  seed_rate: formatRateValue(rate),
  seed_scope: "product_rate",
  seed_source: config.metadataSource,
})

const extractProductVat = (
  metadata: MetadataType | undefined,
  metadataPath: string[] = ["top_offer", "vat"],
): number | undefined => {
  let current: unknown = metadata
  for (const segment of metadataPath) {
    const currentObject = asObject(current)
    if (currentObject === undefined) {
      return undefined
    }
    current = getRecordValue(currentObject, segment)
  }

  return parseRate(current)
}

export const buildTaxRateSeedTargets = (
  products: ProductTaxSource[],
  requestedCountries: string[] = [],
  config: TaxRateSeedConfig = DEFAULT_TAX_RATE_SEED_CONFIG,
): TaxRateSeedTargets => {
  const requestedCountrySet = new Set(
    requestedCountries
      .map((countryCode) => normalizeCountryCode(countryCode))
      .filter(
        (countryCode): countryCode is string => countryCode !== undefined,
      ),
  )

  const defaultRatesByCountry = new Map<string, number>(
    config.defaultRates.flatMap(({ countryCode, rate }) => {
      const normalizedCountryCode = normalizeCountryCode(countryCode)
      const normalizedRate = parseRate(rate)
      if (normalizedCountryCode === undefined || normalizedRate === undefined) {
        return []
      }
      if (
        requestedCountrySet.size > 0 &&
        !requestedCountrySet.has(normalizedCountryCode)
      ) {
        return []
      }
      return [[normalizedCountryCode, normalizedRate]]
    }),
  )
  const productRateGroupsByCountry = new Map<string, Map<number, string[]>>()
  const productOverridesCountryCode = normalizeCountryCode(
    config.productOverrides?.countryCode,
  )
  if (productOverridesCountryCode === undefined) {
    return {
      defaultRatesByCountry,
      productRateGroupsByCountry,
    }
  }

  const defaultOverrideRate = defaultRatesByCountry.get(
    productOverridesCountryCode,
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
      product.metadata,
      config.productOverrides?.metadataPath,
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
      overrideProductRateGroups,
    )
  }

  return {
    defaultRatesByCountry,
    productRateGroupsByCountry,
  }
}

const mapCountryToRegion = (taxRegions: TaxRegionDTO[]) => {
  const countryToRegion = new Map<string, TaxRegionDTO>()

  for (const taxRegion of taxRegions) {
    const countryCode = normalizeCountryCode(taxRegion.country_code)
    if (countryCode !== undefined) {
      countryToRegion.set(countryCode, taxRegion)
    }
  }

  return countryToRegion
}

const buildProductRateKey = (countryCode: string, rate: number): string =>
  `${countryCode}:${rate.toFixed(4)}`

const formatTemplate = (
  template: string,
  countryCode: string,
  rate?: number,
): string => {
  const rateValue = rate === undefined ? "" : formatRateValue(rate)
  const rateCode = rateValue.replaceAll(/[^0-9]+/gu, "_")
  return template
    .replaceAll("{country}", countryCode.toLowerCase())
    .replaceAll("{COUNTRY}", countryCode.toUpperCase())
    .replaceAll("{rate}", rateValue)
    .replaceAll("{rate_code}", rateCode)
}

const buildDefaultRateCode = (
  countryCode: string,
  config: TaxRateSeedConfig,
): string =>
  formatTemplate(
    config.defaultRateCodeTemplate ?? DEFAULT_TAX_RATE_CODE_TEMPLATE,
    countryCode,
  )

const buildDefaultRateName = (
  countryCode: string,
  config: TaxRateSeedConfig,
): string =>
  formatTemplate(
    config.defaultRateNameTemplate ?? DEFAULT_TAX_RATE_NAME_TEMPLATE,
    countryCode,
  )

const buildProductRateCode = (
  countryCode: string,
  rate: number,
  config: TaxRateSeedConfig,
): string =>
  formatTemplate(
    config.productRateCodeTemplate ?? DEFAULT_PRODUCT_TAX_RATE_CODE_TEMPLATE,
    countryCode,
    rate,
  )

const buildProductRateName = (
  countryCode: string,
  rate: number,
  config: TaxRateSeedConfig,
): string =>
  formatTemplate(
    config.productRateNameTemplate ?? DEFAULT_PRODUCT_TAX_RATE_NAME_TEMPLATE,
    countryCode,
    rate,
  )

export const buildProductTaxRateIdentity = (
  countryCode: string,
  rate: number,
  config: TaxRateSeedConfig = DEFAULT_TAX_RATE_SEED_CONFIG,
) => ({
  code: buildProductRateCode(countryCode, rate, config),
  name: buildProductRateName(countryCode, rate, config),
})

const buildProductRules = (productIds: string[]): TaxRateRule[] =>
  [...new Set(productIds)].toSorted().map((productId) => ({
    reference: "product",
    reference_id: productId,
  }))

const areProductRulesEqual = (
  left: { reference: string; reference_id: string }[],
  right: { reference: string; reference_id: string }[],
): boolean => {
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

const emptyOutput = (): CreateTaxRatesStepOutput => ({
  created: [],
  updated: [],
})

const normalizeSeedCountries = (countries: string[] | undefined): string[] => [
  ...new Set(
    (countries ?? [])
      .map((countryCode) => normalizeCountryCode(countryCode))
      .filter(
        (countryCode): countryCode is string => countryCode !== undefined,
      ),
  ),
]

const buildExistingDefaultIndex = (
  existingRates: TaxRateDTO[],
): Map<string, TaxRateDTO> => {
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

const getSeededProductRateKey = (
  taxRate: TaxRateDTO,
  metadataSource: string,
): string | undefined => {
  const seedSource = getMetadataString(taxRate.metadata, "seed_source")
  const countryCode = normalizeCountryCode(
    getMetadataString(taxRate.metadata, "seed_country_code"),
  )
  const seedScope = getMetadataString(taxRate.metadata, "seed_scope")
  const seedRate = parseRate(getMetadataString(taxRate.metadata, "seed_rate"))

  if (
    seedSource !== metadataSource ||
    seedScope !== "product_rate" ||
    countryCode === undefined ||
    seedRate === undefined
  ) {
    return undefined
  }

  return buildProductRateKey(countryCode, seedRate)
}

const buildSeededProductRateIndex = (
  existingRates: TaxRateDTO[],
  config: TaxRateSeedConfig,
): Map<string, TaxRateDTO> => {
  const existingProductByKey = new Map<string, TaxRateDTO>()

  for (const taxRate of existingRates) {
    const key = getSeededProductRateKey(taxRate, config.metadataSource)
    if (key !== undefined) {
      existingProductByKey.set(key, taxRate)
    }
  }

  return existingProductByKey
}

const loadRulesByRateId = async (
  taxService: ITaxModuleService,
  nonDefaultRates: TaxRateDTO[],
): Promise<Map<string, TaxRateRule[]>> => {
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

const shouldIndexLegacyProductRate = (params: {
  taxRate: TaxRateDTO
  rules: TaxRateRule[]
  metadataSource: string
}): boolean => {
  const seedSource = getMetadataString(params.taxRate.metadata, "seed_source")
  const seedScope = getMetadataString(params.taxRate.metadata, "seed_scope")
  const hasOnlyProductRules =
    params.rules.length > 0 &&
    params.rules.every(
      (rule) => rule.reference === "product" && rule.reference_id.trim() !== "",
    )

  return (
    seedSource === params.metadataSource ||
    hasOnlyProductRules ||
    seedScope === "product"
  )
}

const addLegacyProductRateIndexes = (params: {
  nonDefaultRates: TaxRateDTO[]
  countryToRegion: Map<string, TaxRegionDTO>
  rulesByRateId: Map<string, TaxRateRule[]>
  existingProductByKey: Map<string, TaxRateDTO>
  config: TaxRateSeedConfig
}): void => {
  const countryByRegionId = new Map(
    [...params.countryToRegion.entries()].map(([countryCode, taxRegion]) => [
      taxRegion.id,
      countryCode,
    ]),
  )

  for (const taxRate of params.nonDefaultRates) {
    const countryCode = countryByRegionId.get(taxRate.tax_region_id)
    const rate = parseRate(taxRate.rate)
    if (countryCode === undefined || rate === undefined) {
      continue
    }

    const key = buildProductRateKey(countryCode, rate)
    const rules = params.rulesByRateId.get(taxRate.id) ?? []
    if (
      !params.existingProductByKey.has(key) &&
      shouldIndexLegacyProductRate({
        metadataSource: params.config.metadataSource,
        rules,
        taxRate,
      })
    ) {
      params.existingProductByKey.set(key, taxRate)
    }
  }
}

const buildExistingTaxRateIndexes = async (params: {
  taxService: ITaxModuleService
  countryToRegion: Map<string, TaxRegionDTO>
  existingRates: TaxRateDTO[]
  config: TaxRateSeedConfig
}): Promise<ExistingTaxRateIndexes> => {
  const existingDefaultByRegionId = buildExistingDefaultIndex(
    params.existingRates,
  )
  const existingProductByKey = buildSeededProductRateIndex(
    params.existingRates,
    params.config,
  )
  const nonDefaultRates = params.existingRates.filter(
    (taxRate) => !taxRate.is_default,
  )
  const rulesByRateId = await loadRulesByRateId(
    params.taxService,
    nonDefaultRates,
  )

  addLegacyProductRateIndexes({
    config: params.config,
    countryToRegion: params.countryToRegion,
    existingProductByKey,
    nonDefaultRates,
    rulesByRateId,
  })

  return {
    existingDefaultByRegionId,
    existingProductByKey,
    rulesByRateId,
  }
}

const addDefaultRatePlan = (params: {
  plan: TaxRateSeedPlan
  taxRegion: TaxRegionDTO
  countryCode: string
  defaultRate: number
  existingDefaultByRegionId: Map<string, TaxRateDTO>
  config: TaxRateSeedConfig
}): void => {
  const defaultName = buildDefaultRateName(params.countryCode, params.config)
  const defaultCode = buildDefaultRateCode(params.countryCode, params.config)
  const defaultMetadata = buildDefaultRateMetadata(
    params.countryCode,
    params.config,
  )
  const existingDefault = params.existingDefaultByRegionId.get(
    params.taxRegion.id,
  )

  if (!existingDefault) {
    params.plan.createPayloads.push({
      code: defaultCode,
      is_default: true,
      metadata: defaultMetadata,
      name: defaultName,
      rate: params.defaultRate,
      tax_region_id: params.taxRegion.id,
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
        code: defaultCode,
        is_default: true,
        metadata: defaultMetadata,
        name: defaultName,
        rate: params.defaultRate,
      },
    })
  }
}

const getProductRuleIds = (rules: TaxRateRule[]): string[] =>
  rules
    .filter(
      (rule) => rule.reference === "product" && rule.reference_id.trim() !== "",
    )
    .map((rule) => rule.reference_id)

const addProductRatePlan = (params: {
  plan: TaxRateSeedPlan
  taxRegion: TaxRegionDTO
  countryCode: string
  rate: number
  productIds: string[]
  existingProductByKey: Map<string, TaxRateDTO>
  rulesByRateId: Map<string, TaxRateRule[]>
  config: TaxRateSeedConfig
}): void => {
  const key = buildProductRateKey(params.countryCode, params.rate)
  const { code, name } = buildProductTaxRateIdentity(
    params.countryCode,
    params.rate,
    params.config,
  )
  const metadata = buildProductRateMetadata(
    params.countryCode,
    params.rate,
    params.config,
  )
  const existingProductRate = params.existingProductByKey.get(key)
  const existingRules = existingProductRate
    ? (params.rulesByRateId.get(existingProductRate.id) ?? [])
    : []
  const existingProductIds = getProductRuleIds(existingRules)
  const rules = buildProductRules([...existingProductIds, ...params.productIds])

  if (!existingProductRate) {
    params.plan.createPayloads.push({
      code,
      metadata,
      name,
      rate: params.rate,
      rules,
      tax_region_id: params.taxRegion.id,
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
        code,
        metadata,
        name,
        rate: params.rate,
        rules,
      },
    })
  }
}

const buildTaxRateSeedPlan = (params: {
  targets: TaxRateSeedTargets
  countryToRegion: Map<string, TaxRegionDTO>
  indexes: ExistingTaxRateIndexes
  config: TaxRateSeedConfig
}): TaxRateSeedPlan => {
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
      config: params.config,
      countryCode,
      defaultRate,
      existingDefaultByRegionId: params.indexes.existingDefaultByRegionId,
      plan,
      taxRegion,
    })

    const productRateGroups =
      params.targets.productRateGroupsByCountry.get(countryCode) ??
      new Map<number, string[]>()
    for (const [rate, productIds] of productRateGroups.entries()) {
      if (isSameRate(defaultRate, rate)) {
        continue
      }

      addProductRatePlan({
        config: params.config,
        countryCode,
        existingProductByKey: params.indexes.existingProductByKey,
        plan,
        productIds,
        rate,
        rulesByRateId: params.indexes.rulesByRateId,
        taxRegion,
      })
    }
  }

  return plan
}

const TAX_RATE_CREATE_CHUNK_SIZE = 250

const runCreateTaxRates = async (params: {
  container: WorkflowContainer
  createPayloads: CreateTaxRatesWorkflowInput
  created: TaxRateDTO[]
  offset?: number
}): Promise<void> => {
  const offset = params.offset ?? 0
  const chunk = params.createPayloads.slice(
    offset,
    offset + TAX_RATE_CREATE_CHUNK_SIZE,
  )
  if (chunk.length === 0) {
    return
  }

  const { result: createdChunk } = await createTaxRatesWorkflow(
    params.container,
  ).run({
    input: chunk,
  })
  params.created.push(...createdChunk)
  await runCreateTaxRates({
    ...params,
    offset: offset + TAX_RATE_CREATE_CHUNK_SIZE,
  })
}

const runUpdateTaxRates = async (params: {
  container: WorkflowContainer
  updatePayloads: UpdateTaxRatesWorkflowInput[]
  updated: TaxRateDTO[]
  offset?: number
}): Promise<void> => {
  const offset = params.offset ?? 0
  const updatePayload = params.updatePayloads[offset]
  if (updatePayload === undefined) {
    return
  }

  const { result: updatedChunk } = await updateTaxRatesWorkflow(
    params.container,
  ).run({
    input: updatePayload,
  })
  params.updated.push(...updatedChunk)
  await runUpdateTaxRates({ ...params, offset: offset + 1 })
}

export const createTaxRatesStep = createStep(
  CreateTaxRatesStepId,
  async (input: CreateTaxRatesStepInput, { container }) => {
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const productService = container.resolve<IProductModuleService>(
      Modules.PRODUCT,
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
      },
    )

    const taxRateTargets = buildTaxRateSeedTargets(
      products,
      normalizedSeedCountries,
      config,
    )

    if (taxRateTargets.defaultRatesByCountry.size === 0) {
      logger.warn(
        "No approved tax-rate countries configured, skipping tax rate seed",
      )
      return new StepResponse({ result: emptyOutput() })
    }

    const countries = [...taxRateTargets.defaultRatesByCountry.keys()]
    const taxRegions = await taxService.listTaxRegions({
      country_code: { $in: countries },
    })
    const countryToRegion = mapCountryToRegion(taxRegions)

    const missingCountries = countries.filter(
      (countryCode) => !countryToRegion.has(countryCode),
    )

    if (missingCountries.length > 0) {
      logger.warn(
        `Tax regions missing for countries: ${missingCountries.join(", ")}. These rates will be skipped.`,
      )
    }

    const regionIds = [...countryToRegion.values()].map(
      (taxRegion) => taxRegion.id,
    )

    if (regionIds.length === 0) {
      return new StepResponse({ result: emptyOutput() })
    }

    const existingRates = await taxService.listTaxRates({
      tax_region_id: regionIds,
    })
    const indexes = await buildExistingTaxRateIndexes({
      config,
      countryToRegion,
      existingRates,
      taxService,
    })
    const { createPayloads, updatePayloads } = buildTaxRateSeedPlan({
      config,
      countryToRegion,
      indexes,
      targets: taxRateTargets,
    })

    const created: TaxRateDTO[] = []
    const updated: TaxRateDTO[] = []
    await runCreateTaxRates({ container, createPayloads, created })
    await runUpdateTaxRates({ container, updatePayloads, updated })

    logger.info(
      `Tax rates seed complete: created ${created.length}, updated ${updated.length}`,
    )

    const output: CreateTaxRatesStepOutput = {
      created,
      updated,
    }

    return new StepResponse({ result: output })
  },
)
