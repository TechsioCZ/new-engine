"use client"

import { useRegionContext } from "@techsio/storefront-data/shared/region-context"
import { useQueryStates } from "nuqs"
import { useEffect, useMemo } from "react"
import { useCategoryFacetItems } from "@/components/category/use-category-facet-items"
import { useCatalogProducts } from "@/lib/storefront/catalog-products"
import {
  buildCatalogProductsParams,
  resolveCatalogActiveFilterCount,
  resolveCatalogPriceBounds,
} from "@/lib/storefront/catalog-query-state"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"
import { resolveErrorMessage } from "@/lib/storefront/error-utils"
import {
  PLP_PAGE_SIZE,
  plpQueryParsers,
} from "@/lib/storefront/plp-query-state"
import { resolveRegionCurrency } from "@/lib/storefront/region-selection"
import {
  useCatalogListingInteractions,
  useCatalogListingPageBounds,
} from "@/lib/storefront/use-catalog-listing-interactions"

type UseBrandListingControllerProps = {
  brandFacetId: string
}

export function useBrandListingController({
  brandFacetId,
}: UseBrandListingControllerProps) {
  const region = useRegionContext()
  const regionCurrencyCode = resolveRegionCurrency(region)
  const [queryState, setQueryState] = useQueryStates(plpQueryParsers)
  const visibleQueryState = useMemo(
    () => ({
      ...queryState,
      brand: [],
    }),
    [queryState]
  )
  const brandQueryState = useMemo(
    () => ({
      ...queryState,
      brand: [brandFacetId],
    }),
    [brandFacetId, queryState]
  )
  const isBrandQueryEnabled = Boolean(region?.region_id && brandFacetId)
  const queryBrandSignature = queryState.brand.join("\0")

  useEffect(() => {
    if (!queryBrandSignature) {
      return
    }

    runDetachedPromise(setQueryState({ brand: [] }))
  }, [queryBrandSignature, setQueryState])

  const catalogProductsInput = useMemo(
    () =>
      buildCatalogProductsParams({
        queryState: brandQueryState,
        limit: PLP_PAGE_SIZE,
      }),
    [brandQueryState]
  )

  const catalogQuery = useCatalogProducts({
    ...catalogProductsInput,
    enabled: isBrandQueryEnabled,
  })

  const catalogFacetSeedInput = useMemo(
    () =>
      buildCatalogProductsParams({
        queryState: {
          ...queryState,
          page: 1,
          sort: "recommended",
          status: [],
          form: [],
          brand: [brandFacetId],
          ingredient: [],
          price_min: null,
          price_max: null,
        },
        limit: 1,
      }),
    [brandFacetId, queryState]
  )

  const catalogFacetSeedQuery = useCatalogProducts({
    ...catalogFacetSeedInput,
    enabled: isBrandQueryEnabled,
  })

  const {
    asideBrandItems,
    asideFormItems,
    asideIngredientItems,
    asideStatusItems,
  } = useCategoryFacetItems({
    catalogFacets: catalogQuery.facets,
    queryState: visibleQueryState,
    seedFacets: catalogFacetSeedQuery.facets,
  })

  const listingInteractions = useCatalogListingInteractions({
    productPrefetchKeyPrefix: `brand-${brandFacetId}`,
    queryState: visibleQueryState,
    regionId: region?.region_id,
    countryCode: region?.country_code,
    setQueryState,
  })

  useCatalogListingPageBounds({
    isLoading: catalogQuery.isLoading,
    isQueryEnabled: isBrandQueryEnabled,
    page: queryState.page,
    setQueryState,
    totalPages: catalogQuery.totalPages,
  })

  return {
    ...listingInteractions,
    activeAsideFilterCount: resolveCatalogActiveFilterCount(visibleQueryState),
    asideBrandItems,
    asideFormItems,
    asideIngredientItems,
    asideStatusItems,
    catalogError: catalogQuery.error
      ? resolveErrorMessage(catalogQuery.error, "Načítanie produktov zlyhalo.")
      : null,
    catalogQuery,
    isFiltersLoading:
      isBrandQueryEnabled &&
      (catalogQuery.isLoading || catalogFacetSeedQuery.isLoading),
    isResultsLoading:
      !region?.region_id ||
      (catalogQuery.isLoading && catalogQuery.products.length === 0),
    isResultsRefreshing:
      catalogQuery.isFetching &&
      (catalogQuery.products.length > 0 ||
        catalogQuery.query.isPlaceholderData),
    priceBounds: resolveCatalogPriceBounds(catalogQuery.facets.price),
    products: catalogQuery.products,
    productsCurrencyCode: regionCurrencyCode,
    queryState,
  }
}
