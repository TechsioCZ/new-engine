"use client";

import { useRegionContext } from "@techsio/storefront-data/shared/region-context";
import { useQueryStates } from "nuqs";
import { useMemo } from "react";
import { useCategoryFacetItems } from "@/components/category/use-category-facet-items";
import { resolveErrorMessage } from "@/lib/storefront/error-utils";
import {
  buildCatalogProductsParams,
  resolveCatalogActiveFilterCount,
  resolveCatalogPriceBounds,
} from "@/lib/storefront/catalog-query-state";
import { useCatalogProducts } from "@/lib/storefront/catalog-products";
import { PLP_PAGE_SIZE, plpQueryParsers } from "@/lib/storefront/plp-query-state";
import { resolveRegionCurrency } from "@/lib/storefront/region-selection";
import {
  useCatalogListingInteractions,
  useCatalogListingPageBounds,
} from "@/lib/storefront/use-catalog-listing-interactions";

export function useSearchListingController() {
  const region = useRegionContext();
  const regionCurrencyCode = resolveRegionCurrency(region);
  const [queryState, setQueryState] = useQueryStates(plpQueryParsers);
  const query = queryState.q.trim();
  const isSearchQueryEnabled = Boolean(region?.region_id && query.length > 0);

  const catalogProductsInput = useMemo(() => {
    return buildCatalogProductsParams({
      queryState,
      limit: PLP_PAGE_SIZE,
    });
  }, [queryState]);

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
    });
  }, [queryState]);

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

  const listingInteractions = useCatalogListingInteractions({
    productPrefetchKeyPrefix: "search-product",
    queryState,
    regionId: region?.region_id,
    countryCode: region?.country_code,
    setQueryState,
  });

  useCatalogListingPageBounds({
    isLoading: catalogQuery.isLoading,
    isQueryEnabled: isSearchQueryEnabled,
    page: queryState.page,
    setQueryState,
    totalPages: catalogQuery.totalPages,
  });

  return {
    ...listingInteractions,
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
    isResultsRefreshing:
      catalogQuery.isFetching &&
      (catalogQuery.products.length > 0 || catalogQuery.query.isPlaceholderData),
    isResultsLoading:
      query.length > 0 &&
      (!region?.region_id || catalogQuery.isLoading),
    isSearchQueryEnabled,
    priceBounds: resolveCatalogPriceBounds(catalogQuery.facets.price),
    products: catalogQuery.products,
    productsCurrencyCode: regionCurrencyCode,
    query,
  };
}
