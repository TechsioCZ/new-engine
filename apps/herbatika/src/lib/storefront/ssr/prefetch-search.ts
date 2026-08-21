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

export const prefetchSearchPageStorefrontData = async (
  queryState: PlpQueryState,
  requestContext: ExplicitRequestServerContext
) => {
  const { locale, market, queryClient, region } =
    await getRegionServerContext(requestContext)
  const query = queryState.q.trim()

  if (region && query.length > 0) {
    const catalogListParams = buildCatalogProductsParams({
      queryState,
      limit: PLP_PAGE_SIZE,
      locale,
      regionId: region.region_id,
      countryCode: region.country_code,
    })

    const [catalog] = await Promise.all([
      fetchServerCatalogProducts(market, queryClient, catalogListParams),
      fetchServerCatalogProducts(
        market,
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
          locale,
          regionId: region.region_id,
          countryCode: region.country_code,
        })
      ),
    ])

    return {
      dehydratedState: dehydrate(queryClient),
      region,
      visibleProductIds: catalog.products.map((product) => product.id),
      visibleProductSlugsById: Object.fromEntries(
        catalog.products.flatMap((product) =>
          product.handle ? [[product.id, product.handle]] : []
        )
      ),
    }
  }

  return {
    region,
    dehydratedState: dehydrate(queryClient),
    visibleProductIds: [] as string[],
    visibleProductSlugsById: {} as Record<string, string>,
  }
}
