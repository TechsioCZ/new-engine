// Pages Router rejects the App-Router-only `server-only` marker. Keep this
// module reachable only from server entry points.

import { dehydrate } from "@tanstack/react-query"
import { buildCatalogProductsParams } from "../catalog-query-state"
import {
  buildCategoryListParams,
  CATEGORY_TREE_FIELDS,
  CATEGORY_TREE_LIMIT,
} from "../category-query-config"
import { collectDescendantCategoryIds } from "../category-tree"
import { PLP_PAGE_SIZE } from "../plp-config"
import type { PlpQueryState } from "../plp-query-state"
import { resolveCategoryCatalogScope } from "../sale-catalog-policy"
import {
  fetchServerCatalogProducts,
  fetchServerCategories,
} from "../storefront-server"
import {
  type ExplicitRequestServerContext,
  getRegionServerContext,
} from "./context"

export const prefetchCategoryPageStorefrontData = async (
  slug: string,
  queryState: PlpQueryState,
  requestContext: ExplicitRequestServerContext
) => {
  const { locale, market, queryClient, region } =
    await getRegionServerContext(requestContext)

  const categoryListParams = buildCategoryListParams({
    page: 1,
    limit: CATEGORY_TREE_LIMIT,
    fields: CATEGORY_TREE_FIELDS,
    locale,
  })

  const categoryResponse = await fetchServerCategories(
    market,
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
      ...resolveCategoryCatalogScope(slug, categoryIds),
      limit: PLP_PAGE_SIZE,
      locale,
      regionId: region.region_id,
      countryCode: region.country_code,
    })

    const catalog = await fetchServerCatalogProducts(
      market,
      queryClient,
      catalogListParams
    )

    return {
      categorySourceIds: categoryResponse.categories.map(
        (category) => category.id
      ),
      dehydratedState: dehydrate(queryClient),
      region,
      visibleProductIds: catalog.products.map((product) => product.id),
    }
  }

  return {
    categorySourceIds: categoryResponse.categories.map(
      (category) => category.id
    ),
    region,
    dehydratedState: dehydrate(queryClient),
    visibleProductIds: [] as string[],
  }
}
