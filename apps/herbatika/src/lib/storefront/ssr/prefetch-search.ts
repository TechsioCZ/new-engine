import "server-only";

import { dehydrate } from "@tanstack/react-query";
import { buildCatalogProductsParams } from "../catalog-query-state";
import { PLP_PAGE_SIZE, type PlpQueryState } from "../plp-query-state";
import { prefetchServerCatalogProducts } from "../storefront-server";
import { getRegionServerContext } from "./context";

export const prefetchSearchPageStorefrontData = async (
  queryState: PlpQueryState,
) => {
  const { queryClient, region } = await getRegionServerContext();
  const query = queryState.q.trim();

  if (region && query.length > 0) {
    const catalogListParams = buildCatalogProductsParams({
      queryState,
      limit: PLP_PAGE_SIZE,
      regionId: region.region_id,
      countryCode: region.country_code,
    });

    await Promise.all([
      prefetchServerCatalogProducts(queryClient, catalogListParams),
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
      ),
    ]);
  }

  return {
    region,
    dehydratedState: dehydrate(queryClient),
  };
};
