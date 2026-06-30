"use client"

import type { HttpTypes } from "@medusajs/types"
import { useRegionContext } from "@techsio/storefront-data/shared/region-context"
import {
  resolveCategoryBottomHtml,
  resolveCategoryContextImageTiles,
  resolveCategoryIntroHtml,
  resolveCategoryIntroText,
} from "@/components/category/category-context.utils"
import {
  normalizeCategoryName,
  resolveCategoryRank,
} from "@/components/category/category-product-utils"
import { useCategoryFacetItems } from "@/components/category/use-category-facet-items"
import type { HerbatikaBreadcrumbItem } from "@/components/herbatika-breadcrumb"
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
import { resolveErrorMessage } from "@/lib/storefront/error-utils"
import {
  type NuqsPlpQueryState,
  PLP_PAGE_SIZE,
} from "@/lib/storefront/plp-query-state"
import { resolveRegionCurrency } from "@/lib/storefront/region-selection"

const resolveBreadcrumbItems = (
  slug: string,
  activeCategory: HttpTypes.StoreProductCategory | null,
  categoryById: Map<string, HttpTypes.StoreProductCategory>
) => {
  const items: HerbatikaBreadcrumbItem[] = [
    { label: "Domů", href: "/", icon: "token-icon-home" },
  ]

  if (!activeCategory) {
    items.push({ label: normalizeCategoryName(slug) })
    return items
  }

  const trail: HttpTypes.StoreProductCategory[] = []
  let currentCategory: HttpTypes.StoreProductCategory | null = activeCategory

  while (currentCategory) {
    trail.unshift(currentCategory)

    if (!currentCategory.parent_category_id) {
      break
    }

    currentCategory =
      categoryById.get(currentCategory.parent_category_id) ?? null
  }

  for (let index = 0; index < trail.length; index += 1) {
    const category = trail[index]
    const label = normalizeCategoryName(category.name)
    const isLast = index === trail.length - 1
    const href =
      isLast || !category.handle ? undefined : `/c/${category.handle}`

    items.push({
      label,
      href,
    })
  }

  return items
}

type UseCategoryListingQueriesProps = {
  queryState: NuqsPlpQueryState
  slug: string
}

export function useCategoryListingQueries({
  queryState,
  slug,
}: UseCategoryListingQueriesProps) {
  const region = useRegionContext()
  const regionCurrencyCode = resolveRegionCurrency(region)
  const categoriesQuery = useCategories({
    page: 1,
    limit: CATEGORY_TREE_LIMIT,
    fields: CATEGORY_TREE_FIELDS,
  })

  const categoryByHandle = new Map<string, HttpTypes.StoreProductCategory>()
  for (const category of categoriesQuery.categories) {
    if (category.handle) {
      categoryByHandle.set(category.handle, category)
    }
  }

  const categoryById = new Map<string, HttpTypes.StoreProductCategory>()
  for (const category of categoriesQuery.categories) {
    categoryById.set(category.id, category)
  }

  const activeCategory = categoryByHandle.get(slug) ?? null

  const activeCategoryFilterIds = activeCategory
    ? [
        activeCategory.id,
        ...collectDescendantCategoryIds(
          categoriesQuery.categories,
          activeCategory.id
        ),
      ]
    : []

  const topLevelCategories = categoriesQuery.categories
    .filter((category) => !category.parent_category_id && category.handle)
    .sort((left, right) => {
      const rankDifference =
        resolveCategoryRank(left) - resolveCategoryRank(right)
      if (rankDifference !== 0) {
        return rankDifference
      }

      return normalizeCategoryName(left.name).localeCompare(
        normalizeCategoryName(right.name),
        "sk"
      )
    })

  const breadcrumbItems = resolveBreadcrumbItems(
    slug,
    activeCategory,
    categoryById
  )

  const catalogProductsInput = buildCatalogProductsParams({
    queryState,
    categoryIds: activeCategoryFilterIds,
    limit: PLP_PAGE_SIZE,
  })

  const isCatalogQueryEnabled = Boolean(region?.region_id && activeCategory?.id)

  const catalogQuery = useCatalogProducts({
    ...catalogProductsInput,
    enabled: isCatalogQueryEnabled,
  })

  const catalogFacetSeedInput = buildCatalogProductsParams({
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
    categoryIds: activeCategoryFilterIds,
    limit: 1,
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
    catalogError: catalogQuery.error
      ? resolveErrorMessage(catalogQuery.error, "Načítanie produktov zlyhalo.")
      : null,
    catalogQuery,
    categoriesError: categoriesQuery.error
      ? resolveErrorMessage(
          categoriesQuery.error,
          "Načítanie kategórií zlyhalo."
        )
      : null,
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
