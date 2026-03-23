import "server-only";

import { dehydrate } from "@tanstack/react-query";
import { buildCatalogProductsParams } from "../catalog-query-state";
import { collectDescendantCategoryIds } from "../category-tree";
import { buildCategoryListParams } from "../category-query-config";
import { PLP_PAGE_SIZE } from "../plp-config";
import type { PlpQueryState } from "../plp-query-state";
import { storefrontCacheConfig } from "../cache";
import { storefront } from "../storefront";
import { CATEGORY_LIST_LIMIT } from "./constants";
import { getRegionServerContext } from "./context";

export const prefetchCategoryPageStorefrontData = async (
  slug: string,
  queryState: PlpQueryState,
) => {
  const { queryClient, region } = await getRegionServerContext();

  const categoryListParams = buildCategoryListParams({
    page: 1,
    limit: CATEGORY_LIST_LIMIT,
    fields: "id,name,handle,parent_category_id,rank",
  });

  const categoryResponse = await queryClient.fetchQuery({
    queryKey: storefront.queryKeys.categories.list(categoryListParams),
    queryFn: ({ signal }) =>
      storefront.services.categories.getCategories(categoryListParams, signal),
    ...storefrontCacheConfig.static,
  });

  const activeCategory =
    categoryResponse.categories.find((category) => category.handle === slug) ?? null;

  if (region && activeCategory) {
    const categoryIds = [
      activeCategory.id,
      ...collectDescendantCategoryIds(categoryResponse.categories, activeCategory.id),
    ];
    const catalogListParams = buildCatalogProductsParams({
      queryState,
      categoryIds,
      limit: PLP_PAGE_SIZE,
      regionId: region.region_id,
      countryCode: region.country_code,
    });

    await queryClient.prefetchQuery({
      queryKey: storefront.queryKeys.catalog.list(catalogListParams),
      queryFn: ({ signal }) =>
        storefront.services.catalog.getCatalogProducts(catalogListParams, signal),
      ...storefrontCacheConfig.semiStatic,
    });
  }

  return {
    region,
    dehydratedState: dehydrate(queryClient),
  };
};
