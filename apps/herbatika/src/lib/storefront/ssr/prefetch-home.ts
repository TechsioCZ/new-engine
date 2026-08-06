import type { QueryClient } from "@tanstack/react-query"
import { dehydrate } from "@tanstack/react-query"
import type { RegionInfo } from "@techsio/storefront-data/shared/region"
import { assertServerOnly } from "@/lib/server-guard"
import {
  buildCatalogProductsParams,
  type CatalogQueryState,
} from "../catalog-query-state"
import {
  buildCategoryListParams,
  CATEGORY_TREE_FIELDS,
  CATEGORY_TREE_LIMIT,
} from "../category-query-config"
import {
  HOMEPAGE_BESTSELLERS_CATEGORY_HANDLE,
  HOMEPAGE_PRODUCTS_PER_SECTION,
} from "../homepage-catalog-config"
import type { RequestServerContext } from "../market-context.server"
import {
  fetchServerCategories,
  prefetchServerCatalogProducts,
} from "../storefront-server"
import { getRegionServerContext } from "./context"

assertServerOnly("storefront/ssr/prefetch-home")

type HomepageCatalogPrefetchInput = {
  categoryIds?: string[]
  queryClient: QueryClient
  region: RegionInfo
  sort: CatalogQueryState["sort"]
  requestContext: RequestServerContext
  status?: string[]
}

const buildHomepageCatalogQueryState = (
  sort: CatalogQueryState["sort"],
  status: string[] = []
): CatalogQueryState => ({
  page: 1,
  q: "",
  sort,
  status,
  form: [],
  brand: [],
  ingredient: [],
  price_min: null,
  price_max: null,
})

const prefetchHomepageCatalogProducts = ({
  categoryIds,
  queryClient,
  region,
  requestContext,
  sort,
  status,
}: HomepageCatalogPrefetchInput) =>
  prefetchServerCatalogProducts(
    queryClient,
    buildCatalogProductsParams({
      queryState: buildHomepageCatalogQueryState(sort, status),
      categoryIds,
      limit: HOMEPAGE_PRODUCTS_PER_SECTION,
      regionId: region.region_id,
      countryCode: region.country_code,
    }),
    requestContext
  )

export const prefetchHomePageStorefrontData = async (
  requestContext: RequestServerContext
) => {
  const { queryClient, region } = await getRegionServerContext(requestContext)
  const categoryListParams = buildCategoryListParams({
    page: 1,
    limit: CATEGORY_TREE_LIMIT,
    fields: CATEGORY_TREE_FIELDS,
  })
  const categoryResponse = await fetchServerCategories(
    queryClient,
    categoryListParams
  )

  if (region) {
    const bestsellersCategory = categoryResponse.categories.find(
      (category) => category.handle === HOMEPAGE_BESTSELLERS_CATEGORY_HANDLE
    )
    const prefetches = [
      prefetchHomepageCatalogProducts({
        queryClient,
        region,
        requestContext,
        sort: "newest",
        status: ["new"],
      }),
      prefetchHomepageCatalogProducts({
        queryClient,
        region,
        requestContext,
        sort: "recommended",
        status: ["action"],
      }),
    ]

    if (bestsellersCategory?.id) {
      prefetches.push(
        prefetchHomepageCatalogProducts({
          categoryIds: [bestsellersCategory.id],
          queryClient,
          region,
          requestContext,
          sort: "recommended",
        })
      )
    }

    await Promise.all(prefetches)
  }

  return {
    region,
    dehydratedState: dehydrate(queryClient),
  }
}
