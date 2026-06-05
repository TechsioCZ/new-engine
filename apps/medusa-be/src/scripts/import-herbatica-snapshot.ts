import { createHash } from "node:crypto"
import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import path from "node:path"
import type {
  ExecArgs,
  IFulfillmentModuleService,
  IProductModuleService,
  IRegionModuleService,
  ISalesChannelModuleService,
  IStoreModuleService,
  Logger,
  ProductCategoryDTO,
  ProductDTO,
  SalesChannelDTO,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  createRegionsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createSalesChannelsWorkflow,
  createShippingProfilesWorkflow,
  updateRegionsWorkflow,
  updateProductCategoriesWorkflow,
  updateProductsWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows"
import { HERBATICA_COUNTRIES } from "./herbatica-seed-config"

type JsonRecord = Record<string, unknown>

type SnapshotList<T> = {
  count?: number
  fetched_count?: number
} & Record<string, unknown> & {
    [key: string]: T[] | unknown
  }

type SnapshotCategory = {
  id: string
  name: string
  description?: string | null
  handle: string
  is_active?: boolean | null
  is_internal?: boolean | null
  metadata?: JsonRecord | null
  parent_category_id?: string | null
  rank?: number | null
}

type SnapshotSalesChannel = {
  id?: string
  name?: string | null
}

type SnapshotImage = {
  url?: string | null
}

type SnapshotOptionValue = {
  value?: string | null
  option_id?: string | null
  option?: {
    id?: string | null
    title?: string | null
  } | null
}

type SnapshotOption = {
  id?: string | null
  title?: string | null
  values?: SnapshotOptionValue[] | null
}

type SnapshotPrice = {
  amount?: number | string | null
  currency_code?: string | null
}

type SnapshotVariant = {
  id?: string
  title?: string | null
  sku?: string | null
  ean?: string | null
  material?: string | null
  metadata?: JsonRecord | null
  options?: SnapshotOptionValue[] | null
  prices?: SnapshotPrice[] | null
  thumbnail?: string | null
  weight?: number | null
}

type SnapshotProduct = {
  id: string
  title: string
  description?: string | null
  handle: string
  images?: SnapshotImage[] | null
  metadata?: JsonRecord | null
  sales_channels?: SnapshotSalesChannel[] | null
  status?: string | null
  thumbnail?: string | null
  variants?: SnapshotVariant[] | null
  options?: SnapshotOption[] | null
  weight?: number | null
}

type CliOptions = {
  snapshotDir: string
  batchSize: number
  categoriesOnly: boolean
  czkRate: number
  dryRun: boolean
  includeDrafts: boolean
  limit?: number
  offset: number
  rewriteHandles: boolean
  seoHandles: boolean
  skipExisting: boolean
  updateExisting: boolean
}

type NormalizedCategory = {
  snapshot: SnapshotCategory
  metadata: JsonRecord
}

type CategoryIndexes = {
  bySnapshotId: Map<string, SnapshotCategory>
  handleBySourceCategoryId: Map<string, string>
  handleBySourcePath: Map<string, string>
}

type ProductWorkflowInput = {
  title: string
  category_ids?: string[]
  description?: string
  handle: string
  weight?: number
  status?: ProductStatus
  metadata?: JsonRecord
  shipping_profile_id: string
  thumbnail?: string
  images: Array<{ url: string }>
  options: Array<{ title: string; values: string[] }>
  variants: Array<{
    title: string
    allow_backorder?: boolean
    sku: string
    ean?: string
    manage_inventory?: boolean
    material?: string
    options: Record<string, string>
    prices: Array<{ amount: number; currency_code: string }>
    thumbnail?: string
    weight?: number
    metadata?: JsonRecord
  }>
  sales_channels: Array<{ id: string }>
}

type PgConnection = {
  raw: (
    sql: string,
    bindings?: unknown[]
  ) => Promise<{ rows?: Record<string, unknown>[] }>
}

type ProductImportEntry = {
  desiredHandle: string
  legacyHandle: string
  product: SnapshotProduct
  sourceShopitemId?: string
  sourceSnapshotProductId: string
}

type ProductIdentityRow = {
  handle: string
  id: string
  sourceShopitemId?: string
  sourceSnapshotProductId?: string
}

type ExistingProductIndexes = {
  byHandle: Map<string, ProductDTO>
  bySourceShopitemId: Map<string, ProductDTO>
  bySourceSnapshotProductId: Map<string, ProductDTO>
}

const DEFAULT_BATCH_SIZE = 50
const DEFAULT_CZK_RATE = 25
const DEFAULT_SALES_CHANNEL_NAME = "Default Sales Channel"
const DEFAULT_SHIPPING_PROFILE_NAME = "Default Shipping Profile"
const HERBATICA_IMPORT_SOURCE = "herbatica-zane-demo-smoke-snapshot"
const MAX_HANDLE_LENGTH = 180
const HERBATICA_REGION_TARGETS = [
  {
    name: "Europe",
    currency_code: "eur",
    countries: HERBATICA_COUNTRIES.filter((country) => country !== "cz"),
  },
  {
    name: "Czechia",
    currency_code: "czk",
    countries: ["cz"],
  },
] as const
const PRODUCTS_FILE = "admin-products.json"
const CATEGORIES_FILE = "admin-product-categories.json"

function parseBooleanFlag(value: string | undefined): boolean {
  if (value === undefined) {
    return true
  }

  return !["0", "false", "no", "off"].includes(value.toLowerCase())
}

function parsePositiveInt(name: string, value: string | undefined): number {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Expected --${name} to be a positive integer`)
  }
  return parsed
}

function parseNonNegativeInt(name: string, value: string | undefined): number {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`Expected --${name} to be a non-negative integer`)
  }
  return parsed
}

function parsePositiveNumber(name: string, value: string | undefined): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Expected --${name} to be a positive number`)
  }
  return parsed
}

function readOptionValue(
  args: string[],
  index: number,
  raw: string,
  name: string
): { value: string | undefined; consumedNext: boolean } {
  const inlinePrefix = `--${name}=`
  if (raw.startsWith(inlinePrefix)) {
    return {
      value: raw.slice(inlinePrefix.length),
      consumedNext: false,
    }
  }

  const next = args[index + 1]
  if (!next || next.startsWith("--")) {
    return {
      value: undefined,
      consumedNext: false,
    }
  }

  return {
    value: next,
    consumedNext: true,
  }
}

function parseCliOptions(argv: string[]): CliOptions {
  const positionals: string[] = []
  const options: Omit<CliOptions, "snapshotDir"> = {
    batchSize: DEFAULT_BATCH_SIZE,
    categoriesOnly: false,
    czkRate: DEFAULT_CZK_RATE,
    dryRun: false,
    includeDrafts: false,
    offset: 0,
    rewriteHandles: false,
    seoHandles: false,
    skipExisting: true,
    updateExisting: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const raw = argv[index]
    if (!raw) {
      continue
    }

    if (
      raw === "--" ||
      raw === "exec" ||
      raw.endsWith("/import-herbatica-snapshot.ts") ||
      raw.endsWith("./src/scripts/import-herbatica-snapshot.ts")
    ) {
      continue
    }

    if (!raw.startsWith("--")) {
      positionals.push(raw)
      continue
    }

    if (raw === "--dry-run" || raw.startsWith("--dry-run=")) {
      const { value } = readOptionValue(argv, index, raw, "dry-run")
      options.dryRun = parseBooleanFlag(value)
      continue
    }

    if (raw === "--include-drafts" || raw.startsWith("--include-drafts=")) {
      const { value } = readOptionValue(argv, index, raw, "include-drafts")
      options.includeDrafts = parseBooleanFlag(value)
      continue
    }

    if (raw === "--categories-only" || raw.startsWith("--categories-only=")) {
      const { value } = readOptionValue(argv, index, raw, "categories-only")
      options.categoriesOnly = parseBooleanFlag(value)
      continue
    }

    if (raw === "--seo-handles" || raw.startsWith("--seo-handles=")) {
      const { value } = readOptionValue(argv, index, raw, "seo-handles")
      options.seoHandles = parseBooleanFlag(value)
      continue
    }

    if (raw === "--rewrite-handles" || raw.startsWith("--rewrite-handles=")) {
      const { value } = readOptionValue(argv, index, raw, "rewrite-handles")
      options.rewriteHandles = parseBooleanFlag(value)
      continue
    }

    if (raw === "--update-existing" || raw.startsWith("--update-existing=")) {
      const { value } = readOptionValue(argv, index, raw, "update-existing")
      options.updateExisting = parseBooleanFlag(value)
      options.skipExisting = !options.updateExisting
      continue
    }

    if (raw === "--skip-existing" || raw.startsWith("--skip-existing=")) {
      const { value } = readOptionValue(argv, index, raw, "skip-existing")
      options.skipExisting = parseBooleanFlag(value)
      options.updateExisting = !options.skipExisting
      continue
    }

    if (raw === "--limit" || raw.startsWith("--limit=")) {
      const { value, consumedNext } = readOptionValue(argv, index, raw, "limit")
      options.limit = parsePositiveInt("limit", value)
      if (consumedNext) {
        index += 1
      }
      continue
    }

    if (raw === "--offset" || raw.startsWith("--offset=")) {
      const { value, consumedNext } = readOptionValue(argv, index, raw, "offset")
      options.offset = parseNonNegativeInt("offset", value)
      if (consumedNext) {
        index += 1
      }
      continue
    }

    if (raw === "--batch-size" || raw.startsWith("--batch-size=")) {
      const { value, consumedNext } = readOptionValue(
        argv,
        index,
        raw,
        "batch-size"
      )
      options.batchSize = parsePositiveInt("batch-size", value)
      if (consumedNext) {
        index += 1
      }
      continue
    }

    if (raw === "--czk-rate" || raw.startsWith("--czk-rate=")) {
      const { value, consumedNext } = readOptionValue(
        argv,
        index,
        raw,
        "czk-rate"
      )
      options.czkRate = parsePositiveNumber("czk-rate", value)
      if (consumedNext) {
        index += 1
      }
      continue
    }

    throw new Error(`Unknown option "${raw}"`)
  }

  const snapshotDir = positionals[0]
  if (!snapshotDir) {
    throw new Error(
      `Usage: medusa exec ./src/scripts/import-herbatica-snapshot.ts <snapshot-dir> [--limit N] [--offset N] [--include-drafts] [--update-existing] [--seo-handles] [--rewrite-handles] [--dry-run]`
    )
  }

  if (options.rewriteHandles) {
    options.seoHandles = true
    options.updateExisting = true
    options.skipExisting = false
  }

  return {
    ...options,
    snapshotDir,
  }
}

async function readSnapshotList<T>(
  snapshotDir: string,
  fileName: string,
  key: string
): Promise<T[]> {
  const filePath = path.join(snapshotDir, fileName)
  if (!existsSync(filePath)) {
    throw new Error(`Snapshot file not found: ${filePath}`)
  }

  const parsed = JSON.parse(await readFile(filePath, "utf8")) as SnapshotList<T>
  const value = parsed[key]

  if (!Array.isArray(value)) {
    throw new Error(`Expected ${fileName} to contain an array at "${key}"`)
  }

  return value as T[]
}

function asMetadata(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {}
  }

  return { ...(value as JsonRecord) }
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  return
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  return
}

function uniqueStrings(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => !!value))]
}

function chunk<T>(input: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let index = 0; index < input.length; index += size) {
    chunks.push(input.slice(index, index + size))
  }
  return chunks
}

function roundPrice(amount: number): number {
  return Math.round(amount * 100) / 100
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

function shortHash(value: string): string {
  return createHash("sha1").update(value).digest("hex").slice(0, 8)
}

function sourceShopitemId(product: SnapshotProduct): string | undefined {
  return asString(asMetadata(product.metadata).source_shopitem_id)
}

function buildSeoProductHandle(product: SnapshotProduct): string {
  const suffix =
    slugify(sourceShopitemId(product) ?? "") ||
    shortHash(asString(asMetadata(product.metadata).source_guid) ?? product.id)
  const base =
    slugify(product.title) || slugify(product.handle) || `product-${suffix}`
  const maxBaseLength = Math.max(1, MAX_HANDLE_LENGTH - suffix.length - 1)
  const trimmedBase = base.slice(0, maxBaseLength).replace(/-+$/g, "")

  return `${trimmedBase || "product"}-${suffix}`
}

function normalizeStatus(product: SnapshotProduct): ProductStatus {
  return product.status === ProductStatus.PUBLISHED
    ? ProductStatus.PUBLISHED
    : ProductStatus.DRAFT
}

function normalizeCategories(
  categories: SnapshotCategory[]
): NormalizedCategory[] {
  return categories
    .filter((category) => category.handle && category.name)
    .map((category) => ({
      snapshot: category,
      metadata: {
        ...asMetadata(category.metadata),
        source_snapshot_category_id: category.id,
        source_snapshot_import: HERBATICA_IMPORT_SOURCE,
      },
    }))
}

function buildCategoryIndexes(categories: SnapshotCategory[]): CategoryIndexes {
  const bySnapshotId = new Map<string, SnapshotCategory>()
  const handleBySourceCategoryId = new Map<string, string>()
  const handleBySourcePath = new Map<string, string>()

  for (const category of categories) {
    bySnapshotId.set(category.id, category)

    const metadata = asMetadata(category.metadata)
    const sourceCategoryId = asString(metadata.source_category_id)
    if (sourceCategoryId) {
      handleBySourceCategoryId.set(sourceCategoryId, category.handle)
    }

    const sourcePath = asString(metadata.source_path)
    if (sourcePath) {
      handleBySourcePath.set(sourcePath, category.handle)
    }
  }

  return {
    bySnapshotId,
    handleBySourceCategoryId,
    handleBySourcePath,
  }
}

async function listCategoriesByHandle(
  productService: IProductModuleService,
  handles: string[]
): Promise<Map<string, ProductCategoryDTO>> {
  const result = new Map<string, ProductCategoryDTO>()

  for (const handleBatch of chunk(uniqueStrings(handles), 100)) {
    if (handleBatch.length === 0) {
      continue
    }

    const categories = await productService.listProductCategories(
      { handle: handleBatch },
      {
        select: ["id", "name", "handle", "parent_category_id"],
      }
    )

    for (const category of categories) {
      if (category.handle) {
        result.set(category.handle, category)
      }
    }
  }

  return result
}

async function importCategories(
  container: ExecArgs["container"],
  options: CliOptions,
  logger: Logger,
  productService: IProductModuleService,
  categories: SnapshotCategory[]
) {
  const normalizedCategories = normalizeCategories(categories)
  const handles = normalizedCategories.map(({ snapshot }) => snapshot.handle)
  const existingByHandle = await listCategoriesByHandle(productService, handles)
  const missingCategories = normalizedCategories.filter(
    ({ snapshot }) => !existingByHandle.has(snapshot.handle)
  )

  logger.info(
    `Herbatica snapshot categories: ${normalizedCategories.length} total, ${missingCategories.length} missing`
  )

  if (options.dryRun) {
    return {
      created: 0,
      updated: 0,
      parentLinked: 0,
    }
  }

  for (const categoryBatch of chunk(missingCategories, 100)) {
    await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: categoryBatch.map(({ snapshot, metadata }) => ({
          name: snapshot.name,
          description: snapshot.description ?? undefined,
          handle: snapshot.handle,
          is_active: snapshot.is_active ?? true,
          is_internal: snapshot.is_internal ?? false,
          metadata,
          rank: snapshot.rank ?? undefined,
        })),
      },
    })
  }

  const currentByHandle = await listCategoriesByHandle(productService, handles)
  let updated = 0
  let parentLinked = 0

  for (const { snapshot, metadata } of normalizedCategories) {
    const current = currentByHandle.get(snapshot.handle)
    if (!current) {
      throw new Error(`Could not resolve category after import: ${snapshot.handle}`)
    }

    await updateProductCategoriesWorkflow(container).run({
      input: {
        selector: {
          id: current.id,
        },
        update: {
          name: snapshot.name,
          description: snapshot.description ?? undefined,
          handle: snapshot.handle,
          is_active: snapshot.is_active ?? true,
          is_internal: snapshot.is_internal ?? false,
          metadata,
          rank: snapshot.rank ?? undefined,
        },
      },
    })
    updated += 1
  }

  const categoryIndexes = buildCategoryIndexes(categories)

  for (const { snapshot } of normalizedCategories) {
    const current = currentByHandle.get(snapshot.handle)
    if (!current) {
      continue
    }

    const parentHandle = snapshot.parent_category_id
      ? categoryIndexes.bySnapshotId.get(snapshot.parent_category_id)?.handle
      : undefined
    const parentId = parentHandle
      ? currentByHandle.get(parentHandle)?.id
      : null

    if (snapshot.parent_category_id && !parentId) {
      logger.warn(
        `Skipping parent link for category "${snapshot.handle}"; parent snapshot id "${snapshot.parent_category_id}" was not found`
      )
      continue
    }

    await updateProductCategoriesWorkflow(container).run({
      input: {
        selector: {
          id: current.id,
        },
        update: {
          parent_category_id: parentId,
        },
      },
    })

    if (parentId) {
      parentLinked += 1
    }
  }

  return {
    created: missingCategories.length,
    updated,
    parentLinked,
  }
}

async function ensureSalesChannel(
  salesChannelService: ISalesChannelModuleService,
  container: ExecArgs["container"],
  requestedNames: string[]
): Promise<SalesChannelDTO> {
  const names = uniqueStrings([
    ...requestedNames,
    DEFAULT_SALES_CHANNEL_NAME,
  ])

  const existing = await salesChannelService.listSalesChannels({
    name: names,
  })

  const defaultExisting =
    existing.find((channel) => channel.name === DEFAULT_SALES_CHANNEL_NAME) ??
    existing[0]

  if (defaultExisting) {
    return defaultExisting
  }

  const { result } = await createSalesChannelsWorkflow(container).run({
    input: {
      salesChannelsData: [{ name: DEFAULT_SALES_CHANNEL_NAME }],
    },
  })

  const created = result[0]
  if (!created) {
    throw new Error("Could not create default sales channel")
  }

  return created
}

async function ensureDefaultShippingProfile(
  fulfillmentService: IFulfillmentModuleService,
  container: ExecArgs["container"]
) {
  const existing = await fulfillmentService.listShippingProfiles({
    type: "default",
  })
  const matching =
    existing.find((profile) => profile.name === DEFAULT_SHIPPING_PROFILE_NAME) ??
    existing[0]

  if (matching) {
    return matching
  }

  const { result } = await createShippingProfilesWorkflow(container).run({
    input: {
      data: [
        {
          name: DEFAULT_SHIPPING_PROFILE_NAME,
          type: "default",
        },
      ],
    },
  })

  const created = result[0]
  if (!created) {
    throw new Error("Could not create default shipping profile")
  }

  return created
}

async function ensureStoreCurrencies(
  storeService: IStoreModuleService,
  container: ExecArgs["container"]
) {
  const [store] = await storeService.listStores()
  if (!store) {
    return
  }

  const existingCurrencies = (store.supported_currencies ?? []).map(
    (currency) => ({
      currency_code: currency.currency_code.toLowerCase(),
      is_default: currency.is_default,
    })
  )
  const existingByCode = new Map(
    existingCurrencies.map((currency) => [currency.currency_code, currency])
  )

  if (!existingByCode.has("eur")) {
    existingCurrencies.push({
      currency_code: "eur",
      is_default: existingCurrencies.length === 0,
    })
  }

  if (!existingByCode.has("czk")) {
    existingCurrencies.push({
      currency_code: "czk",
      is_default: existingCurrencies.length === 0,
    })
  }

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        supported_currencies: existingCurrencies,
      },
    },
  })
}

function regionCountryCodes(region: {
  countries?: Array<{ iso_2?: string | null } | string> | null
}): string[] {
  return uniqueStrings(
    (region.countries ?? []).map((country) =>
      typeof country === "string" ? country : country.iso_2 ?? undefined
    )
  ).map((country) => country.toLowerCase())
}

async function listRegionsWithCountries(regionService: IRegionModuleService) {
  return await regionService.listRegions(
    {},
    {
      relations: ["countries"],
    }
  )
}

async function ensureHerbaticaRegions(input: {
  container: ExecArgs["container"]
  dryRun: boolean
  logger: Logger
  regionService: IRegionModuleService
}) {
  let created = 0
  let updated = 0
  let conflicts = 0

  for (const target of HERBATICA_REGION_TARGETS) {
    const regions = await listRegionsWithCountries(input.regionService)
    const existingRegion = regions.find((region) => region.name === target.name)
    const ownerByCountry = new Map<string, { id: string; name: string }>()

    for (const region of regions) {
      for (const countryCode of regionCountryCodes(region)) {
        ownerByCountry.set(countryCode, {
          id: region.id,
          name: region.name,
        })
      }
    }

    const assignableCountries = target.countries.filter((countryCode) => {
      const owner = ownerByCountry.get(countryCode)
      if (!owner || owner.id === existingRegion?.id) {
        return true
      }

      conflicts += 1
      input.logger.warn(
        `Country "${countryCode}" is already assigned to region "${owner.name}", leaving it out of "${target.name}"`
      )
      return false
    })

    input.logger.info(
      `Ensuring region "${target.name}" (${target.currency_code}) with countries: ${assignableCountries.join(", ")}`
    )

    if (input.dryRun) {
      continue
    }

    if (existingRegion) {
      await updateRegionsWorkflow(input.container).run({
        input: {
          selector: {
            id: existingRegion.id,
          },
          update: {
            name: target.name,
            currency_code: target.currency_code,
            countries: assignableCountries,
            automatic_taxes: true,
            is_tax_inclusive: true,
          },
        },
      })
      updated += 1
      continue
    }

    await createRegionsWorkflow(input.container).run({
      input: {
        regions: [
          {
            name: target.name,
            currency_code: target.currency_code,
            countries: assignableCountries,
            automatic_taxes: true,
            is_tax_inclusive: true,
            payment_providers: ["pp_system_default"],
          },
        ],
      },
    })
    created += 1
  }

  return {
    conflicts,
    created,
    updated,
  }
}

function requestedSalesChannelNames(products: SnapshotProduct[]): string[] {
  return uniqueStrings(
    products.flatMap((product) =>
      (product.sales_channels ?? []).map(
        (salesChannel) => salesChannel.name ?? undefined
      )
    )
  )
}

function categoryHandlesForProduct(
  product: SnapshotProduct,
  categoryIndexes: CategoryIndexes
): string[] {
  const metadata = asMetadata(product.metadata)
  const categoryHandles: string[] = []
  const sourceCategoryIds = Array.isArray(metadata.source_category_ids)
    ? metadata.source_category_ids
    : []

  for (const sourceCategoryId of sourceCategoryIds) {
    const handle = categoryIndexes.handleBySourceCategoryId.get(
      String(sourceCategoryId)
    )
    if (handle) {
      categoryHandles.push(handle)
    }
  }

  const categoryRefs = Array.isArray(metadata.category_refs)
    ? metadata.category_refs
    : []
  for (const categoryRef of categoryRefs) {
    if (!categoryRef || typeof categoryRef !== "object") {
      continue
    }

    const categoryRefRecord = categoryRef as JsonRecord
    const sourceCategoryId = asString(categoryRefRecord.id)
    const sourcePath = asString(categoryRefRecord.path)
    const handle = sourceCategoryId
      ? categoryIndexes.handleBySourceCategoryId.get(sourceCategoryId)
      : sourcePath
        ? categoryIndexes.handleBySourcePath.get(sourcePath)
        : undefined
    if (handle) {
      categoryHandles.push(handle)
    }
  }

  const categoryPaths = Array.isArray(metadata.category_paths)
    ? metadata.category_paths
    : []
  for (const sourcePath of categoryPaths) {
    const handle = categoryIndexes.handleBySourcePath.get(String(sourcePath))
    if (handle) {
      categoryHandles.push(handle)
    }
  }

  return uniqueStrings(categoryHandles)
}

function normalizeImages(product: SnapshotProduct): Array<{ url: string }> {
  const urls = uniqueStrings([
    product.thumbnail ?? undefined,
    ...(product.images ?? []).map((image) => image.url ?? undefined),
  ])

  return urls.map((url) => ({ url }))
}

function normalizeOptions(product: SnapshotProduct): Array<{
  title: string
  values: string[]
}> {
  const options = (product.options ?? [])
    .map((option) => ({
      title: option.title?.trim() || "Variant",
      values: uniqueStrings(
        (option.values ?? []).map((value) => value.value ?? undefined)
      ),
    }))
    .filter((option) => option.values.length > 0)

  if (options.length > 0) {
    return options
  }

  return [
    {
      title: "Variant",
      values: ["Default"],
    },
  ]
}

function optionTitleById(product: SnapshotProduct): Map<string, string> {
  const result = new Map<string, string>()

  for (const option of product.options ?? []) {
    if (option.id && option.title) {
      result.set(option.id, option.title)
    }
  }

  return result
}

function normalizeVariantOptions(
  product: SnapshotProduct,
  variant: SnapshotVariant,
  productOptions: Array<{ title: string; values: string[] }>
): Record<string, string> {
  const result: Record<string, string> = {}
  const titleByOptionId = optionTitleById(product)

  for (const optionValue of variant.options ?? []) {
    const title =
      optionValue.option?.title ??
      (optionValue.option_id
        ? titleByOptionId.get(optionValue.option_id)
        : undefined)
    const value = optionValue.value

    if (title && value) {
      result[title] = value
    }
  }

  for (const productOption of productOptions) {
    if (!result[productOption.title]) {
      result[productOption.title] =
        productOption.values.find((value) => value === variant.title) ??
        productOption.values[0] ??
        "Default"
    }
  }

  return result
}

function normalizePrices(
  variant: SnapshotVariant,
  czkRate: number
): Array<{ amount: number; currency_code: string }> {
  const prices: Array<{ amount: number; currency_code: string }> = []

  for (const price of variant.prices ?? []) {
    const amount = asNumber(price.amount)
    const currencyCode = price.currency_code?.toLowerCase()
    if (amount === undefined || !currencyCode) {
      continue
    }

    prices.push({
      amount,
      currency_code: currencyCode,
    })
  }

  const metadata = asMetadata(variant.metadata)
  const fallbackEurAmount =
    asNumber(metadata.current_price) ??
    asNumber(metadata.price_vat) ??
    asNumber(metadata.standard_price)

  if (!prices.some((price) => price.currency_code === "eur")) {
    if (fallbackEurAmount !== undefined) {
      prices.push({
        amount: fallbackEurAmount,
        currency_code: "eur",
      })
    }
  }

  const eurPrice =
    prices.find((price) => price.currency_code === "eur")?.amount ??
    fallbackEurAmount
  if (
    eurPrice !== undefined &&
    !prices.some((price) => price.currency_code === "czk")
  ) {
    prices.push({
      amount: roundPrice(eurPrice * czkRate),
      currency_code: "czk",
    })
  }

  const deduped = new Map<string, { amount: number; currency_code: string }>()
  for (const price of prices) {
    if (!deduped.has(price.currency_code)) {
      deduped.set(price.currency_code, price)
    }
  }

  return [...deduped.values()]
}

function normalizeVariants(
  product: SnapshotProduct,
  productOptions: Array<{ title: string; values: string[] }>,
  czkRate: number
): ProductWorkflowInput["variants"] {
  const variants = product.variants ?? []

  if (variants.length === 0) {
    return [
      {
        title: "Default",
        sku: `HERBATICA-${product.handle}`,
        options: Object.fromEntries(
          productOptions.map((option) => [
            option.title,
            option.values[0] ?? "Default",
          ])
        ),
        prices: [],
        allow_backorder: true,
        manage_inventory: false,
        metadata: {
          source_snapshot_import: HERBATICA_IMPORT_SOURCE,
        },
      },
    ]
  }

  return variants.map((variant, index) => {
    const metadata = {
      ...asMetadata(variant.metadata),
      source_snapshot_import: HERBATICA_IMPORT_SOURCE,
      source_snapshot_variant_id: variant.id,
    }

    return {
      title: variant.title?.trim() || `Variant ${index + 1}`,
      sku:
        variant.sku?.trim() ||
        `HERBATICA-${product.handle}-VARIANT-${index + 1}`,
      ean: variant.ean ?? undefined,
      material: variant.material ?? undefined,
      options: normalizeVariantOptions(product, variant, productOptions),
      prices: normalizePrices(variant, czkRate),
      allow_backorder: true,
      manage_inventory: false,
      thumbnail: variant.thumbnail ?? undefined,
      weight: variant.weight ?? undefined,
      metadata,
    }
  })
}

function normalizeProductForWorkflow(input: {
  categoryHandleToId: Map<string, string>
  categoryIndexes: CategoryIndexes
  czkRate: number
  desiredHandle: string
  product: SnapshotProduct
  salesChannelId: string
  shippingProfileId: string
}): ProductWorkflowInput {
  const productOptions = normalizeOptions(input.product)
  const categoryIds = categoryHandlesForProduct(
    input.product,
    input.categoryIndexes
  )
    .map((handle) => input.categoryHandleToId.get(handle))
    .filter((id): id is string => !!id)
  const images = normalizeImages(input.product)
  const thumbnail =
    input.product.thumbnail ?? images[0]?.url ?? undefined
  const metadata = {
    ...asMetadata(input.product.metadata),
    demo_czk_rate: input.czkRate,
    source_snapshot_import: HERBATICA_IMPORT_SOURCE,
    source_snapshot_product_id: input.product.id,
  }

  return {
    title: input.product.title,
    category_ids: categoryIds,
    description: input.product.description ?? "",
    handle: input.desiredHandle,
    weight: input.product.weight ?? undefined,
    status: normalizeStatus(input.product),
    metadata,
    shipping_profile_id: input.shippingProfileId,
    thumbnail,
    images,
    options: productOptions,
    variants: normalizeVariants(input.product, productOptions, input.czkRate),
    sales_channels: [{ id: input.salesChannelId }],
  }
}

async function listProductsByHandle(
  productService: IProductModuleService,
  handles: string[]
): Promise<Map<string, ProductDTO>> {
  const result = new Map<string, ProductDTO>()

  for (const handleBatch of chunk(uniqueStrings(handles), 100)) {
    if (handleBatch.length === 0) {
      continue
    }

    const products = await productService.listProducts(
      { handle: handleBatch },
      {
        relations: ["variants", "variants.options"],
        select: [
          "id",
          "handle",
          "metadata",
          "variants.*",
          "variants.options.*",
        ],
      }
    )

    for (const product of products) {
      if (product.handle) {
        result.set(product.handle, product)
      }
    }
  }

  return result
}

async function listProductsById(
  productService: IProductModuleService,
  ids: string[]
): Promise<Map<string, ProductDTO>> {
  const result = new Map<string, ProductDTO>()

  for (const idBatch of chunk(uniqueStrings(ids), 100)) {
    if (idBatch.length === 0) {
      continue
    }

    const products = await productService.listProducts(
      { id: idBatch },
      {
        relations: ["variants", "variants.options"],
        select: [
          "id",
          "handle",
          "metadata",
          "variants.*",
          "variants.options.*",
        ],
      }
    )

    for (const product of products) {
      result.set(product.id, product)
    }
  }

  return result
}

function identityRows(
  result: { rows?: Record<string, unknown>[] }
): ProductIdentityRow[] {
  const rows: ProductIdentityRow[] = []

  for (const rawRow of result.rows ?? []) {
    const handle = asString(rawRow.handle)
    const id = asString(rawRow.id)
    if (!handle || !id) {
      continue
    }

    const row: ProductIdentityRow = {
      handle,
      id,
    }
    const sourceShopitemId = asString(rawRow.source_shopitem_id)
    if (sourceShopitemId) {
      row.sourceShopitemId = sourceShopitemId
    }
    const sourceSnapshotProductId = asString(rawRow.source_snapshot_product_id)
    if (sourceSnapshotProductId) {
      row.sourceSnapshotProductId = sourceSnapshotProductId
    }
    rows.push(row)
  }

  return rows
}

async function listProductIdentityRows(
  pgConnection: PgConnection,
  entries: ProductImportEntry[]
): Promise<ProductIdentityRow[]> {
  const sourceSnapshotProductIds = uniqueStrings(
    entries.map((entry) => entry.sourceSnapshotProductId)
  )
  const sourceShopitemIds = uniqueStrings(
    entries.map((entry) => entry.sourceShopitemId)
  )
  const result = new Map<string, ProductIdentityRow>()

  for (const idBatch of chunk(sourceSnapshotProductIds, 100)) {
    if (idBatch.length === 0) {
      continue
    }

    const placeholders = idBatch.map(() => "?").join(", ")
    const rows = identityRows(
      await pgConnection.raw(
        `select id, handle, metadata ->> 'source_snapshot_product_id' as source_snapshot_product_id, metadata ->> 'source_shopitem_id' as source_shopitem_id from product where deleted_at is null and metadata ->> 'source_snapshot_product_id' in (${placeholders})`,
        idBatch
      )
    )

    for (const row of rows) {
      result.set(row.id, row)
    }
  }

  for (const idBatch of chunk(sourceShopitemIds, 100)) {
    if (idBatch.length === 0) {
      continue
    }

    const placeholders = idBatch.map(() => "?").join(", ")
    const rows = identityRows(
      await pgConnection.raw(
        `select id, handle, metadata ->> 'source_snapshot_product_id' as source_snapshot_product_id, metadata ->> 'source_shopitem_id' as source_shopitem_id from product where deleted_at is null and metadata ->> 'source_shopitem_id' in (${placeholders})`,
        idBatch
      )
    )

    for (const row of rows) {
      result.set(row.id, row)
    }
  }

  return [...result.values()]
}

function setUniqueProduct(
  map: Map<string, ProductDTO>,
  key: string | undefined,
  product: ProductDTO,
  label: string
) {
  if (!key) {
    return
  }

  const existing = map.get(key)
  if (existing && existing.id !== product.id) {
    throw new Error(
      `Found multiple existing products for ${label} "${key}": ${existing.handle}, ${product.handle}`
    )
  }

  map.set(key, product)
}

async function listExistingProductIndexes(
  productService: IProductModuleService,
  pgConnection: PgConnection,
  entries: ProductImportEntry[]
): Promise<ExistingProductIndexes> {
  const productsByHandle = await listProductsByHandle(
    productService,
    entries.flatMap((entry) => [entry.legacyHandle, entry.desiredHandle])
  )
  const identityRowList = await listProductIdentityRows(pgConnection, entries)
  const productsByIdentityId = await listProductsById(
    productService,
    identityRowList.map((row) => row.id)
  )
  const byHandle = new Map(productsByHandle)
  const bySourceShopitemId = new Map<string, ProductDTO>()
  const bySourceSnapshotProductId = new Map<string, ProductDTO>()

  for (const row of identityRowList) {
    const product =
      productsByIdentityId.get(row.id) ?? productsByHandle.get(row.handle)
    if (!product) {
      continue
    }

    byHandle.set(product.handle, product)
    setUniqueProduct(
      bySourceSnapshotProductId,
      row.sourceSnapshotProductId,
      product,
      "source_snapshot_product_id"
    )
    setUniqueProduct(
      bySourceShopitemId,
      row.sourceShopitemId,
      product,
      "source_shopitem_id"
    )
  }

  return {
    byHandle,
    bySourceShopitemId,
    bySourceSnapshotProductId,
  }
}

function buildProductImportEntries(
  products: SnapshotProduct[],
  options: CliOptions
): ProductImportEntry[] {
  return products.map((product) => ({
    desiredHandle: options.seoHandles
      ? buildSeoProductHandle(product)
      : product.handle,
    legacyHandle: product.handle,
    product,
    sourceShopitemId: sourceShopitemId(product),
    sourceSnapshotProductId: product.id,
  }))
}

function isSameSourceProduct(
  product: ProductDTO,
  entry: ProductImportEntry
): boolean {
  const metadata = asMetadata(product.metadata)

  return (
    asString(metadata.source_snapshot_product_id) ===
      entry.sourceSnapshotProductId ||
    (!!entry.sourceShopitemId &&
      asString(metadata.source_shopitem_id) === entry.sourceShopitemId)
  )
}

function resolveExistingProduct(
  indexes: ExistingProductIndexes,
  entry: ProductImportEntry
): ProductDTO | undefined {
  return (
    indexes.bySourceSnapshotProductId.get(entry.sourceSnapshotProductId) ??
    (entry.sourceShopitemId
      ? indexes.bySourceShopitemId.get(entry.sourceShopitemId)
      : undefined) ??
    indexes.byHandle.get(entry.legacyHandle)
  )
}

function assertNoHandleConflicts(
  indexes: ExistingProductIndexes,
  entries: ProductImportEntry[],
  existingBySourceSnapshotId: Map<string, ProductDTO>,
  rewriteHandles: boolean
) {
  const seenDesiredHandles = new Map<string, string>()

  for (const entry of entries) {
    const seenSourceId = seenDesiredHandles.get(entry.desiredHandle)
    if (seenSourceId && seenSourceId !== entry.sourceSnapshotProductId) {
      throw new Error(
        `Generated duplicate handle "${entry.desiredHandle}" for snapshot products "${seenSourceId}" and "${entry.sourceSnapshotProductId}"`
      )
    }
    seenDesiredHandles.set(entry.desiredHandle, entry.sourceSnapshotProductId)

    const existingProduct = existingBySourceSnapshotId.get(
      entry.sourceSnapshotProductId
    )
    if (existingProduct && !rewriteHandles) {
      continue
    }

    const handleOwner = indexes.byHandle.get(entry.desiredHandle)
    if (!handleOwner || handleOwner.id === existingProduct?.id) {
      continue
    }

    if (isSameSourceProduct(handleOwner, entry)) {
      continue
    }

    throw new Error(
      `Cannot use generated handle "${entry.desiredHandle}" for snapshot product "${entry.sourceSnapshotProductId}"; existing product "${handleOwner.id}" already uses it`
    )
  }
}

function updateProductInput(
  existingProduct: ProductDTO,
  product: ProductWorkflowInput,
  options: Pick<CliOptions, "rewriteHandles">
) {
  return {
    id: existingProduct.id,
    ...(options.rewriteHandles ? { handle: product.handle } : {}),
    title: product.title,
    categories: product.category_ids?.map((id) => ({ id })),
    description: product.description,
    weight: product.weight,
    status: product.status,
    metadata: product.metadata,
    shipping_profile_id: product.shipping_profile_id,
    thumbnail: product.thumbnail,
    images: product.images,
    options: product.options,
    variants: product.variants.map((variant) => {
      const existingVariant = (existingProduct.variants ?? []).find(
        (candidate) => candidate.sku === variant.sku
      )

      return existingVariant
        ? {
            ...variant,
            id: existingVariant.id,
          }
        : variant
    }),
    sales_channels: product.sales_channels,
  }
}

async function importProducts(input: {
  categoryHandleToId: Map<string, string>
  categoryIndexes: CategoryIndexes
  container: ExecArgs["container"]
  logger: Logger
  options: CliOptions
  pgConnection: PgConnection
  products: SnapshotProduct[]
  productService: IProductModuleService
  salesChannelId: string
  shippingProfileId: string
}) {
  const selectedProducts = input.products
    .filter((product) =>
      input.options.includeDrafts
        ? true
        : product.status === ProductStatus.PUBLISHED
    )
    .slice(
      input.options.offset,
      input.options.limit
        ? input.options.offset + input.options.limit
        : undefined
    )
  const productEntries = buildProductImportEntries(
    selectedProducts,
    input.options
  )
  const existingIndexes = await listExistingProductIndexes(
    input.productService,
    input.pgConnection,
    productEntries
  )
  const existingBySourceSnapshotId = new Map<string, ProductDTO>()

  for (const entry of productEntries) {
    const existingProduct = resolveExistingProduct(existingIndexes, entry)
    if (existingProduct) {
      existingBySourceSnapshotId.set(
        entry.sourceSnapshotProductId,
        existingProduct
      )
    }
  }

  assertNoHandleConflicts(
    existingIndexes,
    productEntries,
    existingBySourceSnapshotId,
    input.options.rewriteHandles
  )

  const productsToCreate = productEntries.filter(
    (entry) => !existingBySourceSnapshotId.has(entry.sourceSnapshotProductId)
  )
  const productsToUpdate = input.options.updateExisting
    ? productEntries.filter((entry) =>
        existingBySourceSnapshotId.has(entry.sourceSnapshotProductId)
      )
    : []
  const skippedExisting =
    productEntries.length - productsToCreate.length - productsToUpdate.length
  const handleRewrites = input.options.rewriteHandles
    ? productsToUpdate.filter((entry) => {
        const existingProduct = existingBySourceSnapshotId.get(
          entry.sourceSnapshotProductId
        )
        return existingProduct?.handle !== entry.desiredHandle
      }).length
    : 0

  input.logger.info(
    `Herbatica snapshot products: ${input.products.length} total, ${selectedProducts.length} selected, ${productsToCreate.length} missing, ${productsToUpdate.length} update, ${skippedExisting} skipped existing, ${handleRewrites} handle rewrites`
  )

  if (input.options.dryRun || input.options.categoriesOnly) {
    return {
      created: 0,
      updated: 0,
      skippedExisting,
      selected: selectedProducts.length,
    }
  }

  let created = 0
  let updated = 0

  for (const productBatch of chunk(
    productsToCreate,
    input.options.batchSize
  )) {
    const workflowProducts = productBatch.map((entry) =>
      normalizeProductForWorkflow({
        categoryHandleToId: input.categoryHandleToId,
        categoryIndexes: input.categoryIndexes,
        czkRate: input.options.czkRate,
        desiredHandle: entry.desiredHandle,
        product: entry.product,
        salesChannelId: input.salesChannelId,
        shippingProfileId: input.shippingProfileId,
      })
    )

    await createProductsWorkflow(input.container).run({
      input: {
        products: workflowProducts,
      },
    })

    created += workflowProducts.length
    input.logger.info(
      `Created ${created}/${productsToCreate.length} Herbatica products`
    )
  }

  for (const productBatch of chunk(
    productsToUpdate,
    input.options.batchSize
  )) {
    for (const entry of productBatch) {
      const existingProduct = existingBySourceSnapshotId.get(
        entry.sourceSnapshotProductId
      )
      if (!existingProduct) {
        continue
      }

      const workflowProduct = normalizeProductForWorkflow({
        categoryHandleToId: input.categoryHandleToId,
        categoryIndexes: input.categoryIndexes,
        czkRate: input.options.czkRate,
        desiredHandle: entry.desiredHandle,
        product: entry.product,
        salesChannelId: input.salesChannelId,
        shippingProfileId: input.shippingProfileId,
      })

      await updateProductsWorkflow(input.container).run({
        input: {
          selector: {
            id: existingProduct.id,
          },
          update: updateProductInput(
            existingProduct,
            workflowProduct,
            input.options
          ),
        },
      })

      updated += 1
    }

    input.logger.info(
      `Updated ${updated}/${productsToUpdate.length} Herbatica products`
    )
  }

  return {
    created,
    updated,
    skippedExisting,
    selected: selectedProducts.length,
  }
}

export default async function importHerbaticaSnapshot({
  args,
  container,
}: ExecArgs) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const options = parseCliOptions(
    args && args.length > 0 ? args : process.argv.slice(2)
  )
  const productService = container.resolve<IProductModuleService>(
    Modules.PRODUCT
  )
  const regionService = container.resolve<IRegionModuleService>(Modules.REGION)
  const salesChannelService = container.resolve<ISalesChannelModuleService>(
    Modules.SALES_CHANNEL
  )
  const fulfillmentService = container.resolve<IFulfillmentModuleService>(
    Modules.FULFILLMENT
  )
  const storeService = container.resolve<IStoreModuleService>(Modules.STORE)
  const pgConnection = container.resolve<PgConnection>(
    ContainerRegistrationKeys.PG_CONNECTION
  )

  logger.info(`Reading Herbatica snapshot from ${options.snapshotDir}`)

  const [categories, products] = await Promise.all([
    readSnapshotList<SnapshotCategory>(
      options.snapshotDir,
      CATEGORIES_FILE,
      "product_categories"
    ),
    readSnapshotList<SnapshotProduct>(
      options.snapshotDir,
      PRODUCTS_FILE,
      "products"
    ),
  ])

  const categoryIndexes = buildCategoryIndexes(categories)
  const categoryStats = await importCategories(
    container,
    options,
    logger,
    productService,
    categories
  )
  const regionStats = await ensureHerbaticaRegions({
    container,
    dryRun: options.dryRun,
    logger,
    regionService,
  })
  const currentCategoriesByHandle = await listCategoriesByHandle(
    productService,
    categories.map((category) => category.handle)
  )
  const categoryHandleToId = new Map(
    [...currentCategoriesByHandle.entries()].map(([handle, category]) => [
      handle,
      category.id,
    ])
  )

  const salesChannel = options.dryRun
    ? ({ id: "dry-run-sales-channel" } as SalesChannelDTO)
    : await ensureSalesChannel(
        salesChannelService,
        container,
        requestedSalesChannelNames(products)
      )
  const shippingProfile = options.dryRun
    ? { id: "dry-run-shipping-profile" }
    : await ensureDefaultShippingProfile(fulfillmentService, container)

  if (!options.dryRun) {
    await ensureStoreCurrencies(storeService, container)
  }

  const productStats = await importProducts({
    categoryHandleToId,
    categoryIndexes,
    container,
    logger,
    options,
    pgConnection,
    products,
    productService,
    salesChannelId: salesChannel.id,
    shippingProfileId: shippingProfile.id,
  })

  logger.info(
    [
      "Herbatica snapshot import complete:",
      `categories created=${categoryStats.created}`,
      `categories updated=${categoryStats.updated}`,
      `category parents linked=${categoryStats.parentLinked}`,
      `regions created=${regionStats.created}`,
      `regions updated=${regionStats.updated}`,
      `region country conflicts=${regionStats.conflicts}`,
      `products selected=${productStats.selected}`,
      `products created=${productStats.created}`,
      `products updated=${productStats.updated}`,
      `products skipped existing=${productStats.skippedExisting}`,
      `dryRun=${options.dryRun}`,
      `includeDrafts=${options.includeDrafts}`,
    ].join(" ")
  )
}
