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

export const prefetchProductIndexStorefrontData = async (
  queryState: PlpQueryState,
  requestContext: ExplicitRequestServerContext
) => {
  const { locale, market, queryClient, region } =
    await getRegionServerContext(requestContext)

  if (region) {
    const catalog = await fetchServerCatalogProducts(
      market,
      queryClient,
      buildCatalogProductsParams({
        countryCode: region.country_code,
        limit: PLP_PAGE_SIZE,
        locale,
        queryState: { ...queryState, q: "" },
        regionId: region.region_id,
      })
    )

    return {
      dehydratedState: dehydrate(queryClient),
      region,
      totalPages: catalog.totalPages,
      visibleProductIds: catalog.products.map((product) => product.id),
    }
  }

  return {
    dehydratedState: dehydrate(queryClient),
    region,
    totalPages: 0,
    visibleProductIds: [] as string[],
  }
}
