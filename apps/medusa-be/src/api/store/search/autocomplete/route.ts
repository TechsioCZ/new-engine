import type { Query } from "@medusajs/framework"
import type { MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  ProductStatus,
  QueryContext,
} from "@medusajs/framework/utils"
import type { RequestWithContext } from "@medusajs/medusa/api/store/products/helpers"
import type { MeiliSearchService } from "@rokmohar/medusa-plugin-meilisearch"
import { isRecord, getRecordValue } from "@techsio/std/object"

import { cleanSearchText } from "../../../../modules/meilisearch/documents"
import { isMeilisearchEnabled } from "../../../../modules/meilisearch/env"
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
import { MEILISEARCH } from "../../../../workflows/meilisearch"
import type { ProductFilters } from "../../../utils/product-filters"
import { normalizeProductSalesChannelFilter } from "../../../utils/product-filters"
import {
  STORE_CATALOG_PRODUCTS_DEFAULT_FIELDS,
  STORE_CATALOG_PRODUCTS_PRICING_FIELDS,
} from "../../catalog/products/validators"
import type { StoreProductProjection } from "../../products/product-graph-validation"
import { parseStoreProductListGraphResponse } from "../../products/product-graph-validation"
import { decorateProductProjectionsWithTaxPrices } from "../../products/product-projection-decorators"
import type { StoreSearchAutocompleteSchemaType } from "./validators"

type AutocompleteRequest = RequestWithContext<
  unknown,
  StoreSearchAutocompleteSchemaType
>
type RemoteQuery = Parameters<typeof normalizeProductSalesChannelFilter>[0]

interface AutocompleteDependencies {
  queryService: Query
  remoteQuery: RemoteQuery
}

interface AutocompleteSearchResults {
  brand: SearchResponse | null
  category: SearchResponse | null
  content: SearchResponse | null
  product: SearchResponse | null
}

interface SearchResponse {
  hits: unknown[]
}

const escapeFilterValue = (value: string): string =>
  value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')

const buildSalesChannelFilter = (
  salesChannelIds: string[],
): string | undefined => {
  const expressions = salesChannelIds.map(
    (id) => `facet_sales_channel_ids = "${escapeFilterValue(id)}"`,
  )
  if (expressions.length === 0) {
    return undefined
  }
  return expressions.length === 1
    ? expressions[0]
    : `(${expressions.join(" OR ")})`
}

const buildVisibilityFilter = (
  salesChannelIds: string[],
  resultFilter: string,
): string => {
  const filters = [
    `facet_product_status = "${ProductStatus.PUBLISHED}"`,
    resultFilter,
  ]
  const salesChannelFilter = buildSalesChannelFilter(salesChannelIds)
  if (salesChannelFilter !== undefined) {
    filters.push(salesChannelFilter)
  }
  return filters.join(" AND ")
}

const safeSearch = async (
  service: MeiliSearchService,
  index: string,
  query: string,
  options: Parameters<MeiliSearchService["search"]>[2],
): Promise<SearchResponse | null> => {
  try {
    const rawResult: unknown = await service.search(index, query, options)
    const hits: unknown = isRecord(rawResult)
      ? getRecordValue(rawResult, "hits")
      : undefined
    if (!Array.isArray(hits)) {
      return null
    }
    return { hits }
  } catch {
    return null
  }
}

const getStringId = (value: unknown): string | undefined => {
  if (!isRecord(value)) {
    return undefined
  }

  const id = getRecordValue(value, "id")
  if (typeof id === "string") {
    return id
  }
  return typeof id === "number" && Number.isFinite(id) ? String(id) : undefined
}

const deduplicateHits = (
  hits: unknown[] | undefined,
  field: string,
): unknown[] => {
  const seen = new Set<string>()
  const result: unknown[] = []

  for (const hit of hits ?? []) {
    if (isRecord(hit)) {
      const value = getRecordValue(hit, field)
      const key =
        typeof value === "string"
          ? cleanSearchText(value).toLocaleLowerCase()
          : getStringId(hit)
      const hasKey = key !== undefined && key.length > 0
      if (!(hasKey && seen.has(key))) {
        if (hasKey) {
          seen.add(key)
        }
        result.push(hit)
      }
    }
  }

  return result
}

const resolveRequestProfile = async (
  request: AutocompleteRequest,
): Promise<SearchProfile> => {
  const { locale, profile: requestedKey } = request.validatedQuery
  return resolveSearchProfile(
    {
      ...(locale === undefined ? {} : { locale }),
      ...(requestedKey === undefined ? {} : { requestedKey }),
      salesChannelIds: getSalesChannelIds(
        request.filterableFields.sales_channel_id,
      ),
    },
    await loadSearchProfiles(request.scope),
  )
}

const getProductCandidateLimit = (
  profile: SearchProfile,
  query: string,
): number =>
  query.length === 0
    ? profile.limits.popular
    : Math.min(
        profile.limits.fullSearch,
        Math.max(profile.limits.autocomplete.product * 4, 24),
      )

const searchAutocompleteIndices = async (
  meilisearch: MeiliSearchService,
  profile: SearchProfile,
  query: string,
  salesChannelIds: string[],
): Promise<AutocompleteSearchResults> => {
  const emptyEntitySearch = Promise.resolve<SearchResponse>({ hits: [] })
  const productResultFilter = buildProductResultFilter(
    profile.separateVariantResults,
    query,
  )
  const [product, category, brand, content] = await Promise.all([
    safeSearch(meilisearch, profile.indexes.product, query, {
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
        ],
        ...(query.length > 0
          ? { showRankingScore: true }
          : { sort: ["facet_popularity:desc"] }),
      },
      filter: buildVisibilityFilter(salesChannelIds, productResultFilter),
      paginationOptions: {
        limit: getProductCandidateLimit(profile, query),
        offset: 0,
      },
    }),
    query.length > 0
      ? safeSearch(meilisearch, profile.indexes.category, query, {
          additionalOptions: {
            attributesToRetrieve: ["id", "name", "handle"],
          },
          paginationOptions: {
            limit: profile.limits.autocomplete.category,
            offset: 0,
          },
        })
      : emptyEntitySearch,
    query.length > 0
      ? safeSearch(meilisearch, profile.indexes.brand, query, {
          additionalOptions: {
            attributesToRetrieve: ["id", "title", "handle"],
          },
          paginationOptions: {
            limit: profile.limits.autocomplete.brand,
            offset: 0,
          },
        })
      : emptyEntitySearch,
    query.length > 0
      ? safeSearch(meilisearch, profile.indexes.content, query, {
          additionalOptions: {
            attributesToRetrieve: ["id", "type", "title", "excerpt", "href"],
          },
          paginationOptions: {
            limit: profile.limits.autocomplete.content,
            offset: 0,
          },
        })
      : emptyEntitySearch,
  ])

  return { brand, category, content, product }
}

const getProductQueryContext = (request: AutocompleteRequest) =>
  request.pricingContext === undefined || request.pricingContext === null
    ? undefined
    : {
        variants: {
          calculated_price: QueryContext(request.pricingContext),
        },
      }

const getProductFields = (request: AutocompleteRequest): string[] => {
  const requestedFields = Array.isArray(request.queryConfig.fields)
    ? request.queryConfig.fields.filter(
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
  dependencies: AutocompleteDependencies
  filters: ProductFilters
  pagination?: { skip: number; take: number }
  request: AutocompleteRequest
}): Promise<StoreProductProjection[]> => {
  const context = getProductQueryContext(options.request)
  const filters = await normalizeProductSalesChannelFilter(
    options.dependencies.remoteQuery,
    options.filters,
  )
  const rawResult: unknown = await options.dependencies.queryService.graph({
    ...(context === undefined ? {} : { context }),
    entity: "product",
    fields: getProductFields(options.request),
    filters,
    ...(options.pagination === undefined
      ? {}
      : { pagination: options.pagination }),
  })
  return parseStoreProductListGraphResponse(rawResult).products
}

const hydrateProductMatches = async (
  request: AutocompleteRequest,
  dependencies: AutocompleteDependencies,
  productMatches: RankedProductMatch[],
  query: string,
  productResultLimit: number,
  productSearchFailed: boolean,
): Promise<StoreProductProjection[]> => {
  const productIds = [
    ...new Set(productMatches.map((match) => match.productId)),
  ]
  if (productIds.length > 0) {
    const products = await queryProducts({
      dependencies,
      filters: {
        id: { $in: productIds },
        sales_channel_id: request.filterableFields.sales_channel_id,
        status: ProductStatus.PUBLISHED,
      },
      request,
    })
    const expanded = expandProductsBySearchMatches(products, productMatches)
    return parseStoreProductListGraphResponse({ data: expanded }).products
  }
  if (!productSearchFailed) {
    return []
  }

  return await queryProducts({
    dependencies,
    filters: {
      q: query,
      sales_channel_id: request.filterableFields.sales_channel_id,
      status: ProductStatus.PUBLISHED,
    },
    pagination: { skip: 0, take: productResultLimit },
    request,
  })
}

const getSearchAutocomplete = async (
  request: AutocompleteRequest,
  response: MedusaResponse,
): Promise<void> => {
  if (!isMeilisearchEnabled()) {
    response.status(503).json({ message: "Catalog search is disabled" })
    return
  }

  let profile: SearchProfile
  try {
    profile = await resolveRequestProfile(request)
  } catch (error) {
    if (isSearchProfileResolutionError(error)) {
      response.status(400).json({ message: error.message })
      return
    }
    throw error
  }

  const query = cleanSearchText(request.validatedQuery.q)
  const searches = await searchAutocompleteIndices(
    request.scope.resolve<MeiliSearchService>(MEILISEARCH),
    profile,
    query,
    getSalesChannelIds(request.filterableFields.sales_channel_id),
  )
  const rankedProducts = selectRankedProductIds(
    searches.product?.hits,
    query,
    profile.minimumRankingScore,
    profile.strict,
  )
  const productResultLimit =
    query.length > 0
      ? profile.limits.autocomplete.product
      : profile.limits.popular
  const productMatches = rankedProducts.matches.slice(0, productResultLimit)
  const dependencies: AutocompleteDependencies = {
    queryService: request.scope.resolve<Query>(ContainerRegistrationKeys.QUERY),
    remoteQuery: request.scope.resolve<RemoteQuery>(
      ContainerRegistrationKeys.REMOTE_QUERY,
    ),
  }
  const products = await hydrateProductMatches(
    request,
    dependencies,
    productMatches,
    query,
    productResultLimit,
    searches.product === null,
  )
  await decorateProductProjectionsWithTaxPrices(request, products)
  const degraded = Object.values(searches).some((result) => result === null)

  response.json({
    brands: deduplicateHits(searches.brand?.hits, "title"),
    categories: deduplicateHits(searches.category?.hits, "name"),
    content: deduplicateHits(searches.content?.hits, "href"),
    degraded,
    exactIdentifierMatch: rankedProducts.exactIdentifierMatch,
    products,
    profile: profile.key,
    query,
  })
}

export { getSearchAutocomplete as GET }
