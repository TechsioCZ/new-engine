import { dehydrate } from "@tanstack/react-query"
import { assertServerOnly } from "@/lib/server-guard"
import { buildCatalogProductsParams } from "../catalog-query-state"
import type { RequestServerContext } from "../market-context.server"
import { PLP_PAGE_SIZE, type PlpQueryState } from "../plp-query-state"
import { prefetchServerCatalogProducts } from "../storefront-server"
import { getRegionServerContext } from "./context"

assertServerOnly("storefront/ssr/prefetch-search")

export const prefetchSearchPageStorefrontData = async (
  requestContext: RequestServerContext,
  queryState: PlpQueryState
) => {
  const { queryClient, region } = await getRegionServerContext(requestContext)
  const query = queryState.q.trim()

  if (region && query.length > 0) {
    const catalogListParams = buildCatalogProductsParams({
      queryState,
      limit: PLP_PAGE_SIZE,
      regionId: region.region_id,
      countryCode: region.country_code,
    })

    await Promise.all([
      prefetchServerCatalogProducts(
        queryClient,
        catalogListParams,
        requestContext
      ),
      prefetchServerCatalogProducts(
        queryClient,
        buildCatalogProductsParams({
          queryState: {
            ...queryState,
            q: query,
            page: 1,
            sort: "recommended",
            status: [],
            form: [],
            brand: [],
            ingredient: [],
            price_min: null,
            price_max: null,
          },
          limit: 1,
          regionId: region.region_id,
          countryCode: region.country_code,
        }),
        requestContext
      ),
    ])
  }

  return {
    region,
    dehydratedState: dehydrate(queryClient),
  }
}
