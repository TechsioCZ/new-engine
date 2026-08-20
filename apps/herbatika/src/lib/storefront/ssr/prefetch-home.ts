// Pages Router rejects the App-Router-only `server-only` marker. Keep this
// module reachable only from server entry points.

import type { QueryClient } from "@tanstack/react-query"
import { dehydrate } from "@tanstack/react-query"
import type { RegionInfo } from "@techsio/storefront-data/shared/region"
import type { Market } from "@/lib/url/types"
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
  HOMEPAGE_SECTION_CATEGORY_HANDLES,
} from "../homepage-catalog-config"
import {
  fetchServerCatalogProducts,
  fetchServerCategories,
} from "../storefront-server"
import {
  type ExplicitRequestServerContext,
  getRegionServerContext,
} from "./context"

type HomepageCatalogPrefetchInput = {
  categoryIds?: string[]
  locale: string
  market: Market
  queryClient: QueryClient
  region: RegionInfo
  sort: CatalogQueryState["sort"]
  status?: string[]
  onSale?: true
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
  locale,
  market,
  queryClient,
  region,
  sort,
  status,
  onSale,
}: HomepageCatalogPrefetchInput) =>
  fetchServerCatalogProducts(
    market,
    queryClient,
    buildCatalogProductsParams({
      queryState: buildHomepageCatalogQueryState(sort, status),
      categoryIds,
      limit: HOMEPAGE_PRODUCTS_PER_SECTION,
      locale,
      regionId: region.region_id,
      countryCode: region.country_code,
      onSale,
    })
  )

export const prefetchHomePageStorefrontData = async (
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
  const homepageSectionCategorySourceIds = Object.fromEntries(
    Object.entries(HOMEPAGE_SECTION_CATEGORY_HANDLES).flatMap(
      ([sectionId, categoryHandle]) => {
        const category = categoryResponse.categories.find(
          (candidate) => candidate.handle === categoryHandle
        )
        return category ? [[sectionId, category.id] as const] : []
      }
    )
  )

  if (region) {
    const bestsellersCategory = categoryResponse.categories.find(
      (category) => category.handle === HOMEPAGE_BESTSELLERS_CATEGORY_HANDLE
    )
    const prefetches = [
      prefetchHomepageCatalogProducts({
        queryClient,
        locale,
        market,
        region,
        sort: "newest",
        status: ["new"],
      }),
      prefetchHomepageCatalogProducts({
        queryClient,
        locale,
        market,
        region,
        sort: "recommended",
        onSale: true,
      }),
    ]

    if (bestsellersCategory?.id) {
      prefetches.push(
        prefetchHomepageCatalogProducts({
          categoryIds: [bestsellersCategory.id],
          locale,
          market,
          queryClient,
          region,
          sort: "recommended",
        })
      )
    }

    const catalogs = await Promise.all(prefetches)

    return {
      categorySourceIds: categoryResponse.categories.map(
        (category) => category.id
      ),
      dehydratedState: dehydrate(queryClient),
      homepageSectionCategorySourceIds,
      region,
      visibleProductIds: Array.from(
        new Set(
          catalogs.flatMap((catalog) =>
            catalog.products.map((product) => product.id)
          )
        )
      ),
    }
  }

  return {
    categorySourceIds: categoryResponse.categories.map(
      (category) => category.id
    ),
    dehydratedState: dehydrate(queryClient),
    homepageSectionCategorySourceIds,
    region,
    visibleProductIds: [] as string[],
  }
}
