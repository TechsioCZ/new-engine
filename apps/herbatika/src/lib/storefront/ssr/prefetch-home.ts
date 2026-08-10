import "server-only"
import type { QueryClient } from "@tanstack/react-query"
import { dehydrate } from "@tanstack/react-query"
import type { RegionInfo } from "@techsio/storefront-data/shared/region"

import { buildCatalogProductsParams } from "../catalog-query-state"
import type { CatalogQueryState } from "../catalog-query-state"
import {
  buildCategoryListParams,
  CATEGORY_TREE_FIELDS,
  CATEGORY_TREE_LIMIT,
} from "../category-query-config"
import {
  HOMEPAGE_BESTSELLERS_CATEGORY_HANDLE,
  HOMEPAGE_PRODUCTS_PER_SECTION,
} from "../homepage-catalog-config"
import {
  fetchServerCategories,
  prefetchServerCatalogProducts,
} from "../storefront-server"
import { getRegionServerContext } from "./context"

interface HomepageCatalogPrefetchInput {
  categoryIds?: string[]
  queryClient: QueryClient
  region: RegionInfo
  sort: CatalogQueryState["sort"]
  status?: string[]
}

const buildHomepageCatalogQueryState = (
  sort: CatalogQueryState["sort"],
  status: string[] = [],
): CatalogQueryState => ({
  brand: [],
  form: [],
  ingredient: [],
  page: 1,
  price_max: null,
  price_min: null,
  q: "",
  sort,
  status,
})

const prefetchHomepageCatalogProducts = async ({
  categoryIds,
  queryClient,
  region,
  sort,
  status,
}: HomepageCatalogPrefetchInput) => {
  await prefetchServerCatalogProducts(
    queryClient,
    buildCatalogProductsParams({
      queryState: buildHomepageCatalogQueryState(sort, status),
      ...(categoryIds === undefined ? {} : { categoryIds }),
      limit: HOMEPAGE_PRODUCTS_PER_SECTION,
      ...(region.region_id === undefined ? {} : { regionId: region.region_id }),
      ...(region.country_code === undefined
        ? {}
        : { countryCode: region.country_code }),
    }),
  )
}

export const prefetchHomePageStorefrontData = async () => {
  const { queryClient, region } = await getRegionServerContext()
  const categoryListParams = buildCategoryListParams({
    fields: CATEGORY_TREE_FIELDS,
    limit: CATEGORY_TREE_LIMIT,
    page: 1,
  })
  const categoryResponse = await fetchServerCategories(
    queryClient,
    categoryListParams,
  )

  if (region) {
    const bestsellersCategory = categoryResponse.categories.find(
      (category) => category.handle === HOMEPAGE_BESTSELLERS_CATEGORY_HANDLE,
    )
    const prefetches = [
      prefetchHomepageCatalogProducts({
        queryClient,
        region,
        sort: "newest",
        status: ["new"],
      }),
      prefetchHomepageCatalogProducts({
        queryClient,
        region,
        sort: "recommended",
        status: ["action"],
      }),
    ]

    if (bestsellersCategory !== undefined && bestsellersCategory.id !== null) {
      prefetches.push(
        prefetchHomepageCatalogProducts({
          categoryIds: [bestsellersCategory.id],
          queryClient,
          region,
          sort: "recommended",
        }),
      )
    }

    await Promise.all(prefetches)
  }

  return {
    dehydratedState: dehydrate(queryClient),
    region,
  }
}
