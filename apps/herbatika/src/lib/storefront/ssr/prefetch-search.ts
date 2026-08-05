import "server-only"
import { dehydrate } from "@tanstack/react-query"

import { buildCatalogProductsParams } from "../catalog-query-state"
import { PLP_PAGE_SIZE } from "../plp-query-state"
import type { PlpQueryState } from "../plp-query-state"
import { prefetchServerCatalogProducts } from "../storefront-server"
import { getRegionServerContext } from "./context"

export const prefetchSearchPageStorefrontData = async (
  queryState: PlpQueryState
) => {
  const { queryClient, region } = await getRegionServerContext()
  const query = queryState.q.trim()

  if (region && query.length > 0) {
    const catalogListParams = buildCatalogProductsParams({
      limit: PLP_PAGE_SIZE,
      queryState,
      ...(region.region_id === undefined ? {} : { regionId: region.region_id }),
      ...(region.country_code === undefined
        ? {}
        : { countryCode: region.country_code }),
    })

    await Promise.all([
      prefetchServerCatalogProducts(queryClient, catalogListParams),
      prefetchServerCatalogProducts(
        queryClient,
        buildCatalogProductsParams({
          limit: 1,
          queryState: {
            ...queryState,
            brand: [],
            form: [],
            ingredient: [],
            page: 1,
            price_max: null,
            price_min: null,
            q: query,
            sort: "recommended",
            status: [],
          },
          ...(region.region_id === undefined
            ? {}
            : { regionId: region.region_id }),
          ...(region.country_code === undefined
            ? {}
            : { countryCode: region.country_code }),
        })
      ),
    ])
  }

  return {
    dehydratedState: dehydrate(queryClient),
    region,
  }
}
