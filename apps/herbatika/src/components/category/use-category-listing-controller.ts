"use client";

import type { HttpTypes } from "@medusajs/types";
import { useRegionContext } from "@techsio/storefront-data/shared/region-context";
import { useQueryStates } from "nuqs";
import { useEffect, useState } from "react";
import { useCategoryListingQueries } from "@/components/category/use-category-listing-queries";
import { toggleSelection } from "@/components/category/category-selection-utils";
import {
  storefrontCartReadQueryOptions,
  useAddLineItem,
  useCart,
} from "@/lib/storefront/cart";
import {
  usePrefetchCategories,
  usePrefetchCategory,
} from "@/lib/storefront/categories";
import {
  plpQueryParsers,
  resolveCatalogQueryStatePatch,
  type ProductSortValue,
} from "@/lib/storefront/plp-query-state";
import {
  STOREFRONT_PRODUCT_DETAIL_FIELDS,
  usePrefetchProduct,
} from "@/lib/storefront/products";
import { resolveErrorMessage } from "@/lib/storefront/error-utils";

type UseCategoryListingControllerProps = {
  slug: string;
};

export function useCategoryListingController({
  slug,
}: UseCategoryListingControllerProps) {
  const region = useRegionContext();
  const [queryState, setQueryState] = useQueryStates(plpQueryParsers);
  const [addToCartError, setAddToCartError] = useState<string | null>(null);
  const [activeProductId, setActiveProductId] = useState<string | null>(null);

  const listingQueries = useCategoryListingQueries({
    slug,
    queryState,
    regionId: region?.region_id,
    countryCode: region?.country_code,
  });

  const cartQuery = useCart({
    autoCreate: true,
    region_id: region?.region_id,
    country_code: region?.country_code,
    enabled: Boolean(region?.region_id),
  }, {
    queryOptions: storefrontCartReadQueryOptions,
  });
  const addLineItemMutation = useAddLineItem();
  const prefetchProduct = usePrefetchProduct({ defaultDelay: 180, skipMode: "any" });
  const prefetchCategory = usePrefetchCategory({ defaultDelay: 200, skipMode: "any" });
  const prefetchCategories = usePrefetchCategories({ defaultDelay: 250, skipMode: "any" });

  useEffect(() => {
    if (!listingQueries.isCatalogQueryEnabled || listingQueries.catalogQuery.isLoading) {
      return;
    }

    const safeLastPage = Math.max(listingQueries.catalogQuery.totalPages, 1);
    if (queryState.page <= safeLastPage) {
      return;
    }

    void setQueryState({ page: safeLastPage });
  }, [
    listingQueries.catalogQuery.isLoading,
    listingQueries.catalogQuery.totalPages,
    listingQueries.isCatalogQueryEnabled,
    queryState.page,
    setQueryState,
  ]);

  const handleAddToCart = async (product: HttpTypes.StoreProduct) => {
    setAddToCartError(null);

    const variantId = product.variants?.[0]?.id;
    if (!variantId || !region?.region_id) {
      setAddToCartError("Produkt nemá dostupnú variantu na pridanie do košíka.");
      return;
    }

    setActiveProductId(product.id);

    try {
      await addLineItemMutation.mutateAsync({
        cartId: cartQuery.cart?.id,
        variantId,
        quantity: 1,
        autoCreate: true,
        region_id: region.region_id,
        country_code: region.country_code,
      });
    } catch (error) {
      setAddToCartError(resolveErrorMessage(error, "Pridanie do košíka zlyhalo."));
    } finally {
      setActiveProductId(null);
    }
  };

  const patchMultiSelect = (
    key: "status" | "form" | "brand" | "ingredient",
    itemId: string,
  ) => {
    void setQueryState(
      resolveCatalogQueryStatePatch(queryState, {
        [key]: toggleSelection(queryState[key], itemId),
      }),
    );
  };

  return {
    ...listingQueries,
    addToCartError,
    isProductAdding: (productId: string) =>
      addLineItemMutation.isPending && activeProductId === productId,
    onAddToCart: handleAddToCart,
    onBrandToggle: (itemId: string) => patchMultiSelect("brand", itemId),
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
        { page: 1, limit: 100, parent_category_id: category.id },
        300,
        `prefetch-category-children-${category.id}`,
      );
    },
    onCategoryMouseLeave: (category: HttpTypes.StoreProductCategory) => {
      prefetchCategory.cancelPrefetch(`prefetch-category-${category.id}`);
      prefetchCategories.cancelPrefetch(`prefetch-category-children-${category.id}`);
    },
    onFormToggle: (itemId: string) => patchMultiSelect("form", itemId),
    onIngredientToggle: (itemId: string) => patchMultiSelect("ingredient", itemId),
    onPageChange: (nextPage: number) => {
      if (nextPage === queryState.page) {
        return;
      }

      void setQueryState({ page: nextPage });
    },
    onPriceRangeCommit: (range: { min?: number; max?: number }) => {
      void setQueryState(
        resolveCatalogQueryStatePatch(queryState, {
          price_min: range.min ?? null,
          price_max: range.max ?? null,
        }),
      );
    },
    onProductHoverEnd: (product: HttpTypes.StoreProduct) => {
      prefetchProduct.cancelPrefetch(`plp-product-${product.id}`);
    },
    onProductHoverStart: (product: HttpTypes.StoreProduct) => {
      if (!product.handle) {
        return;
      }

      prefetchProduct.delayedPrefetch(
        { handle: product.handle, fields: STOREFRONT_PRODUCT_DETAIL_FIELDS },
        180,
        `plp-product-${product.id}`,
      );
    },
    onResetFilters: () => {
      void setQueryState(
        resolveCatalogQueryStatePatch(
          queryState,
          {
            status: [],
            form: [],
            brand: [],
            ingredient: [],
            price_min: null,
            price_max: null,
          },
          { resetPage: "always" },
        ),
      );
    },
    onSortChange: (value: ProductSortValue) => {
      void setQueryState(resolveCatalogQueryStatePatch(queryState, { sort: value }));
    },
    onStatusToggle: (itemId: string) => patchMultiSelect("status", itemId),
    page: queryState.page,
    queryState,
    selectedPriceRange: {
      min: queryState.price_min ?? undefined,
      max: queryState.price_max ?? undefined,
    },
  };
}
