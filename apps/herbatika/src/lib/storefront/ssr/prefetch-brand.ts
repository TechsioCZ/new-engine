import { dehydrate } from "@tanstack/react-query"
import { assertServerOnly } from "@/lib/server-guard"
import { buildCatalogProductsParams } from "../catalog-query-state"
import type { RequestServerContext } from "../market-context.server"
import { PLP_PAGE_SIZE, type PlpQueryState } from "../plp-query-state"
import { prefetchServerCatalogProducts } from "../storefront-server"
import { getRegionServerContext } from "./context"

assertServerOnly("storefront/ssr/prefetch-brand")

export const prefetchBrandPageStorefrontData = async (
  requestContext: RequestServerContext,
  brandFacetId: string,
  queryState: PlpQueryState
) => {
  const { queryClient, region } = await getRegionServerContext(requestContext)

  if (region) {
    await Promise.all([
      prefetchServerCatalogProducts(
        queryClient,
        buildCatalogProductsParams({
          queryState: {
            ...queryState,
            brand: [brandFacetId],
          },
          limit: PLP_PAGE_SIZE,
          regionId: region.region_id,
          countryCode: region.country_code,
        }),
        requestContext
      ),
      prefetchServerCatalogProducts(
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
