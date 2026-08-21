import type { Query } from "@medusajs/framework"
import type { MedusaResponse } from "@medusajs/framework/http"
import type { Logger } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  ProductStatus,
  QueryContext,
} from "@medusajs/framework/utils"
import {
  type RequestWithContext,
  wrapProductsWithTaxPrices,
} from "@medusajs/medusa/api/store/products/helpers"
import type { MeiliSearchService } from "@rokmohar/medusa-plugin-meilisearch"
import {
  buildProductVariantSearchDocumentId,
  cleanSearchText,
} from "../../../../modules/meilisearch/documents"
import { isMeilisearchEnabled } from "../../../../modules/meilisearch/env"
import {
  extractBrandHandleFromFacetId,
  extractIngredientHandleFromFacetId,
  FORM_FACET_DEFINITIONS,
  FORM_FACET_LABEL_BY_ID,
  STATUS_FACET_DEFINITIONS,
  STATUS_FACET_LABEL_BY_ID,
} from "../../../../modules/meilisearch/facets/product-facets"
import {
  type FacetPriceCurrencyScope,
  resolveVerifiedFacetPriceCurrency,
} from "../../../../modules/meilisearch/profile-currency"
import {
  loadSearchProfiles,
  resolveSearchProfile,
  type SearchProfile,
  SearchProfileResolutionError,
} from "../../../../modules/meilisearch/profiles"
import {
  buildProductResultFilter,
  expandProductsBySearchMatches,
  getSalesChannelIds,
  type RankedProductMatch,
  resolveStorefrontSalesChannelFilter,
  selectRankedProductIds,
} from "../../../../modules/meilisearch/search-results"
import { isPlainRecord } from "../../../../utils/guards"
import {
  decorateProductsWithLocalizedContent,
  requestsLocalizedProductContent,
} from "../../../../utils/localized-product-content"
import {
  decorateProductsWithMeasurements,
  getMeasurementDecorationOptions,
  getMeasurementDecorationQueryFields,
} from "../../../../utils/measurement-units"
import {
  listActiveSalePriceListProductSelection,
  ProductSaleAdapterBuilder,
  type ProductSaleFetchGraphConfig,
  type ProductSaleProductSelection,
} from "../../../../utils/product-sale-adapters"
import { MEILISEARCH } from "../../../../workflows/meilisearch"
import { normalizeProductSalesChannelFilter } from "../../../utils/product-filters"
import { CATALOG_SALES_CHANNEL_IDS_PROPERTY } from "./middlewares"
import {
  applyCollectionScopeToProductFilters,
  buildCatalogFilterExpressions,
  CATALOG_SORT_VALUES,
  type FacetCountItem,
  getFacetDistribution,
  getFacetDistributionFromHits,
  getNumericFacetStats,
  getNumericFacetStatsFromHits,
  humanizeFacetHandle,
  normalizeBrandParam,
  normalizeCategoryIdsParam,
  normalizeFormParam,
  normalizeIngredientParam,
  normalizeStatusParam,
  resolveCatalogSort,
  sortFacetCountItems,
} from "./utils"
import {
  STORE_CATALOG_PRODUCTS_DEFAULT_FIELDS,
  STORE_CATALOG_PRODUCTS_PRICING_FIELDS,
  type StoreCatalogProductsSchemaType,
} from "./validators"

type BrandRecord = {
  handle?: string
  title?: string
}

type CategoryRecord = {
  handle?: string
  name?: string
}

type ProductWithCalculatedPrices = {
  id?: unknown
  search_result?: {
    variant_id?: unknown
  }
  variants?: Array<{
    id?: unknown
    calculated_price?: {
      calculated_amount?: unknown
    } | null
  }> | null
}

type CatalogResponseFieldsRequest = {
  catalogResponseFields?: string[]
}

const productSaleAdapterBuilder =
  ProductSaleAdapterBuilder.withDefaultAdapters()

const FACETS_TO_FETCH = [
  "facet_product_status",
  "facet_status",
  "facet_form",
  "facet_brand",
  "facet_ingredient",
  "facet_price",
]

const mapStatusFacets = (
  facetCounts: Map<string, number>,
  locale?: string
): FacetCountItem[] => {
  const usedIds = new Set<string>()

  const result: FacetCountItem[] = STATUS_FACET_DEFINITIONS.map((item) => {
    usedIds.add(item.id)

    return {
      id: item.id,
      label: item.label,
      count: facetCounts.get(item.id) ?? 0,
    }
  })

  const additionalItems = sortFacetCountItems(
    Array.from(facetCounts.entries())
      .filter(([id]) => !usedIds.has(id))
      .map(([id, count]) => ({
        id,
        label: STATUS_FACET_LABEL_BY_ID.get(id) ?? id,
        count,
      })),
    locale
  )

  return [...result, ...additionalItems]
}

const mapFormFacets = (
  facetCounts: Map<string, number>,
  locale?: string
): FacetCountItem[] => {
  const usedIds = new Set<string>()

  const result: FacetCountItem[] = FORM_FACET_DEFINITIONS.map((item) => {
    usedIds.add(item.id)

    return {
      id: item.id,
      label: item.label,
      count: facetCounts.get(item.id) ?? 0,
    }
  })

  const additionalItems = sortFacetCountItems(
    Array.from(facetCounts.entries())
      .filter(([id]) => !usedIds.has(id))
      .map(([id, count]) => ({
        id,
        label: FORM_FACET_LABEL_BY_ID.get(id) ?? id,
        count,
      })),
    locale
  )

  return [...result, ...additionalItems]
}

const escapeMeiliFilterValue = (value: string): string =>
  value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')

const buildMeiliOrExpression = (
  field: string,
  values: string[]
): string | undefined => {
  const uniqueValues = Array.from(new Set(values.filter(Boolean)))
  if (uniqueValues.length === 0) {
    return
  }

  if (uniqueValues.length === 1) {
    const [value] = uniqueValues
    return value ? `${field} = "${escapeMeiliFilterValue(value)}"` : undefined
  }

  return `(${uniqueValues
    .map((value) => `${field} = "${escapeMeiliFilterValue(value)}"`)
    .join(" OR ")})`
}

const buildVisibilityFilterExpressions = (
  salesChannelIdFilter: unknown
): string[] => {
  const expressions = [
    `facet_product_status = "${escapeMeiliFilterValue(ProductStatus.PUBLISHED)}"`,
  ]
  const salesChannelExpression = buildMeiliOrExpression(
    "facet_sales_channel_ids",
    getSalesChannelIds(salesChannelIdFilter)
  )

  if (salesChannelExpression) {
    expressions.push(salesChannelExpression)
  }

  return expressions
}
const resolveBrandFacetLabels = async (
  queryService: Query,
  facetIds: string[],
  locale?: string
): Promise<Map<string, string>> => {
  const labelsById = new Map<string, string>()
  const handles = Array.from(
    new Set(
      facetIds
        .map((id) => extractBrandHandleFromFacetId(id))
        .filter((handle): handle is string => Boolean(handle))
    )
  )

  if (handles.length === 0) {
    return labelsById
  }

  const { data: brands } = await queryService.graph(
    {
      entity: "brand",
      fields: ["handle", "title"],
      filters: {
        handle: {
          $in: handles,
        },
      },
    },
    { locale }
  )

  const brandTitleByHandle = new Map<string, string>()
  for (const brand of brands as BrandRecord[]) {
    if (!(brand.handle && brand.title)) {
      continue
    }
    brandTitleByHandle.set(brand.handle, brand.title)
  }

  for (const facetId of facetIds) {
    const handle = extractBrandHandleFromFacetId(facetId)
    if (!handle) {
      continue
    }

    labelsById.set(
      facetId,
      brandTitleByHandle.get(handle) ?? humanizeFacetHandle(handle)
    )
  }

  return labelsById
}

const resolveIngredientFacetLabels = async (
  queryService: Query,
  facetIds: string[],
  locale?: string
): Promise<Map<string, string>> => {
  const labelsById = new Map<string, string>()
  const handles = Array.from(
    new Set(
      facetIds
        .map((id) => extractIngredientHandleFromFacetId(id))
        .filter((handle): handle is string => Boolean(handle))
    )
  )

  if (handles.length === 0) {
    return labelsById
  }

  const { data: categories } = await queryService.graph(
    {
      entity: "product_category",
      fields: ["handle", "name"],
      filters: {
        handle: {
          $in: handles,
        },
      },
    },
    { locale }
  )

  const categoryNameByHandle = new Map<string, string>()
  for (const category of categories as CategoryRecord[]) {
    if (!(category.handle && category.name)) {
      continue
    }
    categoryNameByHandle.set(category.handle, category.name)
  }

  for (const facetId of facetIds) {
    const handle = extractIngredientHandleFromFacetId(facetId)
    if (!handle) {
      continue
    }

    labelsById.set(
      facetId,
      categoryNameByHandle.get(handle) ?? humanizeFacetHandle(handle)
    )
  }

  return labelsById
}

const mapDynamicFacets = (
  facetCounts: Map<string, number>,
  labelsById: Map<string, string>,
  locale?: string
): FacetCountItem[] =>
  sortFacetCountItems(
    Array.from(facetCounts.entries()).map(([id, count]) => ({
      id,
      label: labelsById.get(id) ?? humanizeFacetHandle(id),
      count,
    })),
    locale
  )

const getLowestCalculatedProductPrice = (
  product: ProductWithCalculatedPrices
): number | undefined => {
  const selectedVariantId = product.search_result?.variant_id
  const selectedVariant = (product.variants ?? []).find(
    (variant) =>
      typeof selectedVariantId === "string" && variant.id === selectedVariantId
  )
  const selectedVariantPrice =
    selectedVariant?.calculated_price?.calculated_amount

  if (
    typeof selectedVariantPrice === "number" &&
    Number.isFinite(selectedVariantPrice)
  ) {
    return selectedVariantPrice
  }

  const prices = (product.variants ?? [])
    .map((variant) => variant.calculated_price?.calculated_amount)
    .filter(
      (amount): amount is number =>
        typeof amount === "number" && Number.isFinite(amount)
    )

  return prices.length > 0 ? Math.min(...prices) : undefined
}

const resolveAuthoritativePriceSortDirection = (
  sort: string
): 1 | -1 | undefined => {
  if (sort === "price-asc") {
    return 1
  }
  if (sort === "price-desc") {
    return -1
  }
  return
}

export const usesIndexedProfilePriceSort = (
  profile: Pick<SearchProfile, "locale">,
  priceSortDirection: 1 | -1 | undefined,
  currencyScope: FacetPriceCurrencyScope
): boolean =>
  Boolean(
    priceSortDirection &&
      resolveVerifiedFacetPriceCurrency(profile.locale, currencyScope)
  )

export const resolveCatalogSearchExecutionPlan = (options: {
  cleanedQuery: string
  fullSearchLimit: number
  limit: number
  offset: number
  profile: Pick<SearchProfile, "locale">
  pricingContextCurrencyCode?: string
  requestedSort: string
  requestedCurrencyCode?: string
}) => {
  const priceSortDirection = resolveAuthoritativePriceSortDirection(
    options.requestedSort
  )
  const indexedProfilePriceSort = usesIndexedProfilePriceSort(
    options.profile,
    priceSortDirection,
    {
      pricingContextCurrencyCode: options.pricingContextCurrencyCode,
      requestedCurrencyCode: options.requestedCurrencyCode,
    }
  )
  const exhaustiveCandidateSearch = Boolean(
    (options.cleanedQuery || priceSortDirection) && !indexedProfilePriceSort
  )
  const catalogSort = CATALOG_SORT_VALUES.find(
    (candidate) => candidate === options.requestedSort
  )
  const sort =
    (catalogSort ? resolveCatalogSort(catalogSort) : undefined) ??
    (options.cleanedQuery ? undefined : ["facet_popularity:desc"])
  const meiliSort =
    priceSortDirection && !indexedProfilePriceSort ? undefined : sort

  return {
    exhaustiveCandidateSearch,
    indexedProfilePriceSort,
    meiliSort,
    paginationOptions: {
      limit: exhaustiveCandidateSearch
        ? options.fullSearchLimit
        : options.limit,
      offset: exhaustiveCandidateSearch ? 0 : options.offset,
    },
    priceSortDirection,
  }
}

export const selectProductMatchesForHydration = (options: {
  cleanedQuery: string
  limit: number
  matchingProducts: RankedProductMatch[]
  offset: number
  prePaginated?: boolean
  priceSortDirection?: 1 | -1
}): RankedProductMatch[] => {
  if (options.prePaginated) {
    return options.matchingProducts
  }
  if (options.priceSortDirection) {
    return options.matchingProducts
  }
  if (options.cleanedQuery) {
    return options.matchingProducts.slice(
      options.offset,
      options.offset + options.limit
    )
  }
  return options.matchingProducts
}

export const resolveResultCount = (options: {
  estimatedTotalHits?: number
  exhaustiveCandidateSearch: boolean
  fallbackCount: number
  matchingCount: number
  productStatusFacetCount?: number
}): number => {
  if (options.exhaustiveCandidateSearch) {
    return options.matchingCount
  }
  return (
    options.productStatusFacetCount ??
    options.estimatedTotalHits ??
    options.fallbackCount
  )
}

const getStringRecordField = (
  record: unknown,
  field: string
): string | undefined => {
  if (!(record && typeof record === "object" && !Array.isArray(record))) {
    return
  }

  const value = (record as Record<string, unknown>)[field]
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

const getPricingContextCurrencyCode = (
  pricingContext: unknown
): string | undefined =>
  getStringRecordField(pricingContext, "currency_code")?.toLowerCase()

const getPricingContextCustomerGroupIds = (
  pricingContext: unknown
): string[] => {
  if (!(pricingContext && typeof pricingContext === "object")) {
    return []
  }

  const customer = (pricingContext as Record<string, unknown>).customer
  if (!(customer && typeof customer === "object" && !Array.isArray(customer))) {
    return []
  }

  const groups = (customer as Record<string, unknown>).groups
  if (!Array.isArray(groups)) {
    return []
  }

  return groups
    .map((group) => getStringRecordField(group, "id"))
    .filter((id): id is string => Boolean(id))
}

const getSaleSearchDocumentIds = (
  selection: ProductSaleProductSelection
): string[] =>
  Array.from(
    new Set([
      ...selection.productIds,
      ...selection.variantMatches.map((match) =>
        buildProductVariantSearchDocumentId(match.productId, match.variantId)
      ),
    ])
  )

const buildProductIdFilter = (
  productIds: string[] | undefined
): Record<string, unknown> | undefined =>
  productIds && productIds.length > 0 ? { $in: productIds } : undefined

const CATALOG_INTERNAL_PRODUCT_FIELDS = ["id"]
const CATALOG_SYNTHETIC_PRODUCT_FIELDS = new Set(["sale_adapters"])
const CATALOG_INTERNAL_PRICING_FIELDS = [
  "variants.id",
  ...STORE_CATALOG_PRODUCTS_PRICING_FIELDS,
]
const INCLUDED_FIELD_PREFIX_PATTERN = /^[+*]/

const getCatalogResponseFields = (
  req: RequestWithContext<unknown, StoreCatalogProductsSchemaType>
): string[] => {
  const storedFields = (req as CatalogResponseFieldsRequest)
    .catalogResponseFields

  return Array.isArray(storedFields)
    ? storedFields
    : (req.queryConfig.fields ?? STORE_CATALOG_PRODUCTS_DEFAULT_FIELDS)
}

const hasExplicitCatalogFields = (
  query: StoreCatalogProductsSchemaType
): boolean => typeof query.fields === "string" && query.fields.trim().length > 0

const uniqueFields = (fields: string[]): string[] => Array.from(new Set(fields))

export const buildCatalogProductQueryFields = (options: {
  needsPricing: boolean
  responseFields: string[]
}): string[] => {
  const responseFields = options.responseFields.filter(
    (field) => !isSyntheticCatalogProductField(field)
  )
  const fields = [
    ...getMeasurementDecorationQueryFields(
      responseFields,
      getMeasurementDecorationOptions(responseFields)
    ),
    ...CATALOG_INTERNAL_PRODUCT_FIELDS,
  ]

  if (options.needsPricing) {
    fields.push(...CATALOG_INTERNAL_PRICING_FIELDS)
  }

  return uniqueFields(fields)
}

const normalizeProjectionField = (field: string): string | undefined => {
  const normalized = field.trim().replace(INCLUDED_FIELD_PREFIX_PATTERN, "")
  return normalized ? normalized : undefined
}

const isSyntheticCatalogProductField = (field: string): boolean =>
  CATALOG_SYNTHETIC_PRODUCT_FIELDS.has(normalizeProjectionField(field) ?? "")

const setProjectedArrayField = (
  target: Record<string, unknown>,
  segment: string,
  value: unknown[],
  rest: string[]
): void => {
  const existingItems = Array.isArray(target[segment])
    ? (target[segment] as unknown[])
    : []
  target[segment] = value.map((item, index) => {
    const existingItem = isPlainRecord(existingItems[index])
      ? { ...existingItems[index] }
      : {}
    copyProjectionField(item, existingItem, rest)
    return existingItem
  })
}

const setProjectedRecordField = (
  target: Record<string, unknown>,
  segment: string,
  value: Record<string, unknown>,
  rest: string[]
): void => {
  const existing = isPlainRecord(target[segment])
    ? { ...(target[segment] as Record<string, unknown>) }
    : {}
  copyProjectionField(value, existing, rest)
  if (Object.keys(existing).length > 0) {
    target[segment] = existing
  }
}

function copyProjectionField(
  source: unknown,
  target: Record<string, unknown>,
  segments: string[]
): void {
  const [segment, ...rest] = segments
  if (!(segment && source && typeof source === "object")) {
    return
  }

  if (segment === "*") {
    if (isPlainRecord(source)) {
      Object.assign(target, source)
    }
    return
  }

  if (!(isPlainRecord(source) && segment in source)) {
    return
  }

  const value = source[segment]
  if (value === undefined) {
    return
  }

  if (rest.length === 0 || rest[0] === "*") {
    target[segment] = value
    return
  }

  if (Array.isArray(value)) {
    setProjectedArrayField(target, segment, value, rest)
    return
  }

  if (isPlainRecord(value)) {
    setProjectedRecordField(target, segment, value, rest)
  }
}

const projectProductsForCatalogResponse = (
  products: Record<string, unknown>[],
  responseFields: string[]
): Record<string, unknown>[] => {
  const projectionFields = responseFields
    .map(normalizeProjectionField)
    .filter((field): field is string => Boolean(field))

  if (projectionFields.length === 0) {
    return products
  }

  return products.map((product) => {
    const projected: Record<string, unknown> = {}

    for (const field of projectionFields) {
      copyProjectionField(product, projected, field.split("."))
    }

    return projected
  })
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: This route coordinates search, authoritative hydration, facets, pricing, and degraded fallback.
export async function GET(
  req: RequestWithContext<unknown, StoreCatalogProductsSchemaType>,
  res: MedusaResponse
) {
  if (!isMeilisearchEnabled()) {
    res.status(503).json({
      message: "Catalog search is disabled",
    })
    return
  }

  const validatedQuery = req.validatedQuery
  const responseProductFields = getCatalogResponseFields(req)
  const hasExplicitFields = hasExplicitCatalogFields(validatedQuery)
  const requestedLocale = req.locale ?? validatedQuery.locale
  const saleAdapterMatcher = productSaleAdapterBuilder.build(
    validatedQuery.on_sale
  )
  const measurementDecorationOptions = getMeasurementDecorationOptions(
    responseProductFields
  )
  const queryService = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const meilisearchService = req.scope.resolve<MeiliSearchService>(MEILISEARCH)

  const page = validatedQuery.page
  const preservedSalesChannelIds = (
    req as typeof req & {
      [CATALOG_SALES_CHANNEL_IDS_PROPERTY]?: string[]
    }
  )[CATALOG_SALES_CHANNEL_IDS_PROPERTY]
  const salesChannelFilter = resolveStorefrontSalesChannelFilter(
    req.filterableFields.sales_channel_id,
    preservedSalesChannelIds ?? req.publishable_key_context?.sales_channel_ids
  )
  const salesChannelIds = getSalesChannelIds(salesChannelFilter)
  let searchProfile: SearchProfile
  try {
    searchProfile = resolveSearchProfile(
      {
        locale: requestedLocale,
        requestedKey: validatedQuery.profile,
        salesChannelIds,
      },
      await loadSearchProfiles(req.scope)
    )
  } catch (error) {
    if (error instanceof SearchProfileResolutionError) {
      res.status(400).json({ message: error.message })
      return
    }
    throw error
  }
  const graphLocale =
    requestedLocale ??
    (searchProfile.locale === "default" ? undefined : searchProfile.locale)
  let saleProductSelection: ProductSaleProductSelection | undefined
  const fetchProducts = async (graph: ProductSaleFetchGraphConfig) =>
    saleAdapterMatcher.enabled
      ? productSaleAdapterBuilder.fetchProducts({
          eligibility: {
            productIds: saleProductSelection?.productIds ?? [],
          },
          graph,
          query: {
            graph: (config) =>
              queryService.graph(config, { locale: graphLocale }),
          },
          selection: validatedQuery.on_sale ?? true,
        })
      : queryService.graph(graph, { locale: graphLocale })
  const limit = Math.min(validatedQuery.limit, searchProfile.limits.page)
  const offset = (page - 1) * limit
  const cleanedQuery = cleanSearchText(validatedQuery.q)
  const pricingContextCurrencyCode = getPricingContextCurrencyCode(
    req.pricingContext
  )

  if (saleAdapterMatcher.enabled) {
    saleProductSelection = await listActiveSalePriceListProductSelection({
      currencyCode: pricingContextCurrencyCode ?? validatedQuery.currency_code,
      customerGroupIds: getPricingContextCustomerGroupIds(req.pricingContext),
      query: queryService,
    })

    if (saleProductSelection.productIds.length === 0) {
      res.json({
        products: [],
        count: 0,
        page,
        limit,
        totalPages: 0,
        facets: {
          status: mapStatusFacets(new Map(), graphLocale),
          form: mapFormFacets(new Map(), graphLocale),
          brand: [],
          ingredient: [],
          price: {
            min: null,
            max: null,
          },
        },
        search: {
          degraded: false,
          exactIdentifierMatch: false,
          profile: searchProfile.key,
        },
      })
      return
    }
  }

  const categoryIds = normalizeCategoryIdsParam(validatedQuery.category_id)
  const statusIds = normalizeStatusParam(validatedQuery.status)
  const formIds = normalizeFormParam(validatedQuery.form)
  const brandIds = normalizeBrandParam(validatedQuery.brand)
  const ingredientIds = normalizeIngredientParam(validatedQuery.ingredient)

  const filterExpressions = buildCatalogFilterExpressions({
    collectionId: validatedQuery.collection_id,
    categoryIds,
    statusIds,
    formIds,
    brandIds,
    ingredientIds,
    priceMin: validatedQuery.price_min,
    priceMax: validatedQuery.price_max,
  })

  const {
    exhaustiveCandidateSearch,
    indexedProfilePriceSort,
    meiliSort,
    paginationOptions,
    priceSortDirection: authoritativePriceSortDirection,
  } = resolveCatalogSearchExecutionPlan({
    cleanedQuery,
    fullSearchLimit: searchProfile.limits.fullSearch,
    limit,
    offset,
    profile: searchProfile,
    pricingContextCurrencyCode,
    requestedSort: validatedQuery.sort,
    requestedCurrencyCode: validatedQuery.currency_code,
  })
  const saleSearchExpression = saleProductSelection
    ? buildMeiliOrExpression(
        "id",
        getSaleSearchDocumentIds(saleProductSelection)
      )
    : undefined
  const searchFilters = [
    buildProductResultFilter(
      searchProfile.separateVariantResults,
      cleanedQuery
    ),
    ...filterExpressions,
    ...(saleSearchExpression ? [saleSearchExpression] : []),
    ...buildVisibilityFilterExpressions(salesChannelFilter),
  ]
  const searchFilter =
    searchFilters.length > 0 ? searchFilters.join(" AND ") : undefined
  let searchResult: Awaited<ReturnType<MeiliSearchService["search"]>>
  try {
    searchResult = await meilisearchService.search(
      searchProfile.indexes.product,
      cleanedQuery,
      {
        paginationOptions,
        filter: searchFilter,
        additionalOptions: {
          attributesToRetrieve: [
            "id",
            "title",
            "brand",
            "search_product_id",
            "search_variant_id",
            "search_variant_title",
            "search_variant_titles",
            "search_identifiers_normalized",
            "facet_status",
            "facet_form",
            "facet_brand",
            "facet_ingredient",
            "facet_price",
          ],
          facets: FACETS_TO_FETCH,
          ...(cleanedQuery ? { showRankingScore: true } : {}),
          ...(meiliSort ? { sort: meiliSort } : {}),
        },
      }
    )
  } catch (error) {
    const logger = req.scope.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    logger.warn(
      `Meilisearch catalog query failed; using capped Medusa fallback: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
    const pricingContext = req.pricingContext
      ? QueryContext(req.pricingContext)
      : undefined
    const productFields = buildCatalogProductQueryFields({
      needsPricing: Boolean(
        pricingContext ||
          saleAdapterMatcher.enabled ||
          authoritativePriceSortDirection
      ),
      responseFields: responseProductFields,
    })
    const { data: fallbackProducts, metadata: fallbackMetadata } =
      await fetchProducts({
        entity: "product",
        fields: productFields,
        filters: await normalizeProductSalesChannelFilter(
          queryService,
          remoteQuery,
          applyCollectionScopeToProductFilters(
            {
              ...(cleanedQuery ? { q: cleanedQuery } : {}),
              ...(saleProductSelection
                ? { id: buildProductIdFilter(saleProductSelection.productIds) }
                : {}),
              sales_channel_id: salesChannelFilter,
              status: ProductStatus.PUBLISHED,
            },
            validatedQuery.collection_id
          )
        ),
        pagination: {
          take: limit,
          skip: offset,
        },
        context: pricingContext
          ? {
              variants: {
                calculated_price: pricingContext,
              },
            }
          : undefined,
      })
    const fallbackCount = fallbackMetadata?.count ?? fallbackProducts.length

    if (requestsLocalizedProductContent(responseProductFields)) {
      await decorateProductsWithLocalizedContent(
        req.scope,
        fallbackProducts as Parameters<
          typeof decorateProductsWithLocalizedContent
        >[1],
        graphLocale
      )
    }

    await wrapProductsWithTaxPrices(
      req,
      fallbackProducts as Parameters<typeof wrapProductsWithTaxPrices>[1]
    )
    await decorateProductsWithMeasurements(
      req.scope,
      fallbackProducts as Parameters<
        typeof decorateProductsWithMeasurements
      >[1],
      measurementDecorationOptions,
      graphLocale
    )
    const responseProducts = hasExplicitFields
      ? projectProductsForCatalogResponse(
          fallbackProducts as Record<string, unknown>[],
          responseProductFields
        )
      : fallbackProducts

    res.json({
      products: responseProducts,
      count: fallbackCount,
      page,
      limit,
      totalPages: Math.ceil(fallbackCount / limit),
      facets: {
        status: mapStatusFacets(new Map(), graphLocale),
        form: mapFormFacets(new Map(), graphLocale),
        brand: [],
        ingredient: [],
        price: {
          min: null,
          max: null,
        },
      },
      search: {
        degraded: true,
        exactIdentifierMatch: false,
        profile: searchProfile.key,
      },
    })
    return
  }

  const rankedProducts = selectRankedProductIds(
    searchResult.hits,
    cleanedQuery,
    searchProfile.minimumRankingScore,
    searchProfile.strict
  )
  const matchingProducts = rankedProducts.matches
  const productMatches = selectProductMatchesForHydration({
    cleanedQuery,
    limit,
    matchingProducts,
    offset,
    prePaginated: indexedProfilePriceSort,
    priceSortDirection: authoritativePriceSortDirection,
  })
  const productIds = Array.from(
    new Set(productMatches.map((match) => match.productId))
  )
  const pricingContext = req.pricingContext
    ? QueryContext(req.pricingContext)
    : undefined
  const productFields = buildCatalogProductQueryFields({
    needsPricing: Boolean(
      pricingContext ||
        saleAdapterMatcher.enabled ||
        authoritativePriceSortDirection
    ),
    responseFields: responseProductFields,
  })

  const productQuery = {
    entity: "product",
    fields: productFields,
    filters: await normalizeProductSalesChannelFilter(
      queryService,
      remoteQuery,
      applyCollectionScopeToProductFilters(
        {
          id: {
            $in: productIds,
          },
          sales_channel_id: salesChannelFilter,
          status: ProductStatus.PUBLISHED,
        },
        validatedQuery.collection_id
      )
    ),
    context: pricingContext
      ? {
          variants: {
            calculated_price: pricingContext,
          },
        }
      : undefined,
  }
  const { data: products } =
    productIds.length === 0
      ? { data: [] as Record<string, unknown>[] }
      : await fetchProducts(productQuery)

  const orderedProducts = expandProductsBySearchMatches(
    products as Record<string, unknown>[],
    productMatches
  )
  await wrapProductsWithTaxPrices(
    req,
    orderedProducts as unknown as Parameters<
      typeof wrapProductsWithTaxPrices
    >[1]
  )

  const finalProducts =
    authoritativePriceSortDirection && !indexedProfilePriceSort
      ? [...orderedProducts]
          .sort((left, right) => {
            const leftPrice = getLowestCalculatedProductPrice(
              left as ProductWithCalculatedPrices
            )
            const rightPrice = getLowestCalculatedProductPrice(
              right as ProductWithCalculatedPrices
            )

            if (leftPrice === undefined && rightPrice === undefined) {
              return 0
            }
            if (leftPrice === undefined) {
              return 1
            }
            if (rightPrice === undefined) {
              return -1
            }

            return (leftPrice - rightPrice) * authoritativePriceSortDirection
          })
          .slice(offset, offset + limit)
      : orderedProducts

  if (requestsLocalizedProductContent(responseProductFields)) {
    await decorateProductsWithLocalizedContent(
      req.scope,
      finalProducts as Parameters<
        typeof decorateProductsWithLocalizedContent
      >[1],
      graphLocale
    )
  }

  const statusFacetCounts = cleanedQuery
    ? getFacetDistributionFromHits(rankedProducts.selectedHits, "facet_status")
    : getFacetDistribution(searchResult.facetDistribution, "facet_status")
  const formFacetCounts = cleanedQuery
    ? getFacetDistributionFromHits(rankedProducts.selectedHits, "facet_form")
    : getFacetDistribution(searchResult.facetDistribution, "facet_form")
  const brandFacetCounts = cleanedQuery
    ? getFacetDistributionFromHits(rankedProducts.selectedHits, "facet_brand")
    : getFacetDistribution(searchResult.facetDistribution, "facet_brand")
  const ingredientFacetCounts = cleanedQuery
    ? getFacetDistributionFromHits(
        rankedProducts.selectedHits,
        "facet_ingredient"
      )
    : getFacetDistribution(searchResult.facetDistribution, "facet_ingredient")
  const priceFacetStats = cleanedQuery
    ? getNumericFacetStatsFromHits(rankedProducts.selectedHits, "facet_price")
    : getNumericFacetStats(searchResult.facetStats, "facet_price")
  const productStatusFacetCount = getFacetDistribution(
    searchResult.facetDistribution,
    "facet_product_status"
  ).get(ProductStatus.PUBLISHED)

  const [brandLabelsById, ingredientLabelsById] = await Promise.all([
    resolveBrandFacetLabels(
      queryService,
      Array.from(brandFacetCounts.keys()),
      graphLocale
    ),
    resolveIngredientFacetLabels(
      queryService,
      Array.from(ingredientFacetCounts.keys()),
      graphLocale
    ),
  ])

  const count = resolveResultCount({
    estimatedTotalHits: searchResult.estimatedTotalHits,
    exhaustiveCandidateSearch,
    fallbackCount: finalProducts.length,
    matchingCount: matchingProducts.length,
    productStatusFacetCount,
  })
  const totalPages = count > 0 ? Math.ceil(count / limit) : 0
  await decorateProductsWithMeasurements(
    req.scope,
    finalProducts as Parameters<typeof decorateProductsWithMeasurements>[1],
    measurementDecorationOptions,
    graphLocale
  )

  const responseProducts = hasExplicitFields
    ? projectProductsForCatalogResponse(
        finalProducts as Record<string, unknown>[],
        responseProductFields
      )
    : finalProducts

  res.json({
    products: responseProducts,
    count,
    page,
    limit,
    totalPages,
    search: {
      degraded: false,
      exactIdentifierMatch: rankedProducts.exactIdentifierMatch,
      profile: searchProfile.key,
    },
    facets: {
      status: mapStatusFacets(statusFacetCounts, graphLocale),
      form: mapFormFacets(formFacetCounts, graphLocale),
      brand: mapDynamicFacets(brandFacetCounts, brandLabelsById, graphLocale),
      ingredient: mapDynamicFacets(
        ingredientFacetCounts,
        ingredientLabelsById,
        graphLocale
      ),
      price: {
        min: priceFacetStats.min ?? null,
        max: priceFacetStats.max ?? null,
      },
    },
  })
}
