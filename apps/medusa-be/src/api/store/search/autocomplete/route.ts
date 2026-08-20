import type { Query } from "@medusajs/framework"
import type { MedusaResponse } from "@medusajs/framework/http"
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
  loadSearchProfiles,
  resolveSearchProfile,
  type SearchProfile,
  SearchProfileResolutionError,
} from "../../../../modules/meilisearch/profiles"
import {
  buildProductResultFilter,
  expandProductsBySearchMatches,
  getSalesChannelIds,
  selectRankedProductIds,
} from "../../../../modules/meilisearch/search-results"
import { MEILISEARCH } from "../../../../workflows/meilisearch"
import { normalizeProductSalesChannelFilter } from "../../../utils/product-filters"
import {
  STORE_CATALOG_PRODUCTS_DEFAULT_FIELDS,
  STORE_CATALOG_PRODUCTS_PRICING_FIELDS,
} from "../../catalog/products/validators"
import type { StoreSearchAutocompleteSchemaType } from "./validators"

type SearchResponse = {
  hits?: unknown[]
}

const escapeFilterValue = (value: string): string =>
  value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')

const buildVisibilityFilter = (
  salesChannelIds: string[],
  resultFilter: string
): string => {
  const filters = [
    `facet_product_status = "${ProductStatus.PUBLISHED}"`,
    resultFilter,
  ]

  if (salesChannelIds.length === 1) {
    filters.push(
      `facet_sales_channel_ids = "${escapeFilterValue(salesChannelIds[0] ?? "")}"`
    )
  } else if (salesChannelIds.length > 1) {
    filters.push(
      `(${salesChannelIds.map((id) => `facet_sales_channel_ids = "${escapeFilterValue(id)}"`).join(" OR ")})`
    )
  }

  return filters.join(" AND ")
}

const safeSearch = async (
  service: MeiliSearchService,
  index: string,
  query: string,
  options: Parameters<MeiliSearchService["search"]>[2]
): Promise<SearchResponse | null> => {
  try {
    return await service.search(index, query, options)
  } catch {
    return null
  }
}

const getStringId = (value: unknown): string | undefined => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return
  }

  const id = (value as { id?: unknown }).id

  if (typeof id === "string") {
    return id
  }

  if (typeof id === "number" && Number.isFinite(id)) {
    return String(id)
  }

  return
}

const hasCompletePricingContext = (
  value: unknown
): value is Record<string, unknown> => {
  if (!(value && typeof value === "object" && !Array.isArray(value))) {
    return false
  }

  const regionId = (value as Record<string, unknown>).region_id
  return typeof regionId === "string" && Boolean(regionId.trim())
}

const deduplicateHits = (
  hits: unknown[] | undefined,
  field: string
): unknown[] => {
  const seen = new Set<string>()
  const result: unknown[] = []

  for (const hit of hits ?? []) {
    if (!hit || typeof hit !== "object" || Array.isArray(hit)) {
      continue
    }

    const value = (hit as Record<string, unknown>)[field]
    const key =
      typeof value === "string"
        ? cleanSearchText(value).toLocaleLowerCase()
        : getStringId(hit)

    if (!(key && seen.has(key))) {
      if (key) {
        seen.add(key)
      }

      result.push(hit)
    }
  }

  return result
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: This endpoint coordinates four independent indices, authoritative product hydration, and degraded fallback.
export async function GET(
  request: RequestWithContext<unknown, StoreSearchAutocompleteSchemaType>,
  response: MedusaResponse
) {
  if (!isMeilisearchEnabled()) {
    response.status(503).json({ message: "Catalog search is disabled" })

    return
  }

  const query = cleanSearchText(request.validatedQuery.q)
  const salesChannelIds = getSalesChannelIds(
    request.filterableFields.sales_channel_id
  )

  let profile: SearchProfile

  try {
    profile = resolveSearchProfile(
      {
        locale: request.locale ?? request.validatedQuery.locale,
        requestedKey: request.validatedQuery.profile,
        salesChannelIds,
      },
      await loadSearchProfiles(request.scope)
    )
  } catch (error) {
    if (error instanceof SearchProfileResolutionError) {
      response.status(400).json({ message: error.message })

      return
    }

    throw error
  }

  const meilisearch = request.scope.resolve<MeiliSearchService>(MEILISEARCH)
  const productCandidateLimit = query
    ? Math.min(
        profile.limits.fullSearch,
        Math.max(profile.limits.autocomplete.product * 4, 24)
      )
    : profile.limits.popular
  const emptyEntitySearch = Promise.resolve<SearchResponse>({ hits: [] })
  const productResultFilter = buildProductResultFilter(
    profile.separateVariantResults,
    query
  )

  const [productSearch, categorySearch, brandSearch, contentSearch] =
    await Promise.all([
      safeSearch(meilisearch, profile.indexes.product, query, {
        paginationOptions: { limit: productCandidateLimit, offset: 0 },
        filter: buildVisibilityFilter(salesChannelIds, productResultFilter),
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
          ...(query
            ? { showRankingScore: true }
            : { sort: ["facet_popularity:desc"] }),
        },
      }),
      query
        ? safeSearch(meilisearch, profile.indexes.category, query, {
            paginationOptions: {
              limit: profile.limits.autocomplete.category,
              offset: 0,
            },
            additionalOptions: {
              attributesToRetrieve: ["id", "name", "handle"],
            },
          })
        : emptyEntitySearch,
      query
        ? safeSearch(meilisearch, profile.indexes.brand, query, {
            paginationOptions: {
              limit: profile.limits.autocomplete.brand,
              offset: 0,
            },
            additionalOptions: {
              attributesToRetrieve: ["id", "title", "handle"],
            },
          })
        : emptyEntitySearch,
      query
        ? safeSearch(meilisearch, profile.indexes.content, query, {
            paginationOptions: {
              limit: profile.limits.autocomplete.content,
              offset: 0,
            },
            additionalOptions: {
              attributesToRetrieve: ["id", "type", "title", "excerpt", "href"],
            },
          })
        : emptyEntitySearch,
    ])

  const rankedProducts = selectRankedProductIds(
    productSearch?.hits,
    query,
    profile.minimumRankingScore,
    profile.strict
  )
  const productResultLimit = query
    ? profile.limits.autocomplete.product
    : profile.limits.popular
  const productMatches = rankedProducts.matches.slice(0, productResultLimit)
  const productIds = [
    ...new Set(productMatches.map((match) => match.productId)),
  ]
  const queryService = request.scope.resolve<Query>(
    ContainerRegistrationKeys.QUERY
  )
  const remoteQuery = request.scope.resolve(
    ContainerRegistrationKeys.REMOTE_QUERY
  )
  const pricingContext = hasCompletePricingContext(request.pricingContext)
    ? QueryContext(request.pricingContext)
    : undefined
  const productFields = pricingContext
    ? [
        ...STORE_CATALOG_PRODUCTS_DEFAULT_FIELDS,
        ...STORE_CATALOG_PRODUCTS_PRICING_FIELDS,
      ]
    : STORE_CATALOG_PRODUCTS_DEFAULT_FIELDS

  let degraded = productSearch === null
  let products: Record<string, unknown>[] = []

  if (productIds.length > 0) {
    const result = await queryService.graph(
      {
        entity: "product",
        fields: productFields,
        filters: await normalizeProductSalesChannelFilter(
          queryService,
          remoteQuery,
          {
            id: { $in: productIds },
            sales_channel_id: request.filterableFields.sales_channel_id,
            status: ProductStatus.PUBLISHED,
          }
        ),
        context: pricingContext
          ? { variants: { calculated_price: pricingContext } }
          : undefined,
      },
      { locale: request.locale }
    )

    products = expandProductsBySearchMatches(
      result.data as Record<string, unknown>[],
      productMatches
    )
  } else if (!productSearch) {
    const result = await queryService.graph(
      {
        entity: "product",
        fields: productFields,
        filters: await normalizeProductSalesChannelFilter(
          queryService,
          remoteQuery,
          {
            q: query,
            sales_channel_id: request.filterableFields.sales_channel_id,
            status: ProductStatus.PUBLISHED,
          }
        ),

        pagination: {
          take: productResultLimit,
          skip: 0,
        },

        context: pricingContext
          ? {
              variants: {
                calculated_price: pricingContext,
              },
            }
          : undefined,
      },
      { locale: request.locale }
    )

    products = result.data as Record<string, unknown>[]
  }

  // Storefront autocomplete is also called before the browser has selected a
  // region. In that case the request has no complete pricing context and the
  // Medusa tax-price helper throws instead of returning unpriced suggestions.
  // The query above deliberately omits pricing fields in the same branch, so
  // only enrich results when a complete pricing context exists.
  if (pricingContext) {
    await wrapProductsWithTaxPrices(
      request,
      products as unknown as Parameters<typeof wrapProductsWithTaxPrices>[1]
    )
  }

  degraded ||= [categorySearch, brandSearch, contentSearch].some(
    (result) => result === null
  )

  response.json({
    query,
    profile: profile.key,
    degraded,
    exactIdentifierMatch: rankedProducts.exactIdentifierMatch,
    products,
    categories: deduplicateHits(categorySearch?.hits, "name"),
    brands: deduplicateHits(brandSearch?.hits, "title"),
    content: deduplicateHits(contentSearch?.hits, "href"),
  })
}
