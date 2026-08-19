// Pages Router rejects the App-Router-only `server-only` marker. Keep this
// module reachable only from server entry points.

import { dehydrate } from "@tanstack/react-query"
import { buildCatalogProductsParams } from "../catalog-query-state"
import { PLP_PAGE_SIZE, type PlpQueryState } from "../plp-query-state"
import { fetchServerCatalogProducts } from "../storefront-server"
import {
  type ExplicitRequestServerContext,
  getRegionServerContext,
} from "./context"
import { loadBoundedCatalogPage } from "./load-bounded-catalog-page"

export const prefetchBrandPageStorefrontData = async (
  brandFacetId: string,
  queryState: PlpQueryState,
  requestContext: ExplicitRequestServerContext
) => {
  const { locale, market, queryClient, region } =
    await getRegionServerContext(requestContext)

  if (region) {
    const [catalog] = await Promise.all([
      loadBoundedCatalogPage({
        loadPage: (page) =>
          fetchServerCatalogProducts(
            market,
            queryClient,
            buildCatalogProductsParams({
              queryState: {
                ...queryState,
                brand: [brandFacetId],
                page,
              },
              limit: PLP_PAGE_SIZE,
              locale,
              regionId: region.region_id,
              countryCode: region.country_code,
            })
          ),
        requestedPage: queryState.page,
      }),
      fetchServerCatalogProducts(
        market,
        queryClient,
        buildCatalogProductsParams({
          queryState: {
            ...queryState,
            page: 1,
            sort: "recommended",
            status: [],
            form: [],
            brand: [brandFacetId],
            ingredient: [],
            price_min: null,
            price_max: null,
          },
          limit: 1,
          locale,
          regionId: region.region_id,
          countryCode: region.country_code,
        })
      ),
    ])

    return {
      dehydratedState: dehydrate(queryClient),
      region,
      totalPages: catalog.totalPages,
      visibleProductIds: catalog.products.map((product) => product.id),
    }
  }

  return {
    region,
    dehydratedState: dehydrate(queryClient),
    totalPages: 0,
    visibleProductIds: [] as string[],
  }
}
