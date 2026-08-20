import {
  createTranslationsWorkflow,
  updateTranslationsWorkflow,
} from "@medusajs/core-flows"
import type { SqlEntityManager } from "@medusajs/framework/mikro-orm/knex"
import type {
  Context,
  CreateTranslationDTO,
  ExecArgs,
  ITranslationModuleService,
  UpdateTranslationDTO,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows"
import { MARKET_VARIANT_AUTHORITY_MODULE } from "../../modules/market-variant-authority"
import type MarketVariantAuthorityModuleService from "../../modules/market-variant-authority/service"
import { STOREFRONT_URL_ASSIGNMENT_MODULE } from "../../modules/storefront-url-assignment"
import { enqueueCatalogAssignmentLifecycle } from "../../modules/storefront-url-assignment/catalog-lifecycle"
import type { StorefrontUrlAssignmentRecord } from "../../modules/storefront-url-assignment/models/storefront-url-assignment"
import type StorefrontUrlAssignmentModuleService from "../../modules/storefront-url-assignment/service"
import { URL_REGISTRY_OUTBOX_MODULE } from "../../modules/url-registry-outbox"
import type UrlRegistryOutboxModuleService from "../../modules/url-registry-outbox/service"
import {
  getProductContentService,
  resolveOriginalProductContent,
} from "../../utils/product-content-service"
import {
  buildSkPublicationAuditBaseline,
  collectRoCatalogReadinessInput,
} from "../ro-catalog-readiness"
import { buildRoDemoDatabaseInstanceFingerprint } from "../ro-demo-commerce/runtime"
import {
  postCommerceSha256,
  stablePostCommerceJson,
} from "../ro-demo-localization/postcommerce-envelope"
import {
  buildExcludedProductPublicationMetadata,
  buildProductPublicationMetadata,
  buildRoCatalogImportPlan,
  isSameImportValue,
} from "./planner"
import {
  type CatalogCategorySnapshot,
  type CatalogProductSnapshot,
  type CategoryUrlAssignmentSnapshot,
  type ExistingProductContent,
  type ExistingTranslation,
  RO_CATALOG_LOCALE,
  type RoCatalogBrandPlanItem,
  type RoCatalogCategoryPlanItem,
  type RoCatalogExcludedBrandPlanItem,
  type RoCatalogExcludedCategoryPlanItem,
  type RoCatalogExcludedProductPlanItem,
  type RoCatalogImportPlan,
  type RoCatalogImportPlanItem,
  type RoCatalogManifest,
  type RoCatalogPostCommerceInventoryEvidence,
  type RoCatalogReadinessRequirements,
  type RoCatalogSnapshot,
  type RoCommerceReadinessSnapshot,
  type TranslationMutation,
} from "./types"

type QueryService = Readonly<{
  graph: <T>(
    input: Readonly<{
      entity: string
      fields: readonly string[]
      filters?: Readonly<Record<string, unknown>>
      pagination?: Readonly<{ skip?: number; take: number }>
    }>
  ) => Promise<Readonly<{ data?: T[] }>>
}>

type RawProduct = Readonly<{
  categories?: readonly Readonly<{ id?: unknown }>[]
  description?: null | string
  external_id?: null | string
  id?: unknown
  metadata?: null | Record<string, unknown>
  sales_channels?: readonly Readonly<{ id?: unknown }>[]
  status?: unknown
  title?: unknown
  variants?: readonly Readonly<{
    ean?: null | string
    id?: unknown
    prices?: readonly Readonly<{
      amount?: unknown
      currency_code?: unknown
    }>[]
    sku?: null | string
  }>[]
}>

type RawCategory = Readonly<{
  description?: null | string
  id?: unknown
  is_active?: unknown
  metadata?: null | Record<string, unknown>
  name?: unknown
  parent_category_id?: null | string
}>

type MutableContentRecord = Readonly<{
  composition?: null | string
  id: string
  other?: null | string
  product_id: string
  usage?: null | string
  warning?: null | string
}>

const PAGE_SIZE = 500
const TRANSLATION_REFERENCES = new Set([
  "brand",
  "product",
  "product_category",
  "product_content",
])

const chunk = <Value>(values: readonly Value[], size: number) => {
  const chunks: Value[][] = []
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size))
  }
  return chunks
}

const identifier = (value: unknown, label: string) => {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} is invalid`)
  }
  return value
}

const exactlyOne = <Value>(
  values: readonly Value[],
  errorMessage: string
): Value => {
  const [value, ...remaining] = values
  if (value === undefined || remaining.length !== 0) {
    throw new Error(errorMessage)
  }
  return value
}

const readAllProducts = async (
  query: QueryService
): Promise<CatalogProductSnapshot[]> => {
  const products: CatalogProductSnapshot[] = []
  for (let skip = 0; ; skip += PAGE_SIZE) {
    const { data = [] } = await query.graph<RawProduct>({
      entity: "product",
      fields: [
        "id",
        "external_id",
        "title",
        "description",
        "metadata",
        "categories.id",
        "sales_channels.id",
        "status",
        "variants.sku",
        "variants.ean",
        "variants.prices.amount",
        "variants.prices.currency_code",
      ],
      pagination: { skip, take: PAGE_SIZE },
    })
    products.push(
      ...data.map((product, index) => {
        const id = identifier(
          product.id,
          `product page ${skip} item ${index}.id`
        )
        const metadata = product.metadata ?? {}
        const status = identifier(product.status, `product ${id}.status`)
        return {
          categoryIds: (product.categories ?? []).map(
            (category, categoryIndex) =>
              identifier(
                category.id,
                `product ${id}.categories[${categoryIndex}].id`
              )
          ),
          description: product.description ?? null,
          externalId: product.external_id ?? null,
          id,
          metadata,
          salesChannelIds: (product.sales_channels ?? []).map(
            (channel, channelIndex) =>
              identifier(
                channel.id,
                `product ${id}.sales_channels[${channelIndex}].id`
              )
          ),
          sourceContent: resolveOriginalProductContent({ metadata }),
          status,
          title:
            typeof product.title === "string" ? product.title : `product ${id}`,
          variants: (product.variants ?? []).map((variant, variantIndex) => ({
            ean: variant.ean ?? null,
            id: identifier(
              variant.id,
              `product ${id}.variants[${variantIndex}].id`
            ),
            prices: (variant.prices ?? []).map((price, priceIndex) => {
              if (
                typeof price.amount !== "number" ||
                !Number.isFinite(price.amount) ||
                typeof price.currency_code !== "string"
              ) {
                throw new Error(
                  `product ${id}.variants[${variantIndex}].prices[${priceIndex}] is invalid`
                )
              }
              return {
                amount: price.amount,
                currencyCode: price.currency_code,
              }
            }),
            sku: variant.sku ?? null,
          })),
        }
      })
    )
    if (data.length < PAGE_SIZE) {
      return products
    }
  }
}

const readAllCategories = async (
  query: QueryService,
  products: readonly CatalogProductSnapshot[]
): Promise<CatalogCategorySnapshot[]> => {
  const categories: CatalogCategorySnapshot[] = []
  for (let skip = 0; ; skip += PAGE_SIZE) {
    const { data = [] } = await query.graph<RawCategory>({
      entity: "product_category",
      fields: [
        "id",
        "name",
        "description",
        "is_active",
        "metadata",
        "parent_category_id",
      ],
      pagination: { skip, take: PAGE_SIZE },
    })
    categories.push(
      ...data.map((category, index) => {
        const id = identifier(
          category.id,
          `category page ${skip} item ${index}.id`
        )
        if (
          (category.description !== null &&
            typeof category.description !== "string") ||
          typeof category.is_active !== "boolean" ||
          typeof category.name !== "string" ||
          category.name.trim().length === 0 ||
          !(
            category.parent_category_id === null ||
            typeof category.parent_category_id === "string"
          )
        ) {
          throw new Error(`category ${id} state is invalid`)
        }
        return {
          description: category.description,
          directProductIds: products.flatMap((product) =>
            product.categoryIds.includes(id) ? [product.id] : []
          ),
          id,
          isActive: category.is_active,
          metadata: category.metadata ?? {},
          name: category.name,
          parentId: category.parent_category_id,
        }
      })
    )
    if (data.length < PAGE_SIZE) {
      return categories
    }
  }
}

const readAllBrands = async (query: QueryService) => {
  const brands: Array<{ id: string; title: string }> = []
  for (let skip = 0; ; skip += PAGE_SIZE) {
    const { data = [] } = await query.graph<{
      id?: unknown
      title?: unknown
    }>({
      entity: "brand",
      fields: ["id", "title"],
      pagination: { skip, take: PAGE_SIZE },
    })
    brands.push(
      ...data.map((brand, index) => ({
        id: identifier(brand.id, `brand page ${skip} item ${index}.id`),
        title: identifier(
          brand.title,
          `brand page ${skip} item ${index}.title`
        ),
      }))
    )
    if (data.length < PAGE_SIZE) {
      return brands
    }
  }
}

const readAllCollectionIds = async (query: QueryService) => {
  const ids: string[] = []
  for (let skip = 0; ; skip += PAGE_SIZE) {
    const { data = [] } = await query.graph<{ id?: unknown }>({
      entity: "product_collection",
      fields: ["id"],
      pagination: { skip, take: PAGE_SIZE },
    })
    ids.push(
      ...data.map((collection, index) =>
        identifier(collection.id, `collection page ${skip} item ${index}.id`)
      )
    )
    if (data.length < PAGE_SIZE) {
      return ids
    }
  }
}

const readAllStoreIds = async (query: QueryService) => {
  const stores: string[] = []
  for (let skip = 0; ; skip += PAGE_SIZE) {
    const response = await query.graph<Readonly<{ id?: unknown }>>({
      entity: "store",
      fields: ["id"],
      pagination: { skip, take: PAGE_SIZE },
    })
    const page = (response.data ?? []).map((store) => {
      if (typeof store.id !== "string" || !store.id) {
        throw new Error("store inventory returned an invalid ID")
      }
      return store.id
    })
    stores.push(...page)
    if (page.length < PAGE_SIZE) {
      return stores
    }
  }
}

export const buildLiveDatabaseFingerprint = (
  products: readonly CatalogProductSnapshot[],
  storeIds: readonly string[],
  salesChannelId: string
) =>
  postCommerceSha256(
    stablePostCommerceJson({
      moduleIdentity: "medusa-v2:product-variant-inventory",
      productIds: products.map(({ id }) => id).sort(),
      salesChannelId,
      storeIds: [...storeIds].sort(),
      variantIds: products
        .flatMap(({ variants }) => variants.map(({ id }) => id))
        .sort(),
    })
  )

const assignmentTimestamp = (value: unknown) => {
  const date = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(date.getTime())
    ? new Date(0).toISOString()
    : date.toISOString()
}

const assignmentSnapshot = (
  assignment: StorefrontUrlAssignmentRecord
): CategoryUrlAssignmentSnapshot => ({
  entityId: identifier(assignment.entity_id, "category assignment.entity_id"),
  id: identifier(assignment.id, "category assignment.id"),
  marketCode: identifier(
    assignment.market_code,
    "category assignment.market_code"
  ),
  publicationStatus: identifier(
    assignment.publication_status,
    "category assignment.publication_status"
  ),
  publicSlug: identifier(
    assignment.public_slug,
    "category assignment.public_slug"
  ),
  salesChannelId: identifier(
    assignment.sales_channel_id,
    "category assignment.sales_channel_id"
  ),
  sourceVersion: assignment.source_version,
  updatedAt: assignmentTimestamp(assignment.updated_at),
})

const readCatalogAssignments = async (
  service: StorefrontUrlAssignmentModuleService,
  entityKind: "brand" | "category"
) => {
  const assignments: CategoryUrlAssignmentSnapshot[] = []
  for (let skip = 0; ; skip += PAGE_SIZE) {
    const page = await service.listStorefrontUrlAssignments(
      { entity_kind: entityKind },
      { skip, take: PAGE_SIZE }
    )
    assignments.push(...page.map(assignmentSnapshot))
    if (page.length < PAGE_SIZE) {
      return assignments
    }
  }
}

const readSalesChannels = async (query: QueryService) => {
  const channels: Array<{
    id: string
    metadata: Readonly<Record<string, unknown>> | null
  }> = []
  for (let skip = 0; ; skip += PAGE_SIZE) {
    const { data = [] } = await query.graph<{
      id?: unknown
      metadata?: null | Record<string, unknown>
    }>({
      entity: "sales_channel",
      fields: ["id", "metadata"],
      pagination: { skip, take: PAGE_SIZE },
    })
    channels.push(
      ...data.map((channel, index) => ({
        id: identifier(
          channel.id,
          `sales channel page ${skip} item ${index}.id`
        ),
        metadata: channel.metadata ?? null,
      }))
    )
    if (data.length < PAGE_SIZE) {
      return channels
    }
  }
}

const readCommerceReadiness = async (
  query: QueryService,
  requirements: RoCatalogReadinessRequirements
): Promise<RoCommerceReadinessSnapshot> => {
  type RawRegion = {
    countries?: { iso_2?: unknown }[]
    currency_code?: unknown
    id?: unknown
  }
  type RawShippingOption = {
    id?: unknown
    service_zone?: { geo_zones?: { country_code?: unknown }[] }
  }
  type RawTaxRegion = { country_code?: unknown; id?: unknown }
  type RawPaymentProvider = { id?: unknown; is_enabled?: unknown }
  type RawRegionPaymentProvider = {
    payment_provider_id?: unknown
    region_id?: unknown
  }

  const [
    regionsResult,
    shippingResult,
    taxResult,
    providersResult,
    linksResult,
  ] = await Promise.all([
    query.graph<RawRegion>({
      entity: "region",
      fields: ["id", "currency_code", "countries.iso_2"],
      filters: { id: requirements.regionId },
      pagination: { take: 2 },
    }),
    query.graph<RawShippingOption>({
      entity: "shipping_option",
      fields: ["id", "service_zone.geo_zones.country_code"],
      filters: { id: [...requirements.shippingOptionIds] },
      pagination: { take: requirements.shippingOptionIds.length + 1 },
    }),
    query.graph<RawTaxRegion>({
      entity: "tax_region",
      fields: ["id", "country_code"],
      filters: { id: [...requirements.taxRegionIds] },
      pagination: { take: requirements.taxRegionIds.length + 1 },
    }),
    query.graph<RawPaymentProvider>({
      entity: "payment_provider",
      fields: ["id", "is_enabled"],
      filters: { id: [...requirements.paymentProviderIds] },
      pagination: { take: requirements.paymentProviderIds.length + 1 },
    }),
    query.graph<RawRegionPaymentProvider>({
      entity: "region_payment_provider",
      fields: ["region_id", "payment_provider_id"],
      filters: {
        payment_provider_id: [...requirements.paymentProviderIds],
        region_id: requirements.regionId,
      },
      pagination: { take: requirements.paymentProviderIds.length + 1 },
    }),
  ])
  const links = linksResult.data ?? []
  return {
    paymentProviders: (providersResult.data ?? []).map((provider, index) => {
      const id = identifier(provider.id, `payment provider ${index}.id`)
      return {
        enabled: provider.is_enabled === true,
        id,
        regionIds: links.flatMap((link) =>
          link.payment_provider_id === id && typeof link.region_id === "string"
            ? [link.region_id]
            : []
        ),
      }
    }),
    regions: (regionsResult.data ?? []).map((region, index) => ({
      countryCodes: (region.countries ?? []).map((country, countryIndex) =>
        identifier(country.iso_2, `region ${index}.countries[${countryIndex}]`)
      ),
      currencyCode: identifier(
        region.currency_code,
        `region ${index}.currency_code`
      ),
      id: identifier(region.id, `region ${index}.id`),
    })),
    shippingOptions: (shippingResult.data ?? []).map((option, index) => ({
      countryCodes: (option.service_zone?.geo_zones ?? []).flatMap((zone) =>
        typeof zone.country_code === "string" ? [zone.country_code] : []
      ),
      id: identifier(option.id, `shipping option ${index}.id`),
    })),
    taxRegions: (taxResult.data ?? []).map((taxRegion, index) => ({
      countryCode: identifier(
        taxRegion.country_code,
        `tax region ${index}.country_code`
      ),
      id: identifier(taxRegion.id, `tax region ${index}.id`),
    })),
  }
}

const readProductContents = async (
  container: ExecArgs["container"],
  productIds: readonly string[]
): Promise<ExistingProductContent[]> => {
  const service = getProductContentService(container)
  const records: ExistingProductContent[] = []
  for (const ids of chunk(productIds, PAGE_SIZE)) {
    const page = (await service.listProductContents(
      { product_id: ids },
      { take: ids.length + 1 }
    )) as MutableContentRecord[]
    records.push(
      ...page.map((record) => ({
        composition: record.composition ?? "",
        id: record.id,
        other: record.other ?? "",
        productId: record.product_id,
        usage: record.usage ?? "",
        warning: record.warning ?? "",
      }))
    )
  }
  return records
}

const readTranslations = async (
  service: ITranslationModuleService,
  referenceIds: readonly string[],
  localeCode: string = RO_CATALOG_LOCALE
): Promise<ExistingTranslation[]> => {
  const records: ExistingTranslation[] = []
  for (const ids of chunk(referenceIds, PAGE_SIZE)) {
    if (ids.length === 0) {
      continue
    }
    const page = await service.listTranslations(
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
    for (const translation of page) {
      if (
        translation.deleted_at ||
        translation.locale_code !== localeCode ||
        !TRANSLATION_REFERENCES.has(translation.reference) ||
        !ids.includes(translation.reference_id) ||
        !(
          translation.translations &&
          typeof translation.translations === "object" &&
          !Array.isArray(translation.translations)
        )
      ) {
        throw new Error("translation module returned invalid RO catalog state")
      }
      records.push({
        id: translation.id,
        localeCode: translation.locale_code,
        reference: translation.reference as ExistingTranslation["reference"],
        referenceId: translation.reference_id,
        translations: translation.translations,
      })
    }
  }
  return records
}

export const inspectRoCatalog = async (
  container: ExecArgs["container"],
  readiness: RoCatalogReadinessRequirements,
  evidence: RoCatalogPostCommerceInventoryEvidence
): Promise<RoCatalogSnapshot> => {
  if (
    buildRoDemoDatabaseInstanceFingerprint(process.env) !==
    evidence.environment.databaseInstanceFingerprint
  ) {
    throw new Error(
      "current database instance does not match post-commerce evidence"
    )
  }
  const query = container.resolve<QueryService>(ContainerRegistrationKeys.QUERY)
  const readinessInputPromise = collectRoCatalogReadinessInput(container)
  const translationService = container.resolve<ITranslationModuleService>(
    Modules.TRANSLATION
  )
  const locales = await translationService.listLocales(
    { code: RO_CATALOG_LOCALE },
    { select: ["code"], take: 2 }
  )
  if (locales.length !== 1 || locales[0]?.code !== RO_CATALOG_LOCALE) {
    throw new Error("Medusa locale ro-RO is missing or ambiguous")
  }

  const assignmentService =
    container.resolve<StorefrontUrlAssignmentModuleService>(
      STOREFRONT_URL_ASSIGNMENT_MODULE
    )
  const [
    products,
    commerceReadiness,
    categoryAssignments,
    brandAssignments,
    brands,
    collectionIds,
    salesChannels,
    storeIds,
  ] = await Promise.all([
    readAllProducts(query),
    readCommerceReadiness(query, readiness),
    readCatalogAssignments(assignmentService, "category"),
    readCatalogAssignments(assignmentService, "brand"),
    readAllBrands(query),
    readAllCollectionIds(query),
    readSalesChannels(query),
    readAllStoreIds(query),
  ])
  const databaseFingerprint = buildLiveDatabaseFingerprint(
    products,
    storeIds,
    evidence.environment.salesChannelId
  )
  if (databaseFingerprint !== evidence.environment.databaseFingerprint) {
    throw new Error(
      "fresh database fingerprint does not match post-commerce evidence"
    )
  }
  const categories = await readAllCategories(query, products)
  const contents = await readProductContents(
    container,
    products.map(({ id }) => id)
  )
  const referenceIds = [
    ...products.map(({ id }) => id),
    ...categories.map(({ id }) => id),
    ...brands.map(({ id }) => id),
    ...contents.map(({ id }) => id),
  ]
  const translations = await readTranslations(translationService, referenceIds)
  const skProtection = buildSkPublicationAuditBaseline(
    await readinessInputPromise
  )
  if (skProtection.publication.errors > 0) {
    throw new Error(
      `SK publication audit failed with ${skProtection.publication.errors} error(s): ${skProtection.issues
        .filter(({ severity }) => severity === "error")
        .map(({ code, entityId }) => `${code}${entityId ? `:${entityId}` : ""}`)
        .join(", ")}`
    )
  }
  return {
    brandAssignments,
    brands,
    categories,
    categoryAssignments,
    collectionIds,
    commerceReadiness,
    contents,
    products,
    salesChannels,
    skProtection,
    translations,
  }
}

export const prepareRoCatalogImport = async (
  container: ExecArgs["container"],
  manifest: RoCatalogManifest,
  options: Readonly<{ salesChannelId?: string }> = {}
) =>
  buildRoCatalogImportPlan(
    manifest,
    await inspectRoCatalog(
      container,
      manifest.readiness,
      manifest.postCommerceInventoryEvidence
    ),
    options
  )

const ensureContentRecords = async (
  container: ExecArgs["container"],
  items: readonly RoCatalogImportPlanItem[]
) => {
  const service = getProductContentService(container)
  const contentIds = new Map<string, string>()
  for (const item of items) {
    if (item.content.existingId) {
      contentIds.set(item.productId, item.content.existingId)
      continue
    }
    const existing = (await service.listProductContents(
      { product_id: item.productId },
      { take: 2 }
    )) as MutableContentRecord[]
    if (existing.length > 1) {
      throw new Error(`product ${item.productId} has ambiguous product_content`)
    }
    const record =
      existing[0] ??
      ((await service.createProductContents({
        ...item.content.baseValues,
        product_id: item.productId,
      })) as MutableContentRecord)
    contentIds.set(item.productId, record.id)
  }
  return contentIds
}

const mutationInputs = (
  items: readonly RoCatalogImportPlanItem[],
  contentIds: ReadonlyMap<string, string>,
  categoryItems: readonly (
    | RoCatalogBrandPlanItem
    | RoCatalogCategoryPlanItem
    | RoCatalogExcludedCategoryPlanItem
  )[] = []
) => {
  const creates: CreateTranslationDTO[] = []
  const updates: UpdateTranslationDTO[] = []
  const append = (
    mutation: TranslationMutation,
    fallbackReferenceId?: string
  ) => {
    if (mutation.action === "unchanged") {
      return
    }
    const referenceId = mutation.referenceId ?? fallbackReferenceId
    if (!referenceId) {
      throw new Error(`${mutation.reference} translation has no reference ID`)
    }
    if (mutation.action === "create") {
      creates.push({
        locale_code: RO_CATALOG_LOCALE,
        reference: mutation.reference,
        reference_id: referenceId,
        translations: { ...mutation.translations },
      })
      return
    }
    if (!mutation.existingId) {
      throw new Error(`${mutation.reference} update has no translation ID`)
    }
    updates.push({
      id: mutation.existingId,
      translations: { ...mutation.translations },
    })
  }
  for (const item of items) {
    append(item.productTranslation)
    append(item.content.translation, contentIds.get(item.productId))
  }
  for (const item of categoryItems) {
    append(item.translation)
  }
  return { creates, updates }
}

const brandReferenceIds = (items: readonly RoCatalogBrandPlanItem[]) =>
  items.map(({ brandId }) => brandId)

const assertBrandTranslationPreconditions = async (
  container: ExecArgs["container"],
  items: readonly RoCatalogBrandPlanItem[]
) => {
  const service = container.resolve<ITranslationModuleService>(
    Modules.TRANSLATION
  )
  const current = await readTranslations(service, brandReferenceIds(items))
  for (const item of items) {
    const matches = current.filter(
      (translation) =>
        translation.reference === "brand" &&
        translation.referenceId === item.brandId
    )
    if (item.translation.existingId) {
      const existing = exactlyOne(
        matches,
        `brand:${item.brandId} changed after import preflight`
      )
      if (
        existing.id !== item.translation.existingId ||
        !isSameImportValue(
          existing.translations,
          item.translation.previousTranslations
        )
      ) {
        throw new Error(`brand:${item.brandId} changed after import preflight`)
      }
    } else if (matches.length !== 0) {
      throw new Error(`brand:${item.brandId} appeared after import preflight`)
    }
  }
}

const assertBrandTranslationsApplied = async (
  container: ExecArgs["container"],
  items: readonly RoCatalogBrandPlanItem[]
) => {
  const service = container.resolve<ITranslationModuleService>(
    Modules.TRANSLATION
  )
  const current = await readTranslations(service, brandReferenceIds(items))
  for (const item of items) {
    const applied = exactlyOne(
      current.filter(
        (translation) =>
          translation.reference === "brand" &&
          translation.referenceId === item.brandId
      ),
      `brand:${item.brandId} was not applied exactly once`
    )
    if (
      !isSameImportValue(applied.translations, item.translation.translations)
    ) {
      throw new Error(`brand:${item.brandId} differs after translation apply`)
    }
  }
}

const assertTranslationPreconditions = async (
  container: ExecArgs["container"],
  items: readonly RoCatalogImportPlanItem[],
  contentIds: ReadonlyMap<string, string>
) => {
  const service = container.resolve<ITranslationModuleService>(
    Modules.TRANSLATION
  )
  const referenceIds = items.flatMap((item) => [
    item.productId,
    contentIds.get(item.productId) ?? "",
  ])
  const current = await readTranslations(service, referenceIds.filter(Boolean))
  const check = (
    mutation: TranslationMutation,
    fallbackReferenceId?: string
  ) => {
    const referenceId = mutation.referenceId ?? fallbackReferenceId
    if (!referenceId) {
      throw new Error(`${mutation.reference} translation has no reference ID`)
    }
    const matches = current.filter(
      (translation) =>
        translation.reference === mutation.reference &&
        translation.referenceId === referenceId
    )
    if (mutation.existingId) {
      const currentTranslation = exactlyOne(
        matches,
        `${mutation.reference}:${referenceId} changed after import preflight`
      )
      if (
        currentTranslation.id !== mutation.existingId ||
        !isSameImportValue(
          currentTranslation.translations,
          mutation.previousTranslations
        )
      ) {
        throw new Error(
          `${mutation.reference}:${referenceId} changed after import preflight`
        )
      }
      return
    }
    if (matches.length !== 0) {
      throw new Error(
        `${mutation.reference}:${referenceId} appeared after import preflight`
      )
    }
  }
  for (const item of items) {
    check(item.productTranslation)
    check(item.content.translation, contentIds.get(item.productId))
  }
}

const assertCategoryTranslationPreconditions = async (
  container: ExecArgs["container"],
  items: readonly (
    | RoCatalogCategoryPlanItem
    | RoCatalogExcludedCategoryPlanItem
  )[]
) => {
  const service = container.resolve<ITranslationModuleService>(
    Modules.TRANSLATION
  )
  const current = await readTranslations(
    service,
    items.map(({ categoryId }) => categoryId)
  )
  for (const item of items) {
    const matches = current.filter(
      (translation) =>
        translation.reference === "product_category" &&
        translation.referenceId === item.categoryId
    )
    if (item.translation.existingId) {
      const existing = exactlyOne(
        matches,
        `product_category:${item.categoryId} changed after import preflight`
      )
      if (
        existing.id !== item.translation.existingId ||
        !isSameImportValue(
          existing.translations,
          item.translation.previousTranslations
        )
      ) {
        throw new Error(
          `product_category:${item.categoryId} changed after import preflight`
        )
      }
    } else if (matches.length !== 0) {
      throw new Error(
        `product_category:${item.categoryId} appeared after import preflight`
      )
    }
  }
}

const assertCategoryTranslationsApplied = async (
  container: ExecArgs["container"],
  items: readonly (
    | RoCatalogCategoryPlanItem
    | RoCatalogExcludedCategoryPlanItem
  )[]
) => {
  const service = container.resolve<ITranslationModuleService>(
    Modules.TRANSLATION
  )
  const current = await readTranslations(
    service,
    items.map(({ categoryId }) => categoryId)
  )
  for (const item of items) {
    const applied = exactlyOne(
      current.filter(
        (translation) =>
          translation.reference === "product_category" &&
          translation.referenceId === item.categoryId
      ),
      `product_category:${item.categoryId} was not applied exactly once`
    )
    if (
      !isSameImportValue(applied.translations, item.translation.translations)
    ) {
      throw new Error(
        `product_category:${item.categoryId} differs after translation apply`
      )
    }
  }
}

const desiredCategoryAssignment = (item: RoCatalogCategoryPlanItem) => ({
  publicationStatus: item.entry.publicationStatus,
  publicSlug: item.entry.publicSlug,
  salesChannelId: item.entry.salesChannelId,
})

const assignmentMatchesPlan = (
  record: StorefrontUrlAssignmentRecord,
  previous: CategoryUrlAssignmentSnapshot
) => isSameImportValue(assignmentSnapshot(record), previous)

const persistCategoryAssignment = async (
  assignmentService: StorefrontUrlAssignmentModuleService,
  outboxService: UrlRegistryOutboxModuleService,
  item: RoCatalogCategoryPlanItem
) => {
  await assignmentService.runInTransaction(async (sharedContext) => {
    const [identityRows, slugRows] = await Promise.all([
      assignmentService.listStorefrontUrlAssignments(
        {
          entity_id: item.categoryId,
          entity_kind: "category",
          market_code: "ro",
        },
        { take: 2 },
        sharedContext
      ),
      assignmentService.listStorefrontUrlAssignments(
        {
          entity_kind: "category",
          market_code: "ro",
          public_slug: item.entry.publicSlug,
        },
        { take: 2 },
        sharedContext
      ),
    ])
    if (identityRows.length > 1 || slugRows.length > 1) {
      throw new Error("category URL assignment state changed after preflight")
    }
    const existing = identityRows[0]
    if (
      (item.assignment.previous === null && existing !== undefined) ||
      (item.assignment.previous !== null &&
        !(
          existing && assignmentMatchesPlan(existing, item.assignment.previous)
        ))
    ) {
      throw new Error(
        `category ${item.categoryId} URL assignment changed after preflight`
      )
    }
    if (slugRows.some((candidate) => candidate.id !== existing?.id)) {
      throw new Error(
        `category ${item.categoryId} RO publicSlug appeared after preflight`
      )
    }
    const desired = desiredCategoryAssignment(item)
    let persisted: StorefrontUrlAssignmentRecord
    if (
      existing &&
      existing.publication_status === desired.publicationStatus &&
      existing.public_slug === desired.publicSlug &&
      existing.sales_channel_id === desired.salesChannelId
    ) {
      persisted = existing
    } else if (existing) {
      persisted = await assignmentService.updateStorefrontUrlAssignments(
        {
          id: existing.id,
          publication_status: desired.publicationStatus,
          public_slug: desired.publicSlug,
          sales_channel_id: desired.salesChannelId,
          source_version: item.assignment.nextSourceVersion,
        },
        sharedContext
      )
    } else {
      persisted = await assignmentService.createStorefrontUrlAssignments(
        {
          entity_id: item.categoryId,
          entity_kind: "category",
          market_code: "ro",
          publication_status: desired.publicationStatus,
          public_slug: desired.publicSlug,
          sales_channel_id: desired.salesChannelId,
          schema_version: 1,
          source_version: 1,
        },
        sharedContext
      )
    }
    if (persisted.source_version !== item.assignment.nextSourceVersion) {
      throw new Error(`category ${item.categoryId} source version drifted`)
    }
    await enqueueCatalogAssignmentLifecycle(
      outboxService,
      persisted,
      sharedContext as Context<SqlEntityManager>
    )
  })
}

const applyCategoryChunk = async (
  container: ExecArgs["container"],
  items: readonly RoCatalogCategoryPlanItem[]
) => {
  await assertCategoryTranslationPreconditions(container, items)
  const { creates, updates } = mutationInputs([], new Map(), items)
  if (creates.length) {
    await createTranslationsWorkflow(container).run({
      input: { translations: creates },
    })
  }
  if (updates.length) {
    await updateTranslationsWorkflow(container).run({
      input: { translations: updates },
    })
  }
  await assertCategoryTranslationsApplied(container, items)
  const assignmentService =
    container.resolve<StorefrontUrlAssignmentModuleService>(
      STOREFRONT_URL_ASSIGNMENT_MODULE
    )
  const outboxService = container.resolve<UrlRegistryOutboxModuleService>(
    URL_REGISTRY_OUTBOX_MODULE
  )
  for (const item of items) {
    await persistCategoryAssignment(assignmentService, outboxService, item)
  }
}

const persistBrandAssignment = async (
  assignmentService: StorefrontUrlAssignmentModuleService,
  outboxService: UrlRegistryOutboxModuleService,
  item: RoCatalogBrandPlanItem
) => {
  await assignmentService.runInTransaction(async (sharedContext) => {
    const [identityRows, slugRows] = await Promise.all([
      assignmentService.listStorefrontUrlAssignments(
        {
          entity_id: item.brandId,
          entity_kind: "brand",
          market_code: "ro",
        },
        { take: 2 },
        sharedContext
      ),
      assignmentService.listStorefrontUrlAssignments(
        {
          entity_kind: "brand",
          market_code: "ro",
          public_slug: item.entry.publicSlug,
        },
        { take: 2 },
        sharedContext
      ),
    ])
    if (identityRows.length > 1 || slugRows.length > 1) {
      throw new Error("brand URL assignment state changed after preflight")
    }
    const existing = identityRows[0]
    if (
      (item.assignment.previous === null && existing !== undefined) ||
      (item.assignment.previous !== null &&
        !(
          existing && assignmentMatchesPlan(existing, item.assignment.previous)
        ))
    ) {
      throw new Error(
        `brand ${item.brandId} URL assignment changed after preflight`
      )
    }
    if (slugRows.some((candidate) => candidate.id !== existing?.id)) {
      throw new Error(
        `brand ${item.brandId} RO publicSlug appeared after preflight`
      )
    }
    const desired = {
      publicationStatus: item.entry.publicationStatus,
      publicSlug: item.entry.publicSlug,
      salesChannelId: item.entry.salesChannelId,
    }
    let persisted: StorefrontUrlAssignmentRecord
    if (
      existing &&
      existing.publication_status === desired.publicationStatus &&
      existing.public_slug === desired.publicSlug &&
      existing.sales_channel_id === desired.salesChannelId
    ) {
      persisted = existing
    } else if (existing) {
      persisted = await assignmentService.updateStorefrontUrlAssignments(
        {
          id: existing.id,
          publication_status: desired.publicationStatus,
          public_slug: desired.publicSlug,
          sales_channel_id: desired.salesChannelId,
          source_version: item.assignment.nextSourceVersion,
        },
        sharedContext
      )
    } else {
      persisted = await assignmentService.createStorefrontUrlAssignments(
        {
          entity_id: item.brandId,
          entity_kind: "brand",
          market_code: "ro",
          publication_status: desired.publicationStatus,
          public_slug: desired.publicSlug,
          sales_channel_id: desired.salesChannelId,
          schema_version: 1,
          source_version: 1,
        },
        sharedContext
      )
    }
    if (persisted.source_version !== item.assignment.nextSourceVersion) {
      throw new Error(`brand ${item.brandId} source version drifted`)
    }
    await enqueueCatalogAssignmentLifecycle(
      outboxService,
      persisted,
      sharedContext as Context<SqlEntityManager>
    )
  })
}

const applyBrandChunk = async (
  container: ExecArgs["container"],
  items: readonly RoCatalogBrandPlanItem[]
) => {
  await assertBrandTranslationPreconditions(container, items)
  const { creates, updates } = mutationInputs([], new Map(), items)
  if (creates.length) {
    await createTranslationsWorkflow(container).run({
      input: { translations: creates },
    })
  }
  if (updates.length) {
    await updateTranslationsWorkflow(container).run({
      input: { translations: updates },
    })
  }
  await assertBrandTranslationsApplied(container, items)
  const assignmentService =
    container.resolve<StorefrontUrlAssignmentModuleService>(
      STOREFRONT_URL_ASSIGNMENT_MODULE
    )
  const outboxService = container.resolve<UrlRegistryOutboxModuleService>(
    URL_REGISTRY_OUTBOX_MODULE
  )
  for (const item of items) {
    await persistBrandAssignment(assignmentService, outboxService, item)
  }
}

const persistExcludedCategoryAssignment = async (
  assignmentService: StorefrontUrlAssignmentModuleService,
  outboxService: UrlRegistryOutboxModuleService,
  item: RoCatalogExcludedCategoryPlanItem
) => {
  if (item.action === "unchanged") {
    return
  }
  await assignmentService.runInTransaction(async (sharedContext) => {
    const rows = await assignmentService.listStorefrontUrlAssignments(
      {
        entity_id: item.categoryId,
        entity_kind: "category",
        market_code: "ro",
      },
      { take: 2 },
      sharedContext
    )
    const existing = item.previous
      ? exactlyOne(
          rows,
          `excluded category ${item.categoryId} URL assignment changed after preflight`
        )
      : undefined
    if (
      !(
        existing &&
        item.previous &&
        assignmentMatchesPlan(existing, item.previous)
      )
    ) {
      throw new Error(
        `excluded category ${item.categoryId} URL assignment changed after preflight`
      )
    }
    const persisted = await assignmentService.updateStorefrontUrlAssignments(
      {
        id: existing.id,
        publication_status: "draft",
        public_slug: existing.public_slug,
        sales_channel_id: existing.sales_channel_id,
        source_version: item.nextSourceVersion,
      },
      sharedContext
    )
    if (persisted.source_version !== item.nextSourceVersion) {
      throw new Error(
        `excluded category ${item.categoryId} source version drifted`
      )
    }
    await enqueueCatalogAssignmentLifecycle(
      outboxService,
      persisted,
      sharedContext as Context<SqlEntityManager>
    )
  })
}

const persistExcludedBrandAssignment = async (
  assignmentService: StorefrontUrlAssignmentModuleService,
  outboxService: UrlRegistryOutboxModuleService,
  item: RoCatalogExcludedBrandPlanItem
) => {
  if (item.action === "unchanged") {
    return
  }
  await assignmentService.runInTransaction(async (sharedContext) => {
    const rows = await assignmentService.listStorefrontUrlAssignments(
      {
        entity_id: item.brandId,
        entity_kind: "brand",
        market_code: "ro",
      },
      { take: 2 },
      sharedContext
    )
    const existing = item.previous
      ? exactlyOne(
          rows,
          `excluded brand ${item.brandId} URL assignment changed after preflight`
        )
      : undefined
    if (
      !(
        existing &&
        item.previous &&
        assignmentMatchesPlan(existing, item.previous)
      )
    ) {
      throw new Error(
        `excluded brand ${item.brandId} URL assignment changed after preflight`
      )
    }
    const persisted = await assignmentService.updateStorefrontUrlAssignments(
      {
        id: existing.id,
        publication_status: "draft",
        public_slug: existing.public_slug,
        sales_channel_id: existing.sales_channel_id,
        source_version: item.nextSourceVersion,
      },
      sharedContext
    )
    if (persisted.source_version !== item.nextSourceVersion) {
      throw new Error(`excluded brand ${item.brandId} source version drifted`)
    }
    await enqueueCatalogAssignmentLifecycle(
      outboxService,
      persisted,
      sharedContext as Context<SqlEntityManager>
    )
  })
}

const applyExcludedBrandChunk = async (
  container: ExecArgs["container"],
  items: readonly RoCatalogExcludedBrandPlanItem[]
) => {
  const assignmentService =
    container.resolve<StorefrontUrlAssignmentModuleService>(
      STOREFRONT_URL_ASSIGNMENT_MODULE
    )
  const outboxService = container.resolve<UrlRegistryOutboxModuleService>(
    URL_REGISTRY_OUTBOX_MODULE
  )
  for (const item of items) {
    await persistExcludedBrandAssignment(assignmentService, outboxService, item)
  }
}

const applyExcludedCategoryChunk = async (
  container: ExecArgs["container"],
  items: readonly RoCatalogExcludedCategoryPlanItem[]
) => {
  await assertCategoryTranslationPreconditions(container, items)
  const assignmentService =
    container.resolve<StorefrontUrlAssignmentModuleService>(
      STOREFRONT_URL_ASSIGNMENT_MODULE
    )
  const outboxService = container.resolve<UrlRegistryOutboxModuleService>(
    URL_REGISTRY_OUTBOX_MODULE
  )
  for (const item of items) {
    await persistExcludedCategoryAssignment(
      assignmentService,
      outboxService,
      item
    )
  }
  const { creates, updates } = mutationInputs([], new Map(), items)
  if (creates.length) {
    await createTranslationsWorkflow(container).run({
      input: { translations: creates },
    })
  }
  if (updates.length) {
    await updateTranslationsWorkflow(container).run({
      input: { translations: updates },
    })
  }
  await assertCategoryTranslationsApplied(container, items)
}

const currentProductsById = async (
  container: ExecArgs["container"],
  ids: readonly string[]
) => {
  const query = container.resolve<QueryService>(ContainerRegistrationKeys.QUERY)
  const { data = [] } = await query.graph<RawProduct>({
    entity: "product",
    fields: ["id", "metadata"],
    filters: { id: [...ids] },
    pagination: { take: ids.length + 1 },
  })
  if (data.length !== ids.length) {
    throw new Error("product set changed after import preflight")
  }
  return new Map(
    data.map((product) => [
      identifier(product.id, "current product.id"),
      product.metadata ?? {},
    ])
  )
}

const currentRoAssignment = (metadata: Readonly<Record<string, unknown>>) => {
  const publication = metadata.url_registry_publication
  if (
    !(
      publication &&
      typeof publication === "object" &&
      !Array.isArray(publication)
    )
  ) {
    return null
  }
  const markets = (publication as Record<string, unknown>).markets
  if (!(markets && typeof markets === "object" && !Array.isArray(markets))) {
    return null
  }
  return (markets as Record<string, unknown>).ro ?? null
}

const applyChunk = async (
  container: ExecArgs["container"],
  items: readonly RoCatalogImportPlanItem[]
) => {
  const contentIds = await ensureContentRecords(container, items)
  await assertTranslationPreconditions(container, items, contentIds)
  const { creates, updates } = mutationInputs(items, contentIds)
  if (creates.length) {
    await createTranslationsWorkflow(container).run({
      input: { translations: creates },
    })
  }
  if (updates.length) {
    await updateTranslationsWorkflow(container).run({
      input: { translations: updates },
    })
  }

  const publicationItems = items.filter(
    (item) => item.publication.action === "update"
  )
  if (!publicationItems.length) {
    return
  }
  const metadataByProductId = await currentProductsById(
    container,
    publicationItems.map(({ productId }) => productId)
  )
  const products = publicationItems.map((item) => {
    const metadata = metadataByProductId.get(item.productId)
    if (!metadata) {
      throw new Error(`product ${item.productId} disappeared during apply`)
    }
    if (
      !isSameImportValue(
        currentRoAssignment(metadata),
        item.publication.previousRoAssignment
      )
    ) {
      throw new Error(
        `product ${item.productId} RO publication changed after preflight`
      )
    }
    return {
      id: item.productId,
      metadata: buildProductPublicationMetadata(metadata, item),
    }
  })
  await updateProductsWorkflow(container).run({ input: { products } })
}

const applyExcludedChunk = async (
  container: ExecArgs["container"],
  items: readonly RoCatalogExcludedProductPlanItem[]
) => {
  const draftItems = items.filter((item) => item.action === "draft")
  if (draftItems.length === 0) {
    return
  }
  const metadataByProductId = await currentProductsById(
    container,
    draftItems.map(({ productId }) => productId)
  )
  const products = draftItems.map((item) => {
    const metadata = metadataByProductId.get(item.productId)
    if (!metadata) {
      throw new Error(
        `excluded product ${item.productId} disappeared during apply`
      )
    }
    if (
      !isSameImportValue(
        currentRoAssignment(metadata),
        item.previousRoAssignment
      )
    ) {
      throw new Error(
        `excluded product ${item.productId} RO publication changed after preflight`
      )
    }
    return {
      id: item.productId,
      metadata: buildExcludedProductPublicationMetadata(metadata, item),
    }
  })
  await updateProductsWorkflow(container).run({ input: { products } })
}

const reconcileVariantAuthority = async (
  container: ExecArgs["container"],
  plan: RoCatalogImportPlan
) => {
  const service = container.resolve<MarketVariantAuthorityModuleService>(
    MARKET_VARIANT_AUTHORITY_MODULE
  )
  const authoritySha256 =
    plan.postCommerceInventoryEvidence.priceAuthoritySha256
  const sourceVersion =
    plan.postCommerceInventoryEvidence.postCommerceEnvelopeSha256
  const entries = plan.items.flatMap((item) =>
    item.variantAuthorityEntries.map((entry) => ({
      ...entry,
      productId: item.productId,
    }))
  )
  await service.replaceMarketVariantAuthorities({
    authoritySha256,
    entries,
    marketCode: "ro",
    sourceVersion,
  })
  for (const item of plan.items) {
    await service.resolveExactMarketVariantAuthority({
      authoritySha256,
      marketCode: "ro",
      productId: item.productId,
      sourceVersion,
      variantIds: item.variantAuthorityEntries.map(
        ({ variantId }) => variantId
      ),
    })
  }
}

const assertSkProtectionUnchanged = (
  refreshed: RoCatalogImportPlan,
  confirmed: RoCatalogImportPlan,
  stage: string
) => {
  if (
    !(
      isSameImportValue(
        refreshed.expectedSkBaseline,
        confirmed.expectedSkBaseline
      ) &&
      isSameImportValue(
        refreshed.expectedSharedInventoryBaseline,
        confirmed.expectedSharedInventoryBaseline
      ) &&
      isSameImportValue(
        refreshed.expectedSkPublication,
        confirmed.expectedSkPublication
      ) &&
      isSameImportValue(refreshed.expectedSkIssues, confirmed.expectedSkIssues)
    )
  ) {
    throw new Error(
      `SK publication or shared inventory protection changed ${stage}`
    )
  }
}

const CATALOG_WORK_SUMMARY_KEYS = [
  "brandAssignmentsToCreate",
  "brandAssignmentsToUpdate",
  "brandExclusionsToDraft",
  "brandTranslationsToCreate",
  "brandTranslationsToUpdate",
  "categoryAssignmentsToCreate",
  "categoryAssignmentsToUpdate",
  "categoryExclusionsToDraft",
  "categoryTranslationsToCreate",
  "categoryTranslationsToUpdate",
  "contentRecordsToCreate",
  "excludedCategoryTranslationsToCreate",
  "excludedCategoryTranslationsToUpdate",
  "exclusionsToDraft",
  "publicationsToUpdate",
  "translationsToCreate",
  "translationsToUpdate",
] as const satisfies readonly (keyof RoCatalogImportPlan["summary"])[]

export const assertRoCatalogImportClosed = (plan: RoCatalogImportPlan) => {
  const remaining = CATALOG_WORK_SUMMARY_KEYS.filter(
    (key) => plan.summary[key] !== 0
  ).map((key) => `${key}=${plan.summary[key]}`)
  if (remaining.length > 0) {
    throw new Error(
      `RO catalog post-apply reread still has pending work: ${remaining.join(", ")}`
    )
  }
}

export const applyRoCatalogImport = async (
  container: ExecArgs["container"],
  plan: RoCatalogImportPlan,
  manifest: RoCatalogManifest,
  options: Readonly<{ chunkSize: number; salesChannelId?: string }>
) => {
  let completedProducts = 0
  let completedCategories = 0
  let completedExcludedCategories = 0
  let completedBrands = 0
  let completedExcludedBrands = 0
  let completedExcludedProducts = 0
  // Retire every reviewed RO exclusion before any included entity can be
  // translated or published. A partial failure therefore narrows RO exposure.
  for (const plannedItems of chunk(plan.excludedItems, options.chunkSize)) {
    const productIds = new Set(plannedItems.map(({ productId }) => productId))
    const refreshed = await prepareRoCatalogImport(container, manifest, {
      salesChannelId: options.salesChannelId,
    })
    assertSkProtectionUnchanged(refreshed, plan, "after confirmed preflight")
    const refreshedItems = refreshed.excludedItems.filter((item) =>
      productIds.has(item.productId)
    )
    if (
      refreshedItems.length !== plannedItems.length ||
      !isSameImportValue(refreshedItems, plannedItems)
    ) {
      throw new Error(
        "RO exclusion state changed after the confirmed preflight; rerun dry-run and confirm the new plan hash"
      )
    }
    await applyExcludedChunk(container, refreshedItems)
    completedExcludedProducts += refreshedItems.length
  }
  for (const plannedItems of chunk(
    plan.excludedCategoryItems,
    options.chunkSize
  )) {
    const categoryIds = new Set(
      plannedItems.map(({ categoryId }) => categoryId)
    )
    const refreshed = await prepareRoCatalogImport(container, manifest, {
      salesChannelId: options.salesChannelId,
    })
    assertSkProtectionUnchanged(refreshed, plan, "after confirmed preflight")
    const refreshedItems = refreshed.excludedCategoryItems.filter((item) =>
      categoryIds.has(item.categoryId)
    )
    if (
      refreshedItems.length !== plannedItems.length ||
      !isSameImportValue(refreshedItems, plannedItems)
    ) {
      throw new Error(
        "RO category exclusion state changed after the confirmed preflight; rerun dry-run and confirm the new plan hash"
      )
    }
    await applyExcludedCategoryChunk(container, refreshedItems)
    completedExcludedCategories += refreshedItems.length
  }
  for (const plannedItems of chunk(
    plan.excludedBrandItems,
    options.chunkSize
  )) {
    const brandIds = new Set(plannedItems.map(({ brandId }) => brandId))
    const refreshed = await prepareRoCatalogImport(container, manifest, {
      salesChannelId: options.salesChannelId,
    })
    assertSkProtectionUnchanged(refreshed, plan, "after confirmed preflight")
    const refreshedItems = refreshed.excludedBrandItems.filter((item) =>
      brandIds.has(item.brandId)
    )
    if (
      refreshedItems.length !== plannedItems.length ||
      !isSameImportValue(refreshedItems, plannedItems)
    ) {
      throw new Error(
        "RO brand exclusion state changed after the confirmed preflight; rerun dry-run and confirm the new plan hash"
      )
    }
    await applyExcludedBrandChunk(container, refreshedItems)
    completedExcludedBrands += refreshedItems.length
  }
  await reconcileVariantAuthority(container, plan)
  for (const plannedItems of chunk(plan.items, options.chunkSize)) {
    const productIds = new Set(plannedItems.map(({ productId }) => productId))
    const plannedKeys = new Set(
      plannedItems.map(({ entry }) => `${entry.key.kind}:${entry.key.value}`)
    )
    const refreshed = await prepareRoCatalogImport(container, manifest, {
      salesChannelId: options.salesChannelId,
    })
    assertSkProtectionUnchanged(refreshed, plan, "after confirmed preflight")
    const refreshedItems = refreshed.items.filter((item) =>
      plannedKeys.has(`${item.entry.key.kind}:${item.entry.key.value}`)
    )
    if (
      refreshedItems.length !== plannedItems.length ||
      !refreshedItems.every((item) => productIds.has(item.productId)) ||
      !isSameImportValue(refreshedItems, plannedItems)
    ) {
      throw new Error(
        "RO catalog state changed after the confirmed preflight; rerun dry-run and confirm the new plan hash"
      )
    }
    await applyChunk(container, refreshedItems)
    completedProducts += refreshedItems.length
  }
  for (const plannedItems of chunk(plan.categoryItems, options.chunkSize)) {
    const categoryIds = new Set(
      plannedItems.map(({ categoryId }) => categoryId)
    )
    const refreshed = await prepareRoCatalogImport(container, manifest, {
      salesChannelId: options.salesChannelId,
    })
    assertSkProtectionUnchanged(refreshed, plan, "after confirmed preflight")
    const refreshedItems = refreshed.categoryItems.filter((item) =>
      categoryIds.has(item.categoryId)
    )
    if (
      refreshedItems.length !== plannedItems.length ||
      !isSameImportValue(refreshedItems, plannedItems)
    ) {
      throw new Error(
        "RO category state changed after the confirmed preflight; rerun dry-run and confirm the new plan hash"
      )
    }
    await applyCategoryChunk(container, refreshedItems)
    completedCategories += refreshedItems.length
  }
  for (const plannedItems of chunk(plan.brandItems, options.chunkSize)) {
    const brandIds = new Set(plannedItems.map(({ brandId }) => brandId))
    const refreshed = await prepareRoCatalogImport(container, manifest, {
      salesChannelId: options.salesChannelId,
    })
    assertSkProtectionUnchanged(refreshed, plan, "after confirmed preflight")
    const refreshedItems = refreshed.brandItems.filter((item) =>
      brandIds.has(item.brandId)
    )
    if (
      refreshedItems.length !== plannedItems.length ||
      !isSameImportValue(refreshedItems, plannedItems)
    ) {
      throw new Error(
        "RO brand state changed after the confirmed preflight; rerun dry-run and confirm the new plan hash"
      )
    }
    await applyBrandChunk(container, refreshedItems)
    completedBrands += refreshedItems.length
  }
  const finalSnapshot = await inspectRoCatalog(
    container,
    manifest.readiness,
    manifest.postCommerceInventoryEvidence
  )
  const finalPlan = buildRoCatalogImportPlan(manifest, finalSnapshot, {
    salesChannelId: options.salesChannelId,
  })
  assertSkProtectionUnchanged(finalPlan, plan, "during RO import")
  if (
    finalPlan.scopeSha256 !== plan.scopeSha256 ||
    !isSameImportValue(finalPlan.scope, plan.scope)
  ) {
    throw new Error("RO catalog scope changed during import")
  }
  assertRoCatalogImportClosed(finalPlan)
  return {
    completedCategories,
    completedBrands,
    completedExcludedCategories,
    completedExcludedBrands,
    completedExcludedProducts,
    completedProducts,
    finalSharedInventoryBaseline: finalPlan.expectedSharedInventoryBaseline,
    finalSkBaseline: finalPlan.expectedSkBaseline,
    finalSkPublication: finalPlan.expectedSkPublication,
  }
}
