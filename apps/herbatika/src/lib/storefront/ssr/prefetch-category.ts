import "server-only";

import { dehydrate } from "@tanstack/react-query";
import { buildCatalogProductsParams } from "../catalog-query-state";
import { collectDescendantCategoryIds } from "../category-tree";
import {
  buildCategoryListParams,
  STOREFRONT_CATEGORY_TREE_FIELDS,
  STOREFRONT_CATEGORY_TREE_LIMIT,
} from "../category-query-config";
import { PLP_PAGE_SIZE } from "../plp-config";
import type { PlpQueryState } from "../plp-query-state";
import {
  fetchServerCategories,
  prefetchServerCatalogProducts,
} from "../storefront-server";
import { getRegionServerContext } from "./context";

export const prefetchCategoryPageStorefrontData = async (
  slug: string,
  queryState: PlpQueryState,
) => {
  const { queryClient, region } = await getRegionServerContext();

  const categoryListParams = buildCategoryListParams({
    page: 1,
    limit: STOREFRONT_CATEGORY_TREE_LIMIT,
    fields: STOREFRONT_CATEGORY_TREE_FIELDS,
  });

  const categoryResponse = await fetchServerCategories(
    queryClient,
    categoryListParams,
  );

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

    await prefetchServerCatalogProducts(queryClient, catalogListParams);
  }

  return {
    region,
    dehydratedState: dehydrate(queryClient),
  };
};
