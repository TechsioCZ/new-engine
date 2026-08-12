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
  selectRankedProductIds,
} from "../../../../modules/meilisearch/search-results"
import {
  decorateProductsWithMeasurements,
  getMeasurementDecorationOptions,
} from "../../../../utils/measurement-units"
import { MEILISEARCH } from "../../../../workflows/meilisearch"
import { normalizeProductSalesChannelFilter } from "../../../utils/product-filters"
import {
  buildCatalogFilterExpressions,
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

const FACETS_TO_FETCH = [
  "facet_status",
  "facet_form",
  "facet_brand",
  "facet_ingredient",
  "facet_price",
]

const mapStatusFacets = (
  facetCounts: Map<string, number>
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
      }))
  )

  return [...result, ...additionalItems]
}

const mapFormFacets = (facetCounts: Map<string, number>): FacetCountItem[] => {
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
      }))
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
  facetIds: string[]
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

  const { data: brands } = await queryService.graph({
    entity: "brand",
    fields: ["handle", "title"],
    filters: {
      handle: {
        $in: handles,
      },
    },
  })

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
  facetIds: string[]
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

  const { data: categories } = await queryService.graph({
    entity: "product_category",
    fields: ["handle", "name"],
    filters: {
      handle: {
        $in: handles,
      },
    },
  })

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
  labelsById: Map<string, string>
): FacetCountItem[] =>
  sortFacetCountItems(
    Array.from(facetCounts.entries()).map(([id, count]) => ({
      id,
      label: labelsById.get(id) ?? humanizeFacetHandle(id),
      count,
    }))
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

const selectProductMatchesForHydration = (options: {
  cleanedQuery: string
  limit: number
  matchingProducts: RankedProductMatch[]
  offset: number
  priceSortDirection?: 1 | -1
}): RankedProductMatch[] => {
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

const resolveResultCount = (options: {
  estimatedTotalHits?: number
  exhaustiveCandidateSearch: boolean
  fallbackCount: number
  matchingCount: number
}): number => {
  if (options.exhaustiveCandidateSearch) {
    return options.matchingCount
  }
  return options.estimatedTotalHits ?? options.fallbackCount
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
  const measurementDecorationOptions = getMeasurementDecorationOptions(
    req.queryConfig.fields
  )
  const queryService = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const meilisearchService = req.scope.resolve<MeiliSearchService>(MEILISEARCH)

  const page = validatedQuery.page
  const salesChannelIds = getSalesChannelIds(
    req.filterableFields.sales_channel_id
  )
  let searchProfile: SearchProfile
  try {
    searchProfile = resolveSearchProfile(
      {
        locale: validatedQuery.locale,
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
  const limit = Math.min(validatedQuery.limit, searchProfile.limits.page)
  const offset = (page - 1) * limit
  const cleanedQuery = cleanSearchText(validatedQuery.q)

  const categoryIds = normalizeCategoryIdsParam(validatedQuery.category_id)
  const statusIds = normalizeStatusParam(validatedQuery.status)
  const formIds = normalizeFormParam(validatedQuery.form)
  const brandIds = normalizeBrandParam(validatedQuery.brand)
  const ingredientIds = normalizeIngredientParam(validatedQuery.ingredient)

  const filterExpressions = buildCatalogFilterExpressions({
    categoryIds,
    statusIds,
    formIds,
    brandIds,
    ingredientIds,
    priceMin: validatedQuery.price_min,
    priceMax: validatedQuery.price_max,
  })

  const authoritativePriceSortDirection =
    resolveAuthoritativePriceSortDirection(validatedQuery.sort)
  const exhaustiveCandidateSearch = Boolean(
    cleanedQuery || authoritativePriceSortDirection
  )
  const sort =
    resolveCatalogSort(validatedQuery.sort) ??
    (cleanedQuery ? undefined : ["facet_popularity:desc"])
  const meiliSort = authoritativePriceSortDirection ? undefined : sort
  const searchFilters = [
    buildProductResultFilter(
      searchProfile.separateVariantResults,
      cleanedQuery
    ),
    ...filterExpressions,
    ...buildVisibilityFilterExpressions(req.filterableFields.sales_channel_id),
  ]
  const searchFilter =
    searchFilters.length > 0 ? searchFilters.join(" AND ") : undefined
  let searchResult: Awaited<ReturnType<MeiliSearchService["search"]>>
  try {
    searchResult = await meilisearchService.search(
      searchProfile.indexes.product,
      cleanedQuery,
      {
        paginationOptions: {
          limit: exhaustiveCandidateSearch
            ? searchProfile.limits.fullSearch
            : limit,
          offset: exhaustiveCandidateSearch ? 0 : offset,
        },
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
    const productFields = pricingContext
      ? [
          ...STORE_CATALOG_PRODUCTS_DEFAULT_FIELDS,
          ...STORE_CATALOG_PRODUCTS_PRICING_FIELDS,
        ]
      : STORE_CATALOG_PRODUCTS_DEFAULT_FIELDS
    const { data: fallbackProducts, metadata: fallbackMetadata } =
      await queryService.graph({
        entity: "product",
        fields: productFields,
        filters: await normalizeProductSalesChannelFilter(
          queryService,
          remoteQuery,
          {
            ...(cleanedQuery ? { q: cleanedQuery } : {}),
            sales_channel_id: req.filterableFields.sales_channel_id,
            status: ProductStatus.PUBLISHED,
          }
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

    await wrapProductsWithTaxPrices(
      req,
      fallbackProducts as Parameters<typeof wrapProductsWithTaxPrices>[1]
    )
    await decorateProductsWithMeasurements(
      req.scope,
      fallbackProducts as Parameters<
        typeof decorateProductsWithMeasurements
      >[1],
      measurementDecorationOptions
    )
    res.json({
      products: fallbackProducts,
      count: fallbackMetadata?.count ?? fallbackProducts.length,
      page,
      limit,
      totalPages: Math.ceil(
        (fallbackMetadata?.count ?? fallbackProducts.length) / limit
      ),
      facets: {
        status: mapStatusFacets(new Map()),
        form: mapFormFacets(new Map()),
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
    priceSortDirection: authoritativePriceSortDirection,
  })
  const productIds = Array.from(
    new Set(productMatches.map((match) => match.productId))
  )
  const pricingContext = req.pricingContext
    ? QueryContext(req.pricingContext)
    : undefined
  const productFields = pricingContext
    ? [
        ...STORE_CATALOG_PRODUCTS_DEFAULT_FIELDS,
        ...STORE_CATALOG_PRODUCTS_PRICING_FIELDS,
      ]
    : STORE_CATALOG_PRODUCTS_DEFAULT_FIELDS

  const { data: products } =
    productIds.length === 0
      ? { data: [] as Record<string, unknown>[] }
      : await queryService.graph({
          entity: "product",
          fields: productFields,
          filters: await normalizeProductSalesChannelFilter(
            queryService,
            remoteQuery,
            {
              id: {
                $in: productIds,
              },
              sales_channel_id: req.filterableFields.sales_channel_id,
              status: ProductStatus.PUBLISHED,
            }
          ),
          context: pricingContext
            ? {
                variants: {
                  calculated_price: pricingContext,
                },
              }
            : undefined,
        })

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

  const finalProducts = authoritativePriceSortDirection
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

  const [brandLabelsById, ingredientLabelsById] = await Promise.all([
    resolveBrandFacetLabels(queryService, Array.from(brandFacetCounts.keys())),
    resolveIngredientFacetLabels(
      queryService,
      Array.from(ingredientFacetCounts.keys())
    ),
  ])

  const count = resolveResultCount({
    estimatedTotalHits: searchResult.estimatedTotalHits,
    exhaustiveCandidateSearch,
    fallbackCount: finalProducts.length,
    matchingCount: matchingProducts.length,
  })
  const totalPages = count > 0 ? Math.ceil(count / limit) : 0
  await decorateProductsWithMeasurements(
    req.scope,
    finalProducts as Parameters<typeof decorateProductsWithMeasurements>[1],
    measurementDecorationOptions
  )

  res.json({
    products: finalProducts,
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
      status: mapStatusFacets(statusFacetCounts),
      form: mapFormFacets(formFacetCounts),
      brand: mapDynamicFacets(brandFacetCounts, brandLabelsById),
      ingredient: mapDynamicFacets(ingredientFacetCounts, ingredientLabelsById),
      price: {
        min: priceFacetStats.min ?? null,
        max: priceFacetStats.max ?? null,
      },
    },
  })
}
