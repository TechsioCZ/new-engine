import "server-only";

import { dehydrate } from "@techsio/storefront-data/server";
import { buildCatalogProductsParams } from "../catalog-query-state";
import { collectDescendantCategoryIds } from "../category-tree";
import { buildCategoryListParams } from "../category-query-config";
import { PLP_PAGE_SIZE } from "../plp-config";
import type { PlpQueryState } from "../plp-query-state";
import { storefrontCacheConfig } from "../cache";
import { CATEGORY_LIST_LIMIT } from "./constants";
import { getRegionServerContext } from "./context";
import { fetchCatalogProducts, fetchCategories } from "./fetch";
import { buildListQueryKey } from "./query";

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
    queryKey: buildListQueryKey("categories", categoryListParams),
    queryFn: ({ signal }) => fetchCategories(categoryListParams, signal),
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
      queryKey: buildListQueryKey("catalog", catalogListParams),
      queryFn: ({ signal }) => fetchCatalogProducts(catalogListParams, signal),
      ...storefrontCacheConfig.semiStatic,
    });
  }

  return {
    region,
    dehydratedState: dehydrate(queryClient),
  };
};
