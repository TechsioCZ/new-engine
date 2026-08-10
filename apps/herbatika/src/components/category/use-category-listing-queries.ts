"use client"

import { useRegionContext } from "@techsio/storefront-data/shared/region-context"
import { useLocale, useTranslations } from "next-intl"

import { resolveCategoryContextImageTiles } from "@/components/category/category-context-image-tiles.utils"
import {
  resolveCategoryBottomHtml,
  resolveCategoryIntroHtml,
  resolveCategoryIntroText,
} from "@/components/category/category-context.utils"
import { buildCategoryListingNavigation } from "@/components/category/category-listing-navigation"
import { useCategoryFacetItems } from "@/components/category/use-category-facet-items"
import { useCatalogProducts } from "@/lib/storefront/catalog-products"
import {
  buildCatalogProductsParams,
  resolveCatalogActiveFilterCount,
  resolveCatalogPriceBounds,
} from "@/lib/storefront/catalog-query-state"
import { useCategories } from "@/lib/storefront/categories"
import {
  CATEGORY_TREE_FIELDS,
  CATEGORY_TREE_LIMIT,
} from "@/lib/storefront/category-query-config"
import { collectDescendantCategoryIds } from "@/lib/storefront/category-tree"
import { PLP_PAGE_SIZE } from "@/lib/storefront/plp-query-state"
import type { NuqsPlpQueryState } from "@/lib/storefront/plp-query-state"
import { resolveRegionCurrency } from "@/lib/storefront/region-selection"

interface UseCategoryListingQueriesProps {
  queryState: NuqsPlpQueryState
  slug: string
}

export const useCategoryListingQueries = ({
  queryState,
  slug,
}: UseCategoryListingQueriesProps) => {
  const locale = useLocale()
  const tNavigation = useTranslations("navigation")
  const region = useRegionContext()
  const regionCurrencyCode = resolveRegionCurrency(region)
  const categoriesQuery = useCategories({
    fields: CATEGORY_TREE_FIELDS,
    limit: CATEGORY_TREE_LIMIT,
    page: 1,
  })

  const {
    activeCategory,
    breadcrumbItems,
    categoryByHandle,
    categoryById,
    topLevelCategories,
  } = buildCategoryListingNavigation({
    categories: categoriesQuery.categories,
    homeLabel: tNavigation("breadcrumbs.home"),
    locale,
    slug,
  })

  const activeCategoryFilterIds = activeCategory
    ? [
        activeCategory.id,
        ...collectDescendantCategoryIds(
          categoriesQuery.categories,
          activeCategory.id,
        ),
      ]
    : []

  const catalogProductsInput = buildCatalogProductsParams({
    categoryIds: activeCategoryFilterIds,
    limit: PLP_PAGE_SIZE,
    queryState,
  })

  const isCatalogQueryEnabled =
    region?.region_id !== undefined && activeCategory?.id !== undefined

  const catalogQuery = useCatalogProducts({
    ...catalogProductsInput,
    enabled: isCatalogQueryEnabled,
  })

  const catalogFacetSeedInput = buildCatalogProductsParams({
    categoryIds: activeCategoryFilterIds,
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
    enabled: isCatalogQueryEnabled,
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

  const categoryContextImageTiles = resolveCategoryContextImageTiles({
    activeCategory,
    activeCategoryFilterIds,
    categories: categoriesQuery.categories,
    categoryById,
  })

  return {
    activeAsideFilterCount: resolveCatalogActiveFilterCount(queryState),
    activeCategory,
    activeCategoryFilterIds,
    asideBrandItems,
    asideFormItems,
    asideIngredientItems,
    asideStatusItems,
    breadcrumbItems,
    catalogQuery,
    categoriesQuery,
    categoryBottomHtml: resolveCategoryBottomHtml({
      activeCategory,
      categoryByHandle,
    }),
    categoryContextImageTiles,
    categoryIntroHtml: resolveCategoryIntroHtml({
      activeCategory,
      categoryByHandle,
    }),
    categoryIntroText: resolveCategoryIntroText({ activeCategory }),
    categorySubtitle:
      activeCategoryFilterIds.length > 1
        ? `Zobrazené vrátane ${activeCategoryFilterIds.length - 1} podkategórií`
        : "Zobrazené produkty danej kategórie",
    isCatalogQueryEnabled,
    isFiltersLoading:
      categoriesQuery.isLoading ||
      catalogQuery.isLoading ||
      catalogFacetSeedQuery.isLoading,
    priceBounds: resolveCatalogPriceBounds(catalogQuery.facets.price),
    products: catalogQuery.products,
    productsCurrencyCode: regionCurrencyCode,
    showCategoryNotFound:
      !categoriesQuery.isLoading &&
      categoriesQuery.categories.length > 0 &&
      !activeCategory,
    topLevelCategories,
  }
}
