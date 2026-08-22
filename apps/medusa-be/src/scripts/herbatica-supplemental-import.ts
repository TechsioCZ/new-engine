import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import {
  createTranslationsWorkflow,
  updateTranslationsWorkflow,
} from "@medusajs/core-flows"
import type {
  CreateTranslationDTO,
  ExecArgs,
  IProductModuleService,
  ISalesChannelModuleService,
  IStockLocationService,
  ITranslationModuleService,
  Logger,
  ProductDTO,
  Query,
  StockLocationDTO,
  UpdateTranslationDTO,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  updateProductCategoriesWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows"
import { PRODUCT_CONTENT_MODULE } from "../modules/product-content"
import type ProductContentModuleService from "../modules/product-content/service"
import {
  PRODUCT_PUBLICATION_METADATA_KEY,
  parseProductPublicationSnapshot,
} from "../modules/url-registry-outbox/product-publication-assignment"
import { PRODUCT_CONTENT_TRANSLATABLE_FIELDS } from "../utils/product-content"
import importHerbaticaSupplementalProductsWorkflow from "../workflows/seed/workflows/import-herbatica-supplemental-products"
import {
  HERBATICA_TAX_RATE_CONFIG,
  HERBATICA_TAX_RATE_COUNTRIES,
} from "./herbatica-seed-config"
import {
  buildProductPublicationMetadata,
  buildSupplementalCategoryInput,
  buildSupplementalProductInput,
  HERBATICA_MARKET_CONFIG,
  HERBATICA_SUPPLEMENTAL_MANIFEST_SHA256,
  type HerbaticaMarket,
  type HerbaticaSupplementalManifest,
  parseHerbaticaSupplementalManifest,
  supplementalCategoryHandle,
  supplementalProductHandle,
  supplementalProductSku,
} from "./herbatica-supplemental-import/manifest"
import {
  assertSupplementalIdentityState,
  type PersistedSupplementalProductIdentity,
  type PersistedSupplementalVariantIdentity,
} from "./herbatica-supplemental-import/preflight"

const PAGE_SIZE = 100
const MARKETS = Object.keys(HERBATICA_MARKET_CONFIG) as HerbaticaMarket[]

type CliOptions = Readonly<{
  apply: boolean
  confirmManifestSha256?: string
  confirmPlanHash?: string
  manifestPath: string
}>

type ExistingTranslation = Readonly<{
  id: string
  localeCode: string
  referenceId: string
  translations: Readonly<Record<string, unknown>>
}>

type RuntimeProduct = ProductDTO &
  Readonly<{
    sales_channels?: readonly Readonly<{ id: string }>[]
  }>

type RuntimeProductContent = Readonly<{
  composition: null | string
  id: string
  other: null | string
  product_id: string
  usage: null | string
  warning: null | string
}>

type ImportPlan = Readonly<{
  categories: number
  embeddedManifestSha256: string
  existingProducts: number
  manifestFileSha256: string
  newProducts: number
  products: number
  salesChannelIds: Readonly<Record<HerbaticaMarket, string>>
  stockLocationId: string
}>

const chunks = <Value>(values: readonly Value[], size = PAGE_SIZE) => {
  const result: Value[][] = []
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size))
  }
  return result
}

const sha256 = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex")

const normalizeCliArgs = (args: readonly string[]) =>
  args.flatMap((argument) => {
    if (argument === "apply") {
      return ["--apply"]
    }
    const separator = argument.indexOf("=")
    if (separator < 1) {
      return [argument]
    }
    return [`--${argument.slice(0, separator)}`, argument.slice(separator + 1)]
  })

const parseCliOptions = (args: readonly string[]): CliOptions => {
  const normalizedArgs = normalizeCliArgs(args)
  let apply = false
  let confirmManifestSha256: string | undefined
  let confirmPlanHash: string | undefined
  let manifestPath: string | undefined
  for (let index = 0; index < normalizedArgs.length; index += 1) {
    const argument = normalizedArgs[index]
    if (argument === "--apply") {
      apply = true
      continue
    }
    const next = normalizedArgs[index + 1]
    if (!next) {
      throw new Error(`${argument} requires a value`)
    }
    if (argument === "--manifest") {
      manifestPath = next
    } else if (argument === "--confirm-manifest-sha256") {
      confirmManifestSha256 = next
    } else if (argument === "--confirm-plan-hash") {
      confirmPlanHash = next
    } else {
      throw new Error(`Unknown argument: ${argument}`)
    }
    index += 1
  }
  if (!manifestPath) {
    throw new Error("--manifest is required")
  }
  if (apply && !(confirmManifestSha256 && confirmPlanHash)) {
    throw new Error(
      "--apply requires --confirm-manifest-sha256 and --confirm-plan-hash"
    )
  }
  return {
    apply,
    confirmManifestSha256,
    confirmPlanHash,
    manifestPath,
  }
}

const loadManifest = async (path: string) => {
  const absolutePath = resolve(path)
  const raw = await readFile(absolutePath)
  const parsed: unknown = JSON.parse(raw.toString("utf8"))
  return {
    absolutePath,
    fileSha256: sha256(raw),
    manifest: parseHerbaticaSupplementalManifest(parsed),
  }
}

const resolveSalesChannels = async (
  service: ISalesChannelModuleService
): Promise<Readonly<Record<HerbaticaMarket, string>>> => {
  const names = MARKETS.map(
    (market) => HERBATICA_MARKET_CONFIG[market].salesChannelName
  )
  const channels = await service.listSalesChannels({ name: names })
  return Object.fromEntries(
    MARKETS.map((market) => {
      const name = HERBATICA_MARKET_CONFIG[market].salesChannelName
      const matches = channels.filter((channel) => channel.name === name)
      if (matches.length !== 1) {
        throw new Error(`Expected exactly one sales channel named ${name}`)
      }
      return [market, matches[0]?.id]
    })
  ) as Readonly<Record<HerbaticaMarket, string>>
}

const resolveStockLocation = async (
  service: IStockLocationService
): Promise<StockLocationDTO> => {
  const locations = await service.listStockLocations({
    name: "European Warehouse",
  })
  if (locations.length !== 1) {
    throw new Error(
      "Expected exactly one stock location named European Warehouse"
    )
  }
  const location = locations[0]
  if (!location) {
    throw new Error("European Warehouse disappeared during preflight")
  }
  return location
}

const assertLocales = async (service: ITranslationModuleService) => {
  for (const market of MARKETS) {
    const localeCode = HERBATICA_MARKET_CONFIG[market].localeCode
    const locales = await service.listLocales(
      { code: localeCode },
      { select: ["code"], take: 2 }
    )
    if (locales.length !== 1) {
      throw new Error(`Expected exact Translation locale ${localeCode}`)
    }
  }
}

const deactivateReplacedSupplementalCategories = async (
  container: ExecArgs["container"],
  service: IProductModuleService,
  manifest: HerbaticaSupplementalManifest
) => {
  const replacedHandles = manifest.categories.flatMap(({ handle }) =>
    supplementalCategoryHandle(handle) === handle ? [] : [handle]
  )
  if (replacedHandles.length === 0) {
    return 0
  }
  const categories = await service.listProductCategories(
    { handle: replacedHandles },
    { select: ["id", "handle", "is_active"], take: replacedHandles.length + 1 }
  )
  const activeCategories = categories.filter(
    ({ is_active: isActive }) => isActive
  )
  for (const category of activeCategories) {
    await updateProductCategoriesWorkflow(container).run({
      input: {
        selector: { id: category.id },
        update: { is_active: false },
      },
    })
  }
  return activeCategories.length
}

const listProductsByExternalIds = async (
  service: IProductModuleService,
  externalIds: readonly string[]
): Promise<RuntimeProduct[]> => {
  const products: RuntimeProduct[] = []
  for (const ids of chunks(externalIds)) {
    products.push(
      ...(await service.listProducts(
        { external_id: ids },
        {
          relations: ["sales_channels", "variants"],
          select: [
            "id",
            "external_id",
            "handle",
            "metadata",
            "subtitle",
            "updated_at",
            "sales_channels.id",
            "variants.id",
            "variants.sku",
            "variants.ean",
          ],
          take: ids.length + 1,
        }
      ))
    )
  }
  return products
}

const listProductsByHandles = async (
  service: IProductModuleService,
  handles: readonly string[]
): Promise<RuntimeProduct[]> => {
  const products: RuntimeProduct[] = []
  for (const handleChunk of chunks(handles)) {
    products.push(
      ...(await service.listProducts(
        { handle: handleChunk },
        {
          relations: ["variants"],
          select: [
            "id",
            "external_id",
            "handle",
            "variants.id",
            "variants.sku",
            "variants.ean",
          ],
          take: handleChunk.length + 1,
        }
      ))
    )
  }
  return products
}

const listVariantIdentityOwners = async (
  service: IProductModuleService,
  manifest: HerbaticaSupplementalManifest
): Promise<PersistedSupplementalVariantIdentity[]> => {
  const variantsById = new Map<string, PersistedSupplementalVariantIdentity>()
  const filters = [
    {
      field: "sku" as const,
      values: manifest.products.map(supplementalProductSku),
    },
    {
      field: "ean" as const,
      values: manifest.products.flatMap(({ ean }) => (ean ? [ean] : [])),
    },
  ]
  for (const filter of filters) {
    for (const valueChunk of chunks(filter.values)) {
      const variants = await service.listProductVariants(
        { [filter.field]: valueChunk },
        {
          select: ["id", "product_id", "sku", "ean"],
          take: valueChunk.length + 1,
        }
      )
      for (const variant of variants) {
        if (!variant.product_id) {
          throw new Error(`Variant ${variant.id} has no product owner`)
        }
        variantsById.set(variant.id, {
          ean: variant.ean ?? null,
          id: variant.id,
          productId: variant.product_id,
          sku: variant.sku ?? null,
        })
      }
    }
  }
  return [...variantsById.values()]
}

const persistedProductIdentity = (
  product: RuntimeProduct
): PersistedSupplementalProductIdentity => ({
  externalId: product.external_id ?? null,
  handle: product.handle ?? null,
  id: product.id,
  variants: (product.variants ?? []).map((variant) => ({
    ean: variant.ean ?? null,
    sku: variant.sku ?? null,
  })),
})

const buildPlan = (input: {
  existingProducts: readonly ProductDTO[]
  fileSha256: string
  manifest: HerbaticaSupplementalManifest
  salesChannelIds: Readonly<Record<HerbaticaMarket, string>>
  stockLocation: StockLocationDTO
}): ImportPlan => ({
  categories: buildSupplementalCategoryInput(input.manifest).length,
  embeddedManifestSha256: input.manifest.sha256,
  existingProducts: input.existingProducts.length,
  manifestFileSha256: input.fileSha256,
  newProducts: input.manifest.products.length - input.existingProducts.length,
  products: input.manifest.products.length,
  salesChannelIds: input.salesChannelIds,
  stockLocationId: input.stockLocation.id,
})

const listCatalogTranslations = async (
  service: ITranslationModuleService,
  referenceIds: readonly string[],
  localeCode: string,
  reference: "product" | "product_content"
): Promise<ExistingTranslation[]> => {
  const result: ExistingTranslation[] = []
  for (const ids of chunks(referenceIds)) {
    const translations = await service.listTranslations(
      { locale_code: localeCode, reference_id: ids },
      {
        select: [
          "id",
          "locale_code",
          "reference",
          "reference_id",
          "translations",
          "deleted_at",
        ],
        take: ids.length * 2 + 1,
      }
    )
    for (const translation of translations) {
      if (
        translation.deleted_at ||
        translation.locale_code !== localeCode ||
        translation.reference !== reference ||
        !ids.includes(translation.reference_id) ||
        !(
          translation.translations &&
          typeof translation.translations === "object"
        )
      ) {
        throw new Error("Translation module returned invalid product state")
      }
      result.push({
        id: translation.id,
        localeCode: translation.locale_code,
        referenceId: translation.reference_id,
        translations: translation.translations,
      })
    }
  }
  return result
}

const sameTranslation = (
  left: Readonly<Record<string, unknown>>,
  right: Readonly<Record<string, unknown>>
) => JSON.stringify(left) === JSON.stringify(right)

const upsertProductTranslations = async (
  container: ExecArgs["container"],
  manifest: HerbaticaSupplementalManifest,
  productsByExternalId: ReadonlyMap<string | null, ProductDTO>
) => {
  const service = container.resolve<ITranslationModuleService>(
    Modules.TRANSLATION
  )
  const referenceIds = [...productsByExternalId.values()].map(({ id }) => id)
  for (const market of MARKETS) {
    const localeCode = HERBATICA_MARKET_CONFIG[market].localeCode
    const existing = await listCatalogTranslations(
      service,
      referenceIds,
      localeCode,
      "product"
    )
    const byReferenceId = new Map<string, ExistingTranslation>()
    for (const translation of existing) {
      if (byReferenceId.has(translation.referenceId)) {
        throw new Error(
          `Duplicate ${localeCode} product translation for ${translation.referenceId}`
        )
      }
      byReferenceId.set(translation.referenceId, translation)
    }
    const creates: CreateTranslationDTO[] = []
    const updates: UpdateTranslationDTO[] = []
    for (const sourceProduct of manifest.products) {
      const localized = sourceProduct.localized[market]
      if (!localized) {
        continue
      }
      const product = productsByExternalId.get(sourceProduct.source_shopitem_id)
      if (!product) {
        throw new Error(
          `Product ${sourceProduct.source_shopitem_id} is missing`
        )
      }
      const translations = {
        description: localized.description,
        subtitle: localized.short_description,
        title: localized.title,
      }
      const prior = byReferenceId.get(product.id)
      if (!prior) {
        creates.push({
          locale_code: localeCode,
          reference: "product",
          reference_id: product.id,
          translations,
        })
      } else if (!sameTranslation(prior.translations, translations)) {
        updates.push({ id: prior.id, translations })
      }
    }
    for (const batch of chunks(creates, 500)) {
      await createTranslationsWorkflow(container).run({
        input: { translations: batch },
      })
    }
    for (const batch of chunks(updates, 500)) {
      await updateTranslationsWorkflow(container).run({
        input: { translations: batch },
      })
    }
  }
}

const upsertProductContentTranslations = async (
  container: ExecArgs["container"],
  manifest: HerbaticaSupplementalManifest,
  productsByExternalId: ReadonlyMap<string | null, ProductDTO>
) => {
  const contentService = container.resolve<ProductContentModuleService>(
    PRODUCT_CONTENT_MODULE
  )
  const translationService = container.resolve<ITranslationModuleService>(
    Modules.TRANSLATION
  )
  const productIds = [...productsByExternalId.values()].map(({ id }) => id)
  const contents: RuntimeProductContent[] = []
  for (const ids of chunks(productIds)) {
    contents.push(
      ...(await contentService.listProductContents(
        { product_id: ids },
        {
          select: ["id", "product_id", ...PRODUCT_CONTENT_TRANSLATABLE_FIELDS],
          take: ids.length + 1,
        }
      ))
    )
  }
  const contentsByProductId = new Map<string, RuntimeProductContent>()
  for (const content of contents) {
    if (contentsByProductId.has(content.product_id)) {
      throw new Error(
        `Product ${content.product_id} has duplicate product content`
      )
    }
    if (
      PRODUCT_CONTENT_TRANSLATABLE_FIELDS.some(
        (field) => (content[field] ?? "").trim().length > 0
      )
    ) {
      throw new Error(
        `Product ${content.product_id} has structured content requiring exact market translations`
      )
    }
    contentsByProductId.set(content.product_id, content)
  }
  if (contentsByProductId.size !== productIds.length) {
    throw new Error("Supplemental product content count differs")
  }

  for (const market of MARKETS) {
    const localeCode = HERBATICA_MARKET_CONFIG[market].localeCode
    const existing = await listCatalogTranslations(
      translationService,
      contents.map(({ id }) => id),
      localeCode,
      "product_content"
    )
    const byReferenceId = new Map(
      existing.map((translation) => [translation.referenceId, translation])
    )
    if (byReferenceId.size !== existing.length) {
      throw new Error(`Duplicate ${localeCode} product content translation`)
    }
    const creates: CreateTranslationDTO[] = []
    const updates: UpdateTranslationDTO[] = []
    for (const sourceProduct of manifest.products) {
      if (!sourceProduct.localized[market]) {
        continue
      }
      const product = productsByExternalId.get(sourceProduct.source_shopitem_id)
      const content = product ? contentsByProductId.get(product.id) : undefined
      if (!content) {
        throw new Error(
          `Product ${sourceProduct.source_shopitem_id} has no product content`
        )
      }
      const translations = {}
      const prior = byReferenceId.get(content.id)
      if (!prior) {
        creates.push({
          locale_code: localeCode,
          reference: "product_content",
          reference_id: content.id,
          translations,
        })
      } else if (!sameTranslation(prior.translations, translations)) {
        updates.push({ id: prior.id, translations })
      }
    }
    for (const batch of chunks(creates, 500)) {
      await createTranslationsWorkflow(container).run({
        input: { translations: batch },
      })
    }
    for (const batch of chunks(updates, 500)) {
      await updateTranslationsWorkflow(container).run({
        input: { translations: batch },
      })
    }
  }
}

const updateBaseSubtitles = async (
  container: ExecArgs["container"],
  manifest: HerbaticaSupplementalManifest,
  productsByExternalId: ReadonlyMap<string | null, ProductDTO>
) => {
  const updates = manifest.products.flatMap((sourceProduct) => {
    const product = productsByExternalId.get(sourceProduct.source_shopitem_id)
    const subtitle = sourceProduct.localized.sk?.short_description
    if (!(product && subtitle) || product.subtitle === subtitle) {
      return []
    }
    return [{ id: product.id, subtitle }]
  })
  for (const batch of chunks(updates)) {
    await updateProductsWorkflow(container).run({ input: { products: batch } })
  }
}

const publishProducts = async (
  container: ExecArgs["container"],
  manifest: HerbaticaSupplementalManifest,
  productsByExternalId: ReadonlyMap<string | null, ProductDTO>,
  salesChannelIds: Readonly<Record<HerbaticaMarket, string>>
) => {
  const updates = manifest.products.map((sourceProduct) => {
    const product = productsByExternalId.get(sourceProduct.source_shopitem_id)
    if (!product) {
      throw new Error(`Product ${sourceProduct.source_shopitem_id} is missing`)
    }
    return {
      id: product.id,
      metadata: {
        ...(product.metadata ?? {}),
        [PRODUCT_PUBLICATION_METADATA_KEY]: buildProductPublicationMetadata(
          sourceProduct,
          salesChannelIds
        ),
      },
    }
  })
  for (const batch of chunks(updates)) {
    await updateProductsWorkflow(container).run({ input: { products: batch } })
  }
}

const verifyAppliedState = async (
  query: Query,
  productService: IProductModuleService,
  productContentService: ProductContentModuleService,
  translationService: ITranslationModuleService,
  manifest: HerbaticaSupplementalManifest,
  salesChannelIds: Readonly<Record<HerbaticaMarket, string>>
) => {
  const products = await listProductsByExternalIds(
    productService,
    manifest.products.map(({ source_shopitem_id }) => source_shopitem_id)
  )
  if (products.length !== manifest.products.length) {
    throw new Error("Supplemental product count differs after apply")
  }
  const productsByExternalId = new Map(
    products.map((product) => [product.external_id, product])
  )
  const { data: channelProducts } = await query.graph({
    entity: "product",
    fields: ["id", "sales_channels.id"],
    filters: { id: products.map(({ id }) => id) },
  })
  const channelIdsByProductId = new Map(
    channelProducts.map((product) => [
      product.id,
      new Set(
        (product.sales_channels ?? []).flatMap((channel) =>
          channel?.id ? [channel.id] : []
        )
      ),
    ])
  )
  if (channelIdsByProductId.size !== products.length) {
    throw new Error("Supplemental product channel count differs after apply")
  }
  for (const sourceProduct of manifest.products) {
    const product = productsByExternalId.get(sourceProduct.source_shopitem_id)
    if (!product) {
      throw new Error(`Product ${sourceProduct.source_shopitem_id} is missing`)
    }
    const expectedChannels = new Set([
      ...sourceProduct.published_markets.map(
        (market) => salesChannelIds[market]
      ),
    ])
    const actualChannels = channelIdsByProductId.get(product.id)
    if (!actualChannels) {
      throw new Error(
        `Product ${sourceProduct.source_shopitem_id} has no channel state`
      )
    }
    for (const channelId of expectedChannels) {
      if (!actualChannels.has(channelId)) {
        throw new Error(
          `Product ${sourceProduct.source_shopitem_id} is missing sales channel ${channelId}`
        )
      }
    }
    const publication = parseProductPublicationSnapshot({
      ...product,
      sales_channels: [...actualChannels].map((id) => ({ id })),
    })
    for (const market of MARKETS) {
      const assignment = publication.assignments[market]
      if (sourceProduct.published_markets.includes(market)) {
        if (
          assignment?.publicationStatus !== "published" ||
          assignment.publicSlug !==
            sourceProduct.localized[market]?.public_slug ||
          assignment.salesChannelId !== salesChannelIds[market]
        ) {
          throw new Error(
            `Product ${sourceProduct.source_shopitem_id} has invalid ${market} publication`
          )
        }
      } else if (assignment !== null) {
        throw new Error(
          `Product ${sourceProduct.source_shopitem_id} must not be published in ${market}`
        )
      }
    }
  }
  const referenceIds = products.map(({ id }) => id)
  const contentIds: string[] = []
  for (const ids of chunks(referenceIds)) {
    const contents = await productContentService.listProductContents(
      { product_id: ids },
      { select: ["id", "product_id"], take: ids.length + 1 }
    )
    contentIds.push(...contents.map(({ id }) => id))
  }
  if (contentIds.length !== referenceIds.length) {
    throw new Error("Supplemental product content count differs after apply")
  }
  for (const market of MARKETS) {
    const expected = manifest.products.filter(({ published_markets }) =>
      published_markets.includes(market)
    ).length
    const actual = await listCatalogTranslations(
      translationService,
      referenceIds,
      HERBATICA_MARKET_CONFIG[market].localeCode,
      "product"
    )
    if (actual.length !== expected) {
      throw new Error(
        `${market} supplemental translation count ${actual.length} differs from ${expected}`
      )
    }
    const contentTranslations = await listCatalogTranslations(
      translationService,
      contentIds,
      HERBATICA_MARKET_CONFIG[market].localeCode,
      "product_content"
    )
    if (contentTranslations.length !== expected) {
      throw new Error(
        `${market} supplemental content translation count ${contentTranslations.length} differs from ${expected}`
      )
    }
  }
}

export default async function herbaticaSupplementalImport({
  args,
  container,
}: ExecArgs) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const options = parseCliOptions(args)
  const { absolutePath, fileSha256, manifest } = await loadManifest(
    options.manifestPath
  )
  const productService = container.resolve<IProductModuleService>(
    Modules.PRODUCT
  )
  const salesChannelService = container.resolve<ISalesChannelModuleService>(
    Modules.SALES_CHANNEL
  )
  const stockLocationService = container.resolve<IStockLocationService>(
    Modules.STOCK_LOCATION
  )
  const translationService = container.resolve<ITranslationModuleService>(
    Modules.TRANSLATION
  )
  const productContentService = container.resolve<ProductContentModuleService>(
    PRODUCT_CONTENT_MODULE
  )
  const [
    salesChannelIds,
    stockLocation,
    existingProducts,
    productsByHandle,
    variantIdentityOwners,
  ] = await Promise.all([
    resolveSalesChannels(salesChannelService),
    resolveStockLocation(stockLocationService),
    listProductsByExternalIds(
      productService,
      manifest.products.map(({ source_shopitem_id }) => source_shopitem_id)
    ),
    listProductsByHandles(
      productService,
      manifest.products.map(supplementalProductHandle)
    ),
    listVariantIdentityOwners(productService, manifest),
    assertLocales(translationService),
  ])
  const identityProducts = new Map<string, RuntimeProduct>()
  for (const product of [...existingProducts, ...productsByHandle]) {
    identityProducts.set(product.id, product)
  }
  assertSupplementalIdentityState({
    manifest,
    products: [...identityProducts.values()].map(persistedProductIdentity),
    variants: variantIdentityOwners,
  })
  const plan = buildPlan({
    existingProducts,
    fileSha256,
    manifest,
    salesChannelIds,
    stockLocation,
  })
  const planHash = sha256(JSON.stringify(plan))
  logger.info(`Supplemental manifest: ${absolutePath}`)
  logger.info(`Supplemental import plan: ${JSON.stringify(plan)}`)
  logger.info(`Supplemental import plan hash: ${planHash}`)
  if (!options.apply) {
    logger.info("Dry-run complete; no catalog data was changed")
    return { ...plan, planHash }
  }
  if (
    options.confirmManifestSha256 !== HERBATICA_SUPPLEMENTAL_MANIFEST_SHA256
  ) {
    throw new Error(
      "--confirm-manifest-sha256 does not match approved customer extraction"
    )
  }
  if (options.confirmPlanHash !== planHash) {
    throw new Error("--confirm-plan-hash does not match latest dry-run")
  }

  if (existingProducts.length === manifest.products.length) {
    const existingProductsByExternalId = new Map(
      existingProducts.map((product) => [product.external_id, product])
    )
    await upsertProductTranslations(
      container,
      manifest,
      existingProductsByExternalId
    )
    await upsertProductContentTranslations(
      container,
      manifest,
      existingProductsByExternalId
    )
  }

  await importHerbaticaSupplementalProductsWorkflow(container).run({
    input: {
      productCategories: buildSupplementalCategoryInput(manifest),
      products: buildSupplementalProductInput(manifest),
      stockLocations: [stockLocation],
      taxRates: {
        config: HERBATICA_TAX_RATE_CONFIG,
        countries: HERBATICA_TAX_RATE_COUNTRIES,
      },
    },
  })
  const deactivatedCategories = await deactivateReplacedSupplementalCategories(
    container,
    productService,
    manifest
  )

  const importedProducts = await listProductsByExternalIds(
    productService,
    manifest.products.map(({ source_shopitem_id }) => source_shopitem_id)
  )
  if (importedProducts.length !== manifest.products.length) {
    throw new Error("Not all supplemental products were imported")
  }
  const productsByExternalId = new Map(
    importedProducts.map((product) => [product.external_id, product])
  )
  await upsertProductTranslations(container, manifest, productsByExternalId)
  await upsertProductContentTranslations(
    container,
    manifest,
    productsByExternalId
  )
  await updateBaseSubtitles(container, manifest, productsByExternalId)
  await publishProducts(
    container,
    manifest,
    productsByExternalId,
    salesChannelIds
  )
  await verifyAppliedState(
    query,
    productService,
    productContentService,
    translationService,
    manifest,
    salesChannelIds
  )
  logger.info(
    `Supplemental import applied and verified: ${manifest.products.length} products, ${manifest.categories.length} category mappings, ${deactivatedCategories} replaced categories deactivated`
  )
  return { ...plan, planHash, verified: true }
}
