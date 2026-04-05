"use client";

import type { HttpTypes } from "@medusajs/types";
import { useRegionContext } from "@techsio/storefront-data/shared/region-context";
import { useQueryStates } from "nuqs";
import { useCategoryListingQueries } from "@/components/category/use-category-listing-queries";
import { STOREFRONT_CATEGORY_TREE_FIELDS } from "@/lib/storefront/category-query-config";
import {
  usePrefetchCategories,
  usePrefetchCategory,
} from "@/lib/storefront/categories";
import { plpQueryParsers } from "@/lib/storefront/plp-query-state";
import {
  useCatalogListingInteractions,
  useCatalogListingPageBounds,
} from "@/lib/storefront/use-catalog-listing-interactions";

type UseCategoryListingControllerProps = {
  slug: string;
};

export function useCategoryListingController({
  slug,
}: UseCategoryListingControllerProps) {
  const region = useRegionContext();
  const [queryState, setQueryState] = useQueryStates(plpQueryParsers);

  const listingQueries = useCategoryListingQueries({
    slug,
    queryState,
  });

  const listingInteractions = useCatalogListingInteractions({
    productPrefetchKeyPrefix: "plp-product",
    queryState,
    regionId: region?.region_id,
    countryCode: region?.country_code,
    setQueryState,
  });
  const prefetchCategory = usePrefetchCategory({ defaultDelay: 200, skipMode: "any" });
  const prefetchCategories = usePrefetchCategories({ defaultDelay: 250, skipMode: "any" });

  useCatalogListingPageBounds({
    isLoading: listingQueries.catalogQuery.isLoading,
    isQueryEnabled: listingQueries.isCatalogQueryEnabled,
    page: queryState.page,
    setQueryState,
    totalPages: listingQueries.catalogQuery.totalPages,
  });

  return {
    ...listingQueries,
    ...listingInteractions,
    onCategoryBlur: (category: HttpTypes.StoreProductCategory) => {
      prefetchCategory.cancelPrefetch(`prefetch-category-${category.id}`);
    },
    onCategoryFocus: (category: HttpTypes.StoreProductCategory) => {
      prefetchCategory.delayedPrefetch(
        { id: category.id },
        200,
        `prefetch-category-${category.id}`,
      );
    },
    onCategoryMouseEnter: (category: HttpTypes.StoreProductCategory) => {
      prefetchCategory.delayedPrefetch(
        { id: category.id },
        200,
        `prefetch-category-${category.id}`,
      );
      prefetchCategories.delayedPrefetch(
        {
          page: 1,
          limit: 100,
          parent_category_id: category.id,
          fields: STOREFRONT_CATEGORY_TREE_FIELDS,
        },
        300,
        `prefetch-category-children-${category.id}`,
      );
    },
    onCategoryMouseLeave: (category: HttpTypes.StoreProductCategory) => {
      prefetchCategory.cancelPrefetch(`prefetch-category-${category.id}`);
      prefetchCategories.cancelPrefetch(`prefetch-category-children-${category.id}`);
    },
  };
}
