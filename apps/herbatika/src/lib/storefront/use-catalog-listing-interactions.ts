"use client";

import type { HttpTypes } from "@medusajs/types";
import type { SetValues } from "nuqs";
import { useEffect, useState } from "react";
import { toggleSelection } from "@/components/category/category-selection-utils";
import {
  plpQueryParsers,
  resolveCatalogQueryStatePatch,
  type NuqsPlpQueryState,
  type ProductSortValue,
} from "@/lib/storefront/plp-query-state";
import {
  STOREFRONT_PRODUCT_DETAIL_FIELDS,
  usePrefetchProduct,
} from "@/lib/storefront/products";
import { useAddProductToCart } from "@/lib/storefront/use-add-product-to-cart";

type CatalogMultiSelectKey = "status" | "form" | "brand" | "ingredient";

type UseCatalogListingInteractionsInput = {
  countryCode?: string;
  productPrefetchKeyPrefix: string;
  queryState: NuqsPlpQueryState;
  regionId?: string;
  setQueryState: SetValues<typeof plpQueryParsers>;
};

type UseCatalogListingPageBoundsInput = {
  isLoading: boolean;
  isQueryEnabled: boolean;
  page: number;
  setQueryState: SetValues<typeof plpQueryParsers>;
  totalPages: number;
};

const resolveNextMultiSelectValues = (
  key: CatalogMultiSelectKey,
  queryState: NuqsPlpQueryState,
  itemId: string,
) => {
  switch (key) {
    case "status":
      return { status: toggleSelection(queryState.status, itemId) };
    case "form":
      return { form: toggleSelection(queryState.form, itemId) };
    case "brand":
      return { brand: toggleSelection(queryState.brand, itemId) };
    case "ingredient":
      return { ingredient: toggleSelection(queryState.ingredient, itemId) };
  }
};

export function useCatalogListingPageBounds({
  isLoading,
  isQueryEnabled,
  page,
  setQueryState,
  totalPages,
}: UseCatalogListingPageBoundsInput) {
  useEffect(() => {
    if (!isQueryEnabled || isLoading) {
      return;
    }

    const safeLastPage = Math.max(totalPages, 1);
    if (page <= safeLastPage) {
      return;
    }

    void setQueryState({ page: safeLastPage });
  }, [isLoading, isQueryEnabled, page, setQueryState, totalPages]);
}

export function useCatalogListingInteractions({
  countryCode,
  productPrefetchKeyPrefix,
  queryState,
  regionId,
  setQueryState,
}: UseCatalogListingInteractionsInput) {
  const [addToCartError, setAddToCartError] = useState<string | null>(null);
  const addToCart = useAddProductToCart({
    regionId,
    countryCode,
  });
  const prefetchProduct = usePrefetchProduct({ defaultDelay: 180, skipMode: "any" });

  const handleAddToCart = async (product: HttpTypes.StoreProduct) => {
    setAddToCartError(null);

    try {
      await addToCart.addProductToCart({
        product,
        quantity: 1,
      });
    } catch (error) {
      setAddToCartError(
        error instanceof Error ? error.message : "Pridanie do košíka zlyhalo.",
      );
    }
  };

  const patchMultiSelect = (key: CatalogMultiSelectKey, itemId: string) => {
    void setQueryState(
      resolveCatalogQueryStatePatch(
        queryState,
        resolveNextMultiSelectValues(key, queryState, itemId),
      ),
    );
  };

  return {
    addToCartError,
    isProductAdding: (productId: string) => addToCart.isProductAdding(productId),
    onAddToCart: handleAddToCart,
    onBrandToggle: (itemId: string) => patchMultiSelect("brand", itemId),
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
      prefetchProduct.cancelPrefetch(`${productPrefetchKeyPrefix}-${product.id}`);
    },
    onProductHoverStart: (product: HttpTypes.StoreProduct) => {
      if (!product.handle) {
        return;
      }

      prefetchProduct.delayedPrefetch(
        { handle: product.handle, fields: STOREFRONT_PRODUCT_DETAIL_FIELDS },
        180,
        `${productPrefetchKeyPrefix}-${product.id}`,
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
