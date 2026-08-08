import type { Query } from "@medusajs/framework"
import type { MedusaResponse } from "@medusajs/framework/http"
import type { Logger } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  ProductStatus,
  QueryContext,
} from "@medusajs/framework/utils"
import type { RequestWithContext } from "@medusajs/medusa/api/store/products/helpers"
import type { MeiliSearchService } from "@rokmohar/medusa-plugin-meilisearch"
import { isRecord } from "@techsio/std/object"

import { cleanSearchText } from "../../../../modules/meilisearch/documents"
import { isMeilisearchEnabled } from "../../../../modules/meilisearch/env"
import {
  extractBrandHandleFromFacetId,
  extractIngredientHandleFromFacetId,
  FORM_FACET_DEFINITIONS,
  FORM_FACET_LABEL_BY_ID,
  STATUS_FACET_DEFINITIONS,
  STATUS_FACET_LABEL_BY_ID,
} from "../../../../modules/meilisearch/facets/product-facets"
import type { SearchProfile } from "../../../../modules/meilisearch/profiles"
import {
  isSearchProfileResolutionError,
  loadSearchProfiles,
  resolveSearchProfile,
} from "../../../../modules/meilisearch/profiles"
import type { RankedProductMatch } from "../../../../modules/meilisearch/search-results"
import {
  buildProductResultFilter,
  expandProductsBySearchMatches,
  getSalesChannelIds,
  selectRankedProductIds,
} from "../../../../modules/meilisearch/search-results"
import {
  decorateProductsWithMeasurements,
  getMeasurementDecorationOptions,
} from "../../../../utils/measurement-units"
import { MEILISEARCH } from "../../../../workflows/meilisearch"
import { normalizeProductSalesChannelFilter } from "../../../utils/product-filters"
import type { StoreProductProjection } from "../../products/product-graph-validation"
import { parseStoreProductListGraphResponse } from "../../products/product-graph-validation"
import { decorateProductProjectionsWithTaxPrices } from "../../products/product-projection-decorators"
import type { FacetCountItem } from "./utils"
import {
  buildCatalogFilterExpressions,
  getFacetDistributionFromHits,
  humanizeFacetHandle,
  normalizeBrandParam,
  normalizeCategoryIdsParam,
  normalizeFormParam,
  normalizeIngredientParam,
  normalizeStatusParam,
  resolveCatalogSort,
  sortFacetCountItems,
} from "./utils"
import type { StoreCatalogProductsSchemaType } from "./validators"
import {
  STORE_CATALOG_PRODUCTS_DEFAULT_FIELDS,
  STORE_CATALOG_PRODUCTS_PRICING_FIELDS,
} from "./validators"

const FACETS_TO_FETCH = [
  "facet_status",
  "facet_form",
  "facet_brand",
  "facet_ingredient",
  "facet_price",
]

type CatalogRequest = RequestWithContext<
  unknown,
  StoreCatalogProductsSchemaType
>
type CatalogSearchResult = Awaited<ReturnType<MeiliSearchService["search"]>>
type RemoteQuery = Parameters<typeof normalizeProductSalesChannelFilter>[1]
type PriceSortDirection = -1 | 1 | undefined

interface CatalogDependencies {
  meilisearchService: MeiliSearchService
  queryService: Query
  remoteQuery: RemoteQuery
}

interface CatalogProductQueryResult {
  metadata: { count?: number | undefined } | undefined
  products: StoreProductProjection[]
}

interface CatalogSearchPlan {
  authoritativePriceSortDirection: PriceSortDirection
  cleanedQuery: string
  filter: string
  limit: number
  offset: number
  page: number
  priceMax: number | undefined
  priceMin: number | undefined
  profile: SearchProfile
  sort: string[] | undefined
}

interface FacetResponse {
  brand: FacetCountItem[]
  form: FacetCountItem[]
  ingredient: FacetCountItem[]
  price: {
    max: null | number
    min: null | number
  }
  status: FacetCountItem[]
}

const mapDefinedFacets = (
  definitions: readonly { id: string; label: string }[],
  fallbackLabels: ReadonlyMap<string, string>,
  facetCounts: Map<string, number>,
): FacetCountItem[] => {
  const usedIds = new Set<string>()
  const result = definitions.map((item) => {
    usedIds.add(item.id)
    return {
      count: facetCounts.get(item.id) ?? 0,
      id: item.id,
      label: item.label,
    }
  })
  const additionalItems: FacetCountItem[] = []

  for (const [id, count] of facetCounts) {
    if (!usedIds.has(id)) {
      additionalItems.push({
        count,
        id,
        label: fallbackLabels.get(id) ?? id,
      })
    }
  }

  return [...result, ...sortFacetCountItems(additionalItems)]
}

const mapStatusFacets = (facetCounts: Map<string, number>): FacetCountItem[] =>
  mapDefinedFacets(
    STATUS_FACET_DEFINITIONS,
    STATUS_FACET_LABEL_BY_ID,
    facetCounts,
  )

const mapFormFacets = (facetCounts: Map<string, number>): FacetCountItem[] =>
  mapDefinedFacets(FORM_FACET_DEFINITIONS, FORM_FACET_LABEL_BY_ID, facetCounts)

const escapeMeiliFilterValue = (value: string): string =>
  value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')

const buildMeiliOrExpression = (
  field: string,
  values: string[],
): string | undefined => {
  const uniqueValues = [...new Set(values.filter((value) => value.length > 0))]
  if (uniqueValues.length === 0) {
    return undefined
  }

  const [firstValue] = uniqueValues
  if (uniqueValues.length === 1 && firstValue !== undefined) {
    return `${field} = "${escapeMeiliFilterValue(firstValue)}"`
  }

  return `(${uniqueValues
    .map((value) => `${field} = "${escapeMeiliFilterValue(value)}"`)
    .join(" OR ")})`
}

const buildVisibilityFilterExpressions = (
  salesChannelIdFilter: unknown,
): string[] => {
  const expressions = [
    `facet_product_status = "${escapeMeiliFilterValue(ProductStatus.PUBLISHED)}"`,
  ]
  const salesChannelExpression = buildMeiliOrExpression(
    "facet_sales_channel_ids",
    getSalesChannelIds(salesChannelIdFilter),
  )

  if (salesChannelExpression !== undefined) {
    expressions.push(salesChannelExpression)
  }

  return expressions
}

const getGraphRecords = (value: unknown): Record<string, unknown>[] => {
  if (!isRecord(value) || !Array.isArray(value["data"])) {
    return []
  }

  return value["data"].filter(isRecord)
}

const getFacetHandles = (
  facetIds: string[],
  extractHandle: (facetId: string) => string | undefined,
): string[] => {
  const handles = new Set<string>()
  for (const facetId of facetIds) {
    const handle = extractHandle(facetId)
    if (handle !== undefined && handle.length > 0) {
      handles.add(handle)
    }
  }
  return [...handles]
}

const resolveFacetLabels = async (options: {
  entity: "brand" | "product_category"
  extractHandle: (facetId: string) => string | undefined
  facetIds: string[]
  labelField: "name" | "title"
  queryService: Query
}): Promise<Map<string, string>> => {
  const labelsById = new Map<string, string>()
  const handles = getFacetHandles(options.facetIds, options.extractHandle)
  if (handles.length === 0) {
    return labelsById
  }

  const rawResult: unknown = await options.queryService.graph({
    entity: options.entity,
    fields: ["handle", options.labelField],
    filters: { handle: { $in: handles } },
  })
  const labelsByHandle = new Map<string, string>()
  for (const record of getGraphRecords(rawResult)) {
    const { handle } = record
    const label = record[options.labelField]
    if (typeof handle === "string" && typeof label === "string") {
      labelsByHandle.set(handle, label)
    }
  }

  for (const facetId of options.facetIds) {
    const handle = options.extractHandle(facetId)
    if (handle !== undefined && handle.length > 0) {
      labelsById.set(
        facetId,
        labelsByHandle.get(handle) ?? humanizeFacetHandle(handle),
      )
    }
  }

  return labelsById
}

const mapDynamicFacets = (
  facetCounts: Map<string, number>,
  labelsById: Map<string, string>,
): FacetCountItem[] =>
  sortFacetCountItems(
    [...facetCounts.entries()].map(([id, count]) => ({
      count,
      id,
      label: labelsById.get(id) ?? humanizeFacetHandle(id),
    })),
  )

const getAuthoritativeCurrencyCode = (
  req: CatalogRequest,
): string | undefined => {
  if (isRecord(req.pricingContext)) {
    const contextCurrency = req.pricingContext.currency_code
    if (
      typeof contextCurrency === "string" &&
      contextCurrency.trim().length > 0
    ) {
      return contextCurrency.trim().toLowerCase()
    }
  }
  const requestedCurrency = req.validatedQuery.currency_code
    ?.trim()
    .toLowerCase()
  return requestedCurrency !== undefined && requestedCurrency.length > 0
    ? requestedCurrency
    : undefined
}

const getLowestCalculatedProductPrice = (
  product: unknown,
  authoritativeCurrencyCode: string | undefined,
): number | undefined => {
  if (!isRecord(product)) {
    return undefined
  }

  const searchResult = product["search_result"]
  const selectedVariantId = isRecord(searchResult)
    ? searchResult["variant_id"]
    : undefined
  const variants = Array.isArray(product["variants"])
    ? product["variants"].filter(isRecord)
    : []
  const selectedVariant = variants.find(
    (variant) =>
      typeof selectedVariantId === "string" &&
      variant["id"] === selectedVariantId,
  )
  const candidates =
    selectedVariant === undefined ? variants : [selectedVariant]
  const prices: number[] = []

  for (const variant of candidates) {
    const calculatedPrice = variant["calculated_price"]
    if (!isRecord(calculatedPrice)) {
      continue
    }
    const amount = calculatedPrice["calculated_amount"]
    const currencyCode = calculatedPrice["currency_code"]
    const hasAuthoritativeCurrency =
      authoritativeCurrencyCode === undefined ||
      (typeof currencyCode === "string" &&
        currencyCode.toLowerCase() === authoritativeCurrencyCode)
    if (
      hasAuthoritativeCurrency &&
      typeof amount === "number" &&
      Number.isFinite(amount) &&
      amount >= 0
    ) {
      prices.push(amount)
    }
  }

  return prices.length === 0 ? undefined : Math.min(...prices)
}

const resolveAuthoritativePriceSortDirection = (
  sort: string,
): PriceSortDirection => {
  if (sort === "price-asc") {
    return 1
  }
  if (sort === "price-desc") {
    return -1
  }
  return undefined
}

const resolveRequestProfile = async (
  req: CatalogRequest,
): Promise<SearchProfile> => {
  const { locale, profile: requestedKey } = req.validatedQuery
  return resolveSearchProfile(
    {
      ...(locale === undefined ? {} : { locale }),
      ...(requestedKey === undefined ? {} : { requestedKey }),
      salesChannelIds: getSalesChannelIds(
        req.filterableFields.sales_channel_id,
      ),
    },
    await loadSearchProfiles(req.scope),
  )
}

const buildSearchPlan = (
  req: CatalogRequest,
  profile: SearchProfile,
): CatalogSearchPlan => {
  const { page } = req.validatedQuery
  const limit = Math.min(req.validatedQuery.limit, profile.limits.page)
  const offset = (page - 1) * limit
  const cleanedQuery = cleanSearchText(req.validatedQuery.q)
  const authoritativePriceSortDirection =
    resolveAuthoritativePriceSortDirection(req.validatedQuery.sort)
  let meiliSort: string[] | undefined
  if (authoritativePriceSortDirection === undefined) {
    meiliSort = resolveCatalogSort(req.validatedQuery.sort)
    if (meiliSort === undefined && cleanedQuery.length === 0) {
      meiliSort = ["facet_popularity:desc"]
    }
  }
  const { brand, category_id, form, ingredient, price_max, price_min, status } =
    req.validatedQuery
  const catalogFilters = buildCatalogFilterExpressions({
    brandIds: normalizeBrandParam(brand),
    categoryIds: normalizeCategoryIdsParam(category_id),
    formIds: normalizeFormParam(form),
    ingredientIds: normalizeIngredientParam(ingredient),
    statusIds: normalizeStatusParam(status),
  })
  const filter = [
    buildProductResultFilter(profile.separateVariantResults, cleanedQuery),
    ...catalogFilters,
    ...buildVisibilityFilterExpressions(req.filterableFields.sales_channel_id),
  ].join(" AND ")

  return {
    authoritativePriceSortDirection,
    cleanedQuery,
    filter,
    limit,
    offset,
    page,
    priceMax: price_max,
    priceMin: price_min,
    profile,
    sort: meiliSort,
  }
}

const searchCatalog = async (
  service: MeiliSearchService,
  plan: CatalogSearchPlan,
): Promise<CatalogSearchResult> =>
  await service.search(plan.profile.indexes.product, plan.cleanedQuery, {
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
      ...(plan.cleanedQuery.length > 0 ? { showRankingScore: true } : {}),
      ...(plan.sort === undefined ? {} : { sort: plan.sort }),
    },
    filter: plan.filter,
    paginationOptions: {
      limit: plan.profile.limits.fullSearch,
      offset: 0,
    },
  })

const getProductQueryContext = (req: CatalogRequest) =>
  req.pricingContext === undefined || req.pricingContext === null
    ? undefined
    : { variants: { calculated_price: QueryContext(req.pricingContext) } }

const getProductFields = (req: CatalogRequest): string[] => {
  const requestedFields = Array.isArray(req.queryConfig.fields)
    ? req.queryConfig.fields.filter(
        (field): field is string =>
          typeof field === "string" && field.length > 0,
      )
    : []
  return [
    ...new Set([
      ...STORE_CATALOG_PRODUCTS_DEFAULT_FIELDS,
      ...requestedFields,
      ...STORE_CATALOG_PRODUCTS_PRICING_FIELDS,
    ]),
  ]
}

const queryProducts = async (options: {
  dependencies: CatalogDependencies
  filters: Record<string, unknown>
  pagination?: { skip: number; take: number }
  req: CatalogRequest
}): Promise<CatalogProductQueryResult> => {
  const context = getProductQueryContext(options.req)
  const normalizedFilters = await normalizeProductSalesChannelFilter(
    options.dependencies.queryService,
    options.dependencies.remoteQuery,
    options.filters,
  )
  const rawResult: unknown = await options.dependencies.queryService.graph({
    ...(context === undefined ? {} : { context }),
    entity: "product",
    fields: getProductFields(options.req),
    filters: normalizedFilters,
    ...(options.pagination === undefined
      ? {}
      : { pagination: options.pagination }),
  })
  const parsed = parseStoreProductListGraphResponse(rawResult)
  return {
    metadata: parsed.metadata,
    products: parsed.products,
  }
}

const decorateProducts = async (
  req: CatalogRequest,
  products: StoreProductProjection[],
): Promise<void> => {
  await decorateProductProjectionsWithTaxPrices(req, products)
  await decorateProductsWithMeasurements(
    req.scope,
    products,
    getMeasurementDecorationOptions(req.queryConfig.fields),
  )
}

const hasConstrainedFallbackRequest = (req: CatalogRequest): boolean => {
  const {
    brand,
    category_id,
    form,
    ingredient,
    price_max,
    price_min,
    sort,
    status,
  } = req.validatedQuery
  const facetValues = [
    normalizeBrandParam(brand),
    normalizeCategoryIdsParam(category_id),
    normalizeFormParam(form),
    normalizeIngredientParam(ingredient),
    normalizeStatusParam(status),
  ]
  const hasFacetConstraint = facetValues.some((values) => values.length > 0)
  const hasPriceConstraint = price_min !== undefined || price_max !== undefined
  return hasFacetConstraint || hasPriceConstraint || sort !== "recommended"
}

const sendDegradedFallback = async (
  req: CatalogRequest,
  res: MedusaResponse,
  dependencies: CatalogDependencies,
  plan: CatalogSearchPlan,
  error: unknown,
): Promise<void> => {
  const logger = req.scope.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const errorMessage = error instanceof Error ? error.message : String(error)
  if (hasConstrainedFallbackRequest(req)) {
    logger.error(
      `Meilisearch catalog query failed for a constrained request: ${errorMessage}`,
    )
    res.status(503).json({
      code: "CATALOG_SEARCH_UNAVAILABLE_FOR_CONSTRAINED_QUERY",
      message:
        "Catalog search is temporarily unavailable; active filters or sorting cannot be applied safely.",
    })
    return
  }

  logger.warn(
    `Meilisearch catalog query failed; using capped Medusa fallback: ${errorMessage}`,
  )
  const fallback = await queryProducts({
    dependencies,
    filters: {
      ...(plan.cleanedQuery.length === 0 ? {} : { q: plan.cleanedQuery }),
      sales_channel_id: req.filterableFields.sales_channel_id,
      status: ProductStatus.PUBLISHED,
    },
    pagination: { skip: plan.offset, take: plan.limit },
    req,
  })
  await decorateProducts(req, fallback.products)
  const count = fallback.metadata?.count ?? fallback.products.length

  res.json({
    count,
    facets: {
      brand: [],
      form: mapFormFacets(new Map()),
      ingredient: [],
      price: { max: null, min: null },
      status: mapStatusFacets(new Map()),
    },
    limit: plan.limit,
    page: plan.page,
    products: fallback.products,
    search: {
      degraded: true,
      exactIdentifierMatch: false,
      profile: plan.profile.key,
    },
    totalPages: Math.ceil(count / plan.limit),
  })
}

const hydrateRankedProducts = async (
  req: CatalogRequest,
  dependencies: CatalogDependencies,
  matches: RankedProductMatch[],
): Promise<StoreProductProjection[]> => {
  const productIds = [...new Set(matches.map((match) => match.productId))]
  if (productIds.length === 0) {
    return []
  }

  const { products } = await queryProducts({
    dependencies,
    filters: {
      id: { $in: productIds },
      sales_channel_id: req.filterableFields.sales_channel_id,
      status: ProductStatus.PUBLISHED,
    },
    req,
  })
  const expanded = expandProductsBySearchMatches(products, matches)
  return parseStoreProductListGraphResponse({ data: expanded }).products
}

const filterProductsByPrice = (options: {
  authoritativeCurrencyCode: string | undefined
  priceMax: number | undefined
  priceMin: number | undefined
  products: StoreProductProjection[]
}): StoreProductProjection[] =>
  options.products.filter((product) => {
    const price = getLowestCalculatedProductPrice(
      product,
      options.authoritativeCurrencyCode,
    )
    if (price === undefined) {
      return options.priceMin === undefined && options.priceMax === undefined
    }
    return (
      (options.priceMin === undefined || price >= options.priceMin) &&
      (options.priceMax === undefined || price <= options.priceMax)
    )
  })

const getProductResultKey = (value: unknown): string | undefined => {
  if (!isRecord(value)) {
    return undefined
  }
  const { id, search_product_id: searchProductId } = value
  let productId: string | undefined
  if (typeof searchProductId === "string") {
    productId = searchProductId
  } else if (typeof id === "string") {
    productId = id
  }
  if (productId === undefined) {
    return undefined
  }
  const searchResult = value["search_result"]
  const variantId = isRecord(searchResult)
    ? searchResult["variant_id"]
    : value["search_variant_id"]
  return typeof variantId === "string" && variantId.length > 0
    ? `${productId}:${variantId}`
    : productId
}

const filterHitsForProducts = (
  hits: unknown[],
  products: StoreProductProjection[],
): unknown[] => {
  const productKeys = new Set(
    products
      .map(getProductResultKey)
      .filter((key): key is string => key !== undefined),
  )
  return hits.filter((hit) => {
    const key = getProductResultKey(hit)
    return key !== undefined && productKeys.has(key)
  })
}

const getAuthoritativePriceStats = (
  products: StoreProductProjection[],
  authoritativeCurrencyCode: string | undefined,
): { max: number | undefined; min: number | undefined } => {
  const prices = products
    .map((product) =>
      getLowestCalculatedProductPrice(product, authoritativeCurrencyCode),
    )
    .filter((price): price is number => price !== undefined)
  return {
    max: prices.length === 0 ? undefined : Math.max(...prices),
    min: prices.length === 0 ? undefined : Math.min(...prices),
  }
}

const hasCompleteCandidateSet = (
  result: CatalogSearchResult,
  candidateLimit: number,
): boolean => {
  if (!Array.isArray(result.hits)) {
    return false
  }
  if (typeof result.estimatedTotalHits === "number") {
    return result.estimatedTotalHits <= result.hits.length
  }
  return result.hits.length < candidateLimit
}

const sortAndPageProducts = (
  products: StoreProductProjection[],
  direction: PriceSortDirection,
  offset: number,
  limit: number,
  authoritativeCurrencyCode: string | undefined,
): StoreProductProjection[] => {
  if (direction === undefined) {
    return products.slice(offset, offset + limit)
  }

  return products
    .toSorted((left, right) => {
      const leftPrice = getLowestCalculatedProductPrice(
        left,
        authoritativeCurrencyCode,
      )
      const rightPrice = getLowestCalculatedProductPrice(
        right,
        authoritativeCurrencyCode,
      )
      if (leftPrice === undefined) {
        return rightPrice === undefined ? 0 : 1
      }
      if (rightPrice === undefined) {
        return -1
      }
      return (leftPrice - rightPrice) * direction
    })
    .slice(offset, offset + limit)
}

const buildFacets = async (
  queryService: Query,
  selectedHits: unknown,
  authoritativePriceStats: { max: number | undefined; min: number | undefined },
): Promise<FacetResponse> => {
  const getDistribution = (key: string) =>
    getFacetDistributionFromHits(selectedHits, key)
  const statusCounts = getDistribution("facet_status")
  const formCounts = getDistribution("facet_form")
  const brandCounts = getDistribution("facet_brand")
  const ingredientCounts = getDistribution("facet_ingredient")
  const priceStats = authoritativePriceStats
  const [brandLabels, ingredientLabels] = await Promise.all([
    resolveFacetLabels({
      entity: "brand",
      extractHandle: extractBrandHandleFromFacetId,
      facetIds: [...brandCounts.keys()],
      labelField: "title",
      queryService,
    }),
    resolveFacetLabels({
      entity: "product_category",
      extractHandle: extractIngredientHandleFromFacetId,
      facetIds: [...ingredientCounts.keys()],
      labelField: "name",
      queryService,
    }),
  ])

  return {
    brand: mapDynamicFacets(brandCounts, brandLabels),
    form: mapFormFacets(formCounts),
    ingredient: mapDynamicFacets(ingredientCounts, ingredientLabels),
    price: {
      max: priceStats.max ?? null,
      min: priceStats.min ?? null,
    },
    status: mapStatusFacets(statusCounts),
  }
}

const getCatalogProducts = async (
  req: CatalogRequest,
  res: MedusaResponse,
): Promise<void> => {
  if (!isMeilisearchEnabled()) {
    res.status(503).json({ message: "Catalog search is disabled" })
    return
  }

  let profile: SearchProfile
  try {
    profile = await resolveRequestProfile(req)
  } catch (error) {
    if (isSearchProfileResolutionError(error)) {
      res.status(400).json({ message: error.message })
      return
    }
    throw error
  }

  const dependencies: CatalogDependencies = {
    meilisearchService: req.scope.resolve<MeiliSearchService>(MEILISEARCH),
    queryService: req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY),
    remoteQuery: req.scope.resolve<RemoteQuery>(
      ContainerRegistrationKeys.REMOTE_QUERY,
    ),
  }
  const plan = buildSearchPlan(req, profile)
  let searchResult: CatalogSearchResult
  try {
    searchResult = await searchCatalog(dependencies.meilisearchService, plan)
  } catch (error) {
    await sendDegradedFallback(req, res, dependencies, plan, error)
    return
  }

  if (!hasCompleteCandidateSet(searchResult, profile.limits.fullSearch)) {
    const logger = req.scope.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    logger.error(
      `Catalog candidate set exceeded the configured limit of ${profile.limits.fullSearch}`,
    )
    res.status(503).json({
      code: "CATALOG_CANDIDATE_LIMIT_EXCEEDED",
      message:
        "Catalog search is temporarily unable to evaluate the full filtered result set.",
    })
    return
  }

  const rankedProducts = selectRankedProductIds(
    searchResult.hits,
    plan.cleanedQuery,
    profile.minimumRankingScore,
    profile.strict,
  )
  const hydratedProducts = await hydrateRankedProducts(
    req,
    dependencies,
    rankedProducts.matches,
  )
  await decorateProductProjectionsWithTaxPrices(req, hydratedProducts)
  const authoritativeCurrencyCode = getAuthoritativeCurrencyCode(req)
  const filteredProducts = filterProductsByPrice({
    authoritativeCurrencyCode,
    priceMax: plan.priceMax,
    priceMin: plan.priceMin,
    products: hydratedProducts,
  })
  const products = sortAndPageProducts(
    filteredProducts,
    plan.authoritativePriceSortDirection,
    plan.offset,
    plan.limit,
    authoritativeCurrencyCode,
  )
  await decorateProductsWithMeasurements(
    req.scope,
    products,
    getMeasurementDecorationOptions(req.queryConfig.fields),
  )
  const count = filteredProducts.length
  const selectedHits = filterHitsForProducts(
    rankedProducts.selectedHits,
    filteredProducts,
  )
  const facets = await buildFacets(
    dependencies.queryService,
    selectedHits,
    getAuthoritativePriceStats(hydratedProducts, authoritativeCurrencyCode),
  )

  res.json({
    count,
    facets,
    limit: plan.limit,
    page: plan.page,
    products,
    search: {
      degraded: false,
      exactIdentifierMatch: rankedProducts.exactIdentifierMatch,
      profile: profile.key,
    },
    totalPages: count > 0 ? Math.ceil(count / plan.limit) : 0,
  })
}

export { getCatalogProducts as GET }
