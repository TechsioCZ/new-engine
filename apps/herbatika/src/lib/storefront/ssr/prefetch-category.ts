import { dehydrate } from "@tanstack/react-query"
import { assertServerOnly } from "@/lib/server-guard"
import { buildCatalogProductsParams } from "../catalog-query-state"
import {
  buildCategoryListParams,
  CATEGORY_TREE_FIELDS,
  CATEGORY_TREE_LIMIT,
} from "../category-query-config"
import { collectDescendantCategoryIds } from "../category-tree"
import type { RequestServerContext } from "../market-context.server"
import { PLP_PAGE_SIZE } from "../plp-config"
import type { PlpQueryState } from "../plp-query-state"
import {
  fetchServerCategories,
  prefetchServerCatalogProducts,
} from "../storefront-server"
import { getRegionServerContext } from "./context"

assertServerOnly("storefront/ssr/prefetch-category")

export const prefetchCategoryPageStorefrontData = async (
  requestContext: RequestServerContext,
  slug: string,
  queryState: PlpQueryState
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

  const activeCategory =
    categoryResponse.categories.find((category) => category.handle === slug) ??
    null

  if (region && activeCategory) {
    const categoryIds = [
      activeCategory.id,
      ...collectDescendantCategoryIds(
        categoryResponse.categories,
        activeCategory.id
      ),
    ]
    const catalogListParams = buildCatalogProductsParams({
      queryState,
      categoryIds,
      limit: PLP_PAGE_SIZE,
      regionId: region.region_id,
      countryCode: region.country_code,
    })

    await prefetchServerCatalogProducts(
      queryClient,
      catalogListParams,
      requestContext
    )
  }

  return {
    region,
    dehydratedState: dehydrate(queryClient),
  }
}
