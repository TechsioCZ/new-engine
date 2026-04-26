import "server-only";

import { dehydrate } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import type { RegionInfo } from "@techsio/storefront-data/shared/region";
import {
  buildCatalogProductsParams,
  type CatalogQueryState,
} from "../catalog-query-state";
import {
  buildCategoryListParams,
  STOREFRONT_CATEGORY_TREE_FIELDS,
  STOREFRONT_CATEGORY_TREE_LIMIT,
} from "../category-query-config";
import {
  HOMEPAGE_BESTSELLERS_CATEGORY_HANDLE,
  HOMEPAGE_PRODUCTS_PER_SECTION,
} from "../homepage-catalog-config";
import {
  fetchServerCategories,
  prefetchServerCatalogProducts,
} from "../storefront-server";
import { getRegionServerContext } from "./context";

type HomepageCatalogPrefetchInput = {
  categoryIds?: string[];
  queryClient: QueryClient;
  region: RegionInfo;
  sort: CatalogQueryState["sort"];
  status?: string[];
};

const buildHomepageCatalogQueryState = (
  sort: CatalogQueryState["sort"],
  status: string[] = [],
): CatalogQueryState => ({
  page: 1,
  q: "",
  sort,
  status,
  form: [],
  brand: [],
  ingredient: [],
  price_min: null,
  price_max: null,
});

const prefetchHomepageCatalogProducts = ({
  categoryIds,
  queryClient,
  region,
  sort,
  status,
}: HomepageCatalogPrefetchInput) =>
  prefetchServerCatalogProducts(
    queryClient,
    buildCatalogProductsParams({
      queryState: buildHomepageCatalogQueryState(sort, status),
      categoryIds,
      limit: HOMEPAGE_PRODUCTS_PER_SECTION,
      regionId: region.region_id,
      countryCode: region.country_code,
    }),
  );

export const prefetchHomePageStorefrontData = async () => {
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

  if (region) {
    const bestsellersCategory = categoryResponse.categories.find(
      (category) => category.handle === HOMEPAGE_BESTSELLERS_CATEGORY_HANDLE,
    );
    const prefetches = [
      prefetchHomepageCatalogProducts({
        queryClient,
        region,
        sort: "newest",
        status: ["new"],
      }),
      prefetchHomepageCatalogProducts({
        queryClient,
        region,
        sort: "recommended",
        status: ["action"],
      }),
    ];

    if (bestsellersCategory?.id) {
      prefetches.push(
        prefetchHomepageCatalogProducts({
          categoryIds: [bestsellersCategory.id],
          queryClient,
          region,
          sort: "recommended",
        }),
      );
    }

    await Promise.all(prefetches);
  }

  return {
    region,
    dehydratedState: dehydrate(queryClient),
  };
};
