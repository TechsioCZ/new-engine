import "server-only"
import { dehydrate } from "@tanstack/react-query"

import { buildCatalogProductsParams } from "../catalog-query-state"
import { PLP_PAGE_SIZE } from "../plp-query-state"
import type { PlpQueryState } from "../plp-query-state"
import { prefetchServerCatalogProducts } from "../storefront-server"
import { getRegionServerContext } from "./context"

export const prefetchBrandPageStorefrontData = async (
  brandFacetId: string,
  queryState: PlpQueryState,
) => {
  const { queryClient, region } = await getRegionServerContext()

  if (region) {
    await Promise.all([
      prefetchServerCatalogProducts(
        queryClient,
        buildCatalogProductsParams({
          limit: PLP_PAGE_SIZE,
          queryState: {
            ...queryState,
            brand: [brandFacetId],
          },
          ...(region.region_id === undefined
            ? {}
            : { regionId: region.region_id }),
          ...(region.country_code === undefined
            ? {}
            : { countryCode: region.country_code }),
        }),
      ),
      prefetchServerCatalogProducts(
        queryClient,
        buildCatalogProductsParams({
          limit: 1,
          queryState: {
            ...queryState,
            brand: [brandFacetId],
            form: [],
            ingredient: [],
            page: 1,
            price_max: null,
            price_min: null,
            sort: "recommended",
            status: [],
          },
          ...(region.region_id === undefined
            ? {}
            : { regionId: region.region_id }),
          ...(region.country_code === undefined
            ? {}
            : { countryCode: region.country_code }),
        }),
      ),
    ])
  }

  return {
    dehydratedState: dehydrate(queryClient),
    region,
  }
}
