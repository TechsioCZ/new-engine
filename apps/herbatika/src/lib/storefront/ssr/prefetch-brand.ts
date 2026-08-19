import "server-only"

import { dehydrate } from "@tanstack/react-query"
import { buildCatalogProductsParams } from "../catalog-query-state"
import { PLP_PAGE_SIZE, type PlpQueryState } from "../plp-query-state"
import { prefetchServerCatalogProducts } from "../storefront-server"
import { getRegionServerContext } from "./context"

export const prefetchBrandPageStorefrontData = async (
  brandFacetId: string,
  queryState: PlpQueryState
) => {
  const { locale, queryClient, region } = await getRegionServerContext()

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
          locale,
          regionId: region.region_id,
          countryCode: region.country_code,
          salesChannelId: region.salesChannelId,
        })
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
          locale,
          regionId: region.region_id,
          countryCode: region.country_code,
          salesChannelId: region.salesChannelId,
        })
      ),
    ])
  }

  return {
    region,
    dehydratedState: dehydrate(queryClient),
  }
}
