"use client"

import { useRegionContext } from "@techsio/storefront-data/shared/region-context"
import { useQueryStates } from "nuqs"

import { useCategoryFacetItems } from "@/components/category/use-category-facet-items"
import { useCatalogProducts } from "@/lib/storefront/catalog-products"
import {
  buildCatalogProductsParams,
  resolveCatalogActiveFilterCount,
  resolveCatalogPriceBounds,
} from "@/lib/storefront/catalog-query-state"
import {
  PLP_PAGE_SIZE,
  plpQueryParsers,
} from "@/lib/storefront/plp-query-state"
import { resolveRegionCurrency } from "@/lib/storefront/region-selection"
import {
  useCatalogListingInteractions,
  useCatalogListingPageBounds,
} from "@/lib/storefront/use-catalog-listing-interactions"

export const useSearchListingController = () => {
  const region = useRegionContext()
  const regionCurrencyCode = resolveRegionCurrency(region)
  const [queryState, setQueryState] = useQueryStates(plpQueryParsers)
  const query = queryState.q.trim()
  const isSearchQueryEnabled =
    region?.region_id !== undefined && query.length > 0

  const catalogProductsInput = buildCatalogProductsParams({
    limit: PLP_PAGE_SIZE,
    queryState,
  })

  const catalogQuery = useCatalogProducts({
    ...catalogProductsInput,
    enabled: isSearchQueryEnabled,
  })

  const catalogFacetSeedInput = buildCatalogProductsParams({
    limit: 1,
    queryState: {
      ...queryState,
      brand: [],
      form: [],
      ingredient: [],
      page: 1,
      price_max: null,
      price_min: null,
      sort: "recommended",
      status: [],
    },
  })

  const catalogFacetSeedQuery = useCatalogProducts({
    ...catalogFacetSeedInput,
    enabled: isSearchQueryEnabled,
  })

  const {
    asideBrandItems,
    asideFormItems,
    asideIngredientItems,
    asideStatusItems,
  } = useCategoryFacetItems({
    catalogFacets: catalogQuery.facets,
    queryState,
    seedFacets: catalogFacetSeedQuery.facets,
  })

  const listingInteractions = useCatalogListingInteractions({
    productPrefetchKeyPrefix: "search-product",
    queryState,
    ...(region?.region_id === undefined ? {} : { regionId: region?.region_id }),
    ...(region?.country_code === undefined
      ? {}
      : { countryCode: region?.country_code }),
    setQueryState,
  })

  useCatalogListingPageBounds({
    isLoading: catalogQuery.isLoading,
    isQueryEnabled: isSearchQueryEnabled,
    page: queryState.page,
    setQueryState,
    totalPages: catalogQuery.totalPages,
  })

  return {
    ...listingInteractions,
    activeAsideFilterCount: resolveCatalogActiveFilterCount(queryState),
    asideBrandItems,
    asideFormItems,
    asideIngredientItems,
    asideStatusItems,
    catalogQuery,
    isFiltersLoading:
      isSearchQueryEnabled &&
      (catalogQuery.isLoading || catalogFacetSeedQuery.isLoading),
    isResultsLoading:
      query.length > 0 &&
      (region?.region_id === undefined || catalogQuery.isLoading),
    isResultsRefreshing:
      catalogQuery.isFetching &&
      (catalogQuery.products.length > 0 ||
        catalogQuery.query.isPlaceholderData),
    isSearchQueryEnabled,
    priceBounds: resolveCatalogPriceBounds(catalogQuery.facets.price),
    products: catalogQuery.products,
    productsCurrencyCode: regionCurrencyCode,
    query,
  }
}
