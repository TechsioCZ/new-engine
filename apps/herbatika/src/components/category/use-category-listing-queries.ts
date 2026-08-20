"use client"

import type { HttpTypes } from "@medusajs/types"
import { useRegionContext } from "@techsio/storefront-data/shared/region-context"
import { useLocale, useTranslations } from "next-intl"
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
import { useMarketContext } from "@/lib/storefront/market-context-provider"
import {
  type NuqsPlpQueryState,
  PLP_PAGE_SIZE,
} from "@/lib/storefront/plp-query-state"
import { resolveRegionCurrency } from "@/lib/storefront/region-selection"
import {
  isSaleCategoryHandle,
  resolveCategoryCatalogScope,
} from "@/lib/storefront/sale-catalog-policy"
import { buildProjectedEntityPath } from "@/lib/url/link-projections/projected-entity-link"
import { buildPath } from "@/lib/url/public-url"
import type { Market } from "@/lib/url/types"

const resolveBreadcrumbItems = ({
  activeCategory,
  categoryFallbackLabel,
  categoryById,
  homeLabel,
  market,
  publicSlugsById,
  slug,
}: {
  activeCategory: HttpTypes.StoreProductCategory | null
  categoryFallbackLabel: string
  categoryById: Map<string, HttpTypes.StoreProductCategory>
  homeLabel: string
  market: Market
  publicSlugsById: Readonly<Record<string, string>>
  slug: string
}) => {
  const items: HerbatikaBreadcrumbItem[] = [
    {
      label: homeLabel,
      href: buildPath({ kind: "home" }, market),
      icon: "token-icon-home",
    },
  ]

  if (!activeCategory) {
    items.push({ label: normalizeCategoryName(slug, categoryFallbackLabel) })
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
    const label = normalizeCategoryName(category.name, categoryFallbackLabel)
    const isLast = index === trail.length - 1
    const href = isLast
      ? undefined
      : (buildProjectedEntityPath(
          "category",
          { publicSlug: publicSlugsById[category.id] },
          market
        ) ?? undefined)

    items.push({
      label,
      href,
    })
  }

  return items
}

type UseCategoryListingQueriesProps = {
  categoryPublicSlugsById?: Readonly<Record<string, string>>
  queryState: NuqsPlpQueryState
  slug: string
}

export function useCategoryListingQueries({
  categoryPublicSlugsById = {},
  queryState,
  slug,
}: UseCategoryListingQueriesProps) {
  const locale = useLocale()
  const tCatalog = useTranslations("catalog")
  const tContent = useTranslations("content")
  const tNavigation = useTranslations("navigation")
  const region = useRegionContext()
  const { code: market } = useMarketContext()
  const regionCurrencyCode = resolveRegionCurrency(region)
  const categoryFallbackLabel = tCatalog("category.default_name")
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

      return normalizeCategoryName(
        left.name,
        categoryFallbackLabel
      ).localeCompare(
        normalizeCategoryName(right.name, categoryFallbackLabel),
        locale
      )
    })

  const breadcrumbItems = resolveBreadcrumbItems({
    activeCategory,
    categoryFallbackLabel,
    categoryById,
    homeLabel: tNavigation("breadcrumbs.home"),
    market,
    publicSlugsById: categoryPublicSlugsById,
    slug,
  })
  const categoryCatalogScope = resolveCategoryCatalogScope(
    slug,
    activeCategoryFilterIds
  )

  const catalogProductsInput = buildCatalogProductsParams({
    queryState,
    ...categoryCatalogScope,
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
    ...categoryCatalogScope,
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
    market,
    publicSlugsById: categoryPublicSlugsById,
  })
  let categorySubtitle = tCatalog("category.subtitle.direct_products")

  if (isSaleCategoryHandle(slug)) {
    categorySubtitle = tContent("home.product_sections.sale")
  } else if (activeCategoryFilterIds.length > 1) {
    categorySubtitle = tCatalog("category.subtitle.includes_subcategories", {
      count: activeCategoryFilterIds.length - 1,
    })
  }

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
      market,
      publicSlugsById: categoryPublicSlugsById,
    }),
    categoryContextImageTiles,
    categoryIntroHtml: resolveCategoryIntroHtml({
      activeCategory,
      categoryByHandle,
      market,
      publicSlugsById: categoryPublicSlugsById,
    }),
    categoryIntroText: resolveCategoryIntroText({ activeCategory }),
    categorySubtitle,
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
