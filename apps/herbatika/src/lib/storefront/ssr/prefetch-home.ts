import "server-only";

import { dehydrate } from "@tanstack/react-query";
import {
  STOREFRONT_PRODUCT_CARD_FIELDS,
  buildProductListParams,
} from "../product-query-config";
import { HOMEPAGE_PRODUCTS_LIMIT } from "./constants";
import { getRegionServerContext, prefetchProductList } from "./context";

export const prefetchHomePageStorefrontData = async () => {
  const { queryClient, region } = await getRegionServerContext();

  if (region) {
    const listParams = buildProductListParams({
      page: 1,
      limit: HOMEPAGE_PRODUCTS_LIMIT,
      fields: STOREFRONT_PRODUCT_CARD_FIELDS,
      region_id: region.region_id,
      country_code: region.country_code,
    });

    await prefetchProductList(queryClient, listParams);
  }

  return {
    region,
    dehydratedState: dehydrate(queryClient),
  };
};
