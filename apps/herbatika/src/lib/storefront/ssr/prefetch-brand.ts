import { dehydrate } from "@tanstack/react-query"
import { assertServerOnly } from "@/lib/server-guard"
import {
  buildCatalogProductsParams,
  resolveCatalogResultCount,
} from "../catalog-query-state"
import type { RequestServerContext } from "../market-context.server"
import { PLP_PAGE_SIZE, type PlpQueryState } from "../plp-query-state"
import { fetchServerCatalogProducts } from "../storefront-server"
import { getRegionServerContext } from "./context"

assertServerOnly("storefront/ssr/prefetch-brand")

export const prefetchBrandPageStorefrontData = async (
  requestContext: RequestServerContext,
  brandFacetId: string,
  queryState: PlpQueryState
) => {
  const { queryClient, region } = await getRegionServerContext(requestContext)

  let availableProductCount: number | null = null
  if (region) {
    const [, availability] = await Promise.all([
      fetchServerCatalogProducts(
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
      fetchServerCatalogProducts(
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
    availableProductCount = resolveCatalogResultCount(availability)
  }

  return {
    region,
    availableProductCount,
    dehydratedState: dehydrate(queryClient),
  }
}
