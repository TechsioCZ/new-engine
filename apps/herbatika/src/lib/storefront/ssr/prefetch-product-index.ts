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

export const prefetchProductIndexStorefrontData = async (
  queryState: PlpQueryState,
  requestContext: ExplicitRequestServerContext
) => {
  const { locale, market, queryClient, region } =
    await getRegionServerContext(requestContext)

  if (region) {
    const catalog = await loadBoundedCatalogPage({
      loadPage: (page) =>
        fetchServerCatalogProducts(
          market,
          queryClient,
          buildCatalogProductsParams({
            countryCode: region.country_code,
            limit: PLP_PAGE_SIZE,
            locale,
            queryState: { ...queryState, page, q: "" },
            regionId: region.region_id,
          })
        ),
      requestedPage: queryState.page,
    })

    return {
      dehydratedState: dehydrate(queryClient),
      region,
      totalPages: catalog.totalPages,
      visibleProductIds: catalog.products.map((product) => product.id),
      visibleProductSlugsById: Object.fromEntries(
        catalog.products.flatMap((product) =>
          product.handle ? [[product.id, product.handle]] : []
        )
      ),
    }
  }

  return {
    dehydratedState: dehydrate(queryClient),
    region,
    totalPages: 0,
    visibleProductIds: [] as string[],
    visibleProductSlugsById: {} as Record<string, string>,
  }
}
