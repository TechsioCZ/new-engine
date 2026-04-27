"use client";

import type { HttpTypes } from "@medusajs/types";
import { useRegionContext } from "@techsio/storefront-data/shared/region-context";
import type { IconType } from "@techsio/ui-kit/atoms/icon";
import { useMemo } from "react";
import {
  resolveCategoryBottomHtml,
  resolveCategoryContextImageTiles,
  resolveCategoryIntroHtml,
  resolveCategoryIntroText,
} from "@/components/category/category-context.utils";
import {
  normalizeCategoryName,
  resolveCategoryRank,
  resolveProductCurrencyCode,
} from "@/components/category/category-product-utils";
import { useCatalogProducts } from "@/lib/storefront/catalog-products";
import {
  buildCatalogProductsParams,
  resolveCatalogActiveFilterCount,
} from "@/lib/storefront/catalog-query-state";
import {
  STOREFRONT_CATEGORY_TREE_FIELDS,
  STOREFRONT_CATEGORY_TREE_LIMIT,
} from "@/lib/storefront/category-query-config";
import { useCategories } from "@/lib/storefront/categories";
import { collectDescendantCategoryIds } from "@/lib/storefront/category-tree";
import {
  PLP_PAGE_SIZE,
  type NuqsPlpQueryState,
} from "@/lib/storefront/plp-query-state";
import { useCategoryFacetItems } from "@/components/category/use-category-facet-items";
import { resolveErrorMessage } from "@/lib/storefront/error-utils";

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

const resolveBreadcrumbItems = (
  slug: string,
  activeCategory: HttpTypes.StoreProductCategory | null,
  categoryById: Map<string, HttpTypes.StoreProductCategory>,
) => {
  const items: Array<{
    label: string;
    href?: string;
    icon?: IconType;
  }> = [{ label: "Products", href: "/", icon: "token-icon-home" }];

  if (!activeCategory) {
    items.push({ label: normalizeCategoryName(slug) });
    return items;
  }

  const trail: HttpTypes.StoreProductCategory[] = [];
  let currentCategory: HttpTypes.StoreProductCategory | null = activeCategory;

  while (currentCategory) {
    trail.unshift(currentCategory);

    if (!currentCategory.parent_category_id) {
      break;
    }

    currentCategory =
      categoryById.get(currentCategory.parent_category_id) ?? null;
  }

  for (let index = 0; index < trail.length; index += 1) {
    const category = trail[index];
    const label = normalizeCategoryName(category.name);
    const isLast = index === trail.length - 1;

    items.push({
      label,
      href: isLast
        ? undefined
        : category.handle
          ? `/c/${category.handle}`
          : undefined,
    });
  }

  return items;
};

type UseCategoryListingQueriesProps = {
  queryState: NuqsPlpQueryState;
  slug: string;
};

export function useCategoryListingQueries({
  queryState,
  slug,
}: UseCategoryListingQueriesProps) {
  const region = useRegionContext();
  const categoriesQuery = useCategories({
    page: 1,
    limit: STOREFRONT_CATEGORY_TREE_LIMIT,
    fields: STOREFRONT_CATEGORY_TREE_FIELDS,
  });

  const categoryByHandle = useMemo(() => {
    const map = new Map<string, HttpTypes.StoreProductCategory>();
    for (const category of categoriesQuery.categories) {
      if (category.handle) {
        map.set(category.handle, category);
      }
    }

    return map;
  }, [categoriesQuery.categories]);

  const categoryById = useMemo(() => {
    const map = new Map<string, HttpTypes.StoreProductCategory>();
    for (const category of categoriesQuery.categories) {
      map.set(category.id, category);
    }

    return map;
  }, [categoriesQuery.categories]);

  const activeCategory = categoryByHandle.get(slug) ?? null;

  const activeCategoryFilterIds = useMemo(() => {
    if (!activeCategory) {
      return [];
    }

    return [
      activeCategory.id,
      ...collectDescendantCategoryIds(
        categoriesQuery.categories,
        activeCategory.id,
      ),
    ];
  }, [activeCategory, categoriesQuery.categories]);

  const topLevelCategories = useMemo(() => {
    return categoriesQuery.categories
      .filter((category) => !category.parent_category_id && category.handle)
      .sort((left, right) => {
        const rankDifference =
          resolveCategoryRank(left) - resolveCategoryRank(right);
        if (rankDifference !== 0) {
          return rankDifference;
        }

        return normalizeCategoryName(left.name).localeCompare(
          normalizeCategoryName(right.name),
          "sk",
        );
      });
  }, [categoriesQuery.categories]);

  const breadcrumbItems = useMemo(() => {
    return resolveBreadcrumbItems(slug, activeCategory, categoryById);
  }, [activeCategory, categoryById, slug]);

  const catalogProductsInput = useMemo(() => {
    return buildCatalogProductsParams({
      queryState,
      categoryIds: activeCategoryFilterIds,
      limit: PLP_PAGE_SIZE,
    });
  }, [activeCategoryFilterIds, queryState]);

  const isCatalogQueryEnabled = Boolean(
    region?.region_id && activeCategory?.id,
  );

  const catalogQuery = useCatalogProducts({
    ...catalogProductsInput,
    enabled: isCatalogQueryEnabled,
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
      categoryIds: activeCategoryFilterIds,
      limit: 1,
    });
  }, [activeCategoryFilterIds, queryState]);

  const catalogFacetSeedQuery = useCatalogProducts({
    ...catalogFacetSeedInput,
    enabled: isCatalogQueryEnabled,
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

  const categoryContextImageTiles = useMemo(
    () =>
      resolveCategoryContextImageTiles({
        activeCategory,
        activeCategoryFilterIds,
        categories: categoriesQuery.categories,
        categoryById,
      }),
    [
      activeCategory,
      activeCategoryFilterIds,
      categoriesQuery.categories,
      categoryById,
    ],
  );

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
          "Načítanie kategórií zlyhalo.",
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
    priceBounds: resolvePriceBounds(catalogQuery.facets.price),
    products: catalogQuery.products,
    productsCurrencyCode: resolveProductCurrencyCode(catalogQuery.products),
    showCategoryNotFound:
      !categoriesQuery.isLoading &&
      categoriesQuery.categories.length > 0 &&
      !activeCategory,
    topLevelCategories,
  };
}
