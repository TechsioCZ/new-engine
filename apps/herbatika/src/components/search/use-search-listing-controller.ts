"use client";

import type { HttpTypes } from "@medusajs/types";
import { useRegionContext } from "@techsio/storefront-data/shared";
import { useQueryStates } from "nuqs";
import { useEffect, useMemo } from "react";
import { toggleSelection } from "@/components/category/category-selection-utils";
import { resolveProductCurrencyCode } from "@/components/category/category-product-utils";
import { useCategoryFacetItems } from "@/components/category/use-category-facet-items";
import { useSearchAddToCart } from "@/components/search/use-search-add-to-cart";
import { resolveErrorMessage } from "@/lib/storefront/error-utils";
import {
  buildCatalogProductsParams,
  resolveCatalogActiveFilterCount,
  resolveCatalogQueryStatePatch,
} from "@/lib/storefront/catalog-query-state";
import { useCatalogProducts } from "@/lib/storefront/catalog-products";
import { PLP_PAGE_SIZE, plpQueryParsers, type ProductSortValue } from "@/lib/storefront/plp-query-state";
import { STOREFRONT_PRODUCT_DETAIL_FIELDS, usePrefetchProduct } from "@/lib/storefront/products";

const resolvePriceBounds = (priceFacet: {
  min: number | null;
  max: number | null;
}) => {
  if (priceFacet.min === null && priceFacet.max === null) {
    return null;
  }

  return {
    min: priceFacet.min ?? 0,
    max: priceFacet.max ?? priceFacet.min ?? 1,
  };
};

export function useSearchListingController() {
  const region = useRegionContext();
  const [queryState, setQueryState] = useQueryStates(plpQueryParsers);
  const query = queryState.q.trim();
  const isSearchQueryEnabled = Boolean(region?.region_id && query.length > 0);

  const catalogProductsInput = useMemo(() => {
    return buildCatalogProductsParams({
      queryState,
      limit: PLP_PAGE_SIZE,
      regionId: region?.region_id,
      countryCode: region?.country_code,
    });
  }, [queryState, region?.country_code, region?.region_id]);

  const catalogQuery = useCatalogProducts({
    ...catalogProductsInput,
    enabled: isSearchQueryEnabled,
  });

  const catalogFacetSeedInput = useMemo(() => {
    return buildCatalogProductsParams({
      queryState: {
        ...queryState,
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
      regionId: region?.region_id,
      countryCode: region?.country_code,
    });
  }, [queryState, region?.country_code, region?.region_id]);

  const catalogFacetSeedQuery = useCatalogProducts({
    ...catalogFacetSeedInput,
    enabled: isSearchQueryEnabled,
  });

  const {
    asideBrandItems,
    asideFormItems,
    asideIngredientItems,
    asideStatusItems,
  } = useCategoryFacetItems({
    catalogFacets: catalogQuery.facets,
    queryState,
    seedFacets: catalogFacetSeedQuery.facets,
  });

  const { addToCartError, activeProductId, isAddPending, handleAddToCart } =
    useSearchAddToCart({
      regionId: region?.region_id,
      countryCode: region?.country_code,
    });

  const prefetchProduct = usePrefetchProduct({ defaultDelay: 180, skipMode: "any" });

  useEffect(() => {
    if (!isSearchQueryEnabled || catalogQuery.isLoading) {
      return;
    }

    const safeLastPage = Math.max(catalogQuery.totalPages, 1);
    if (queryState.page <= safeLastPage) {
      return;
    }

    void setQueryState({ page: safeLastPage });
  }, [
    catalogQuery.isLoading,
    catalogQuery.totalPages,
    isSearchQueryEnabled,
    queryState.page,
    setQueryState,
  ]);

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
    addToCartError,
    activeAsideFilterCount: resolveCatalogActiveFilterCount(queryState),
    asideBrandItems,
    asideFormItems,
    asideIngredientItems,
    asideStatusItems,
    catalogError: catalogQuery.error
      ? resolveErrorMessage(catalogQuery.error, "Načítanie produktov zlyhalo.")
      : null,
    catalogQuery,
    isFiltersLoading:
      isSearchQueryEnabled &&
      (catalogQuery.isLoading || catalogFacetSeedQuery.isLoading),
    isProductAdding: (productId: string) =>
      isAddPending && activeProductId === productId,
    isResultsLoading:
      query.length > 0 &&
      (!region?.region_id || catalogQuery.isLoading),
    isSearchQueryEnabled,
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
      prefetchProduct.cancelPrefetch(`search-product-${product.id}`);
    },
    onProductHoverStart: (product: HttpTypes.StoreProduct) => {
      if (!product.handle) {
        return;
      }

      prefetchProduct.delayedPrefetch(
        { handle: product.handle, fields: STOREFRONT_PRODUCT_DETAIL_FIELDS },
        180,
        `search-product-${product.id}`,
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
    priceBounds: resolvePriceBounds(catalogQuery.facets.price),
    products: catalogQuery.products,
    productsCurrencyCode: resolveProductCurrencyCode(catalogQuery.products),
    query,
    queryState,
    selectedPriceRange: {
      min: queryState.price_min ?? undefined,
      max: queryState.price_max ?? undefined,
    },
  };
}
