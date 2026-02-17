"use client";

import type { HttpTypes } from "@medusajs/types";
import { useRegionContext } from "@techsio/storefront-data/shared";
import { ErrorText } from "@techsio/ui-kit/atoms/error-text";
import { Breadcrumb } from "@techsio/ui-kit/molecules/breadcrumb";
import { Pagination } from "@techsio/ui-kit/molecules/pagination";
import NextLink from "next/link";
import { useQueryStates } from "nuqs";
import { useEffect, useMemo, useState } from "react";
import { AsideFilter } from "@/components/aside-filter";
import { CategoryHeader } from "@/components/category/category-header";
import {
  normalizeCategoryName,
  resolveCategoryRank,
  resolveErrorMessage,
} from "@/components/category/category-listing.helpers";
import { CategoryProductsGrid } from "@/components/category/category-products-grid";
import { CategorySortTabs } from "@/components/category/category-sort-tabs";
import { CategoryTopLevelLinks } from "@/components/category/category-top-level-links";
import { ProductGridSkeleton } from "@/components/category/product-grid-skeleton";
import { useCategoryAsideFilters } from "@/components/category/use-category-aside-filters";
import { useAddLineItem, useCart } from "@/lib/storefront/cart";
import {
  useCategories,
  usePrefetchCategories,
  usePrefetchCategory,
} from "@/lib/storefront/categories";
import { collectDescendantCategoryIds } from "@/lib/storefront/category-tree";
import {
  PLP_PAGE_SIZE,
  type ProductSortValue,
  plpQueryParsers,
  resolveProductSortOrder,
} from "@/lib/storefront/plp-query-state";
import {
  STOREFRONT_PRODUCT_CARD_FIELDS,
  STOREFRONT_PRODUCT_DETAIL_FIELDS,
  usePrefetchPages,
  usePrefetchProduct,
  usePrefetchProducts,
  useProducts,
} from "@/lib/storefront/products";

type StorefrontCategoryListingProps = {
  slug: string;
};

const SORT_TAB_ITEMS: Array<{ label: string; value: ProductSortValue }> = [
  { label: "Odporúčame", value: "recommended" },
  { label: "Najlacnejšie", value: "title-asc" },
  { label: "Najdrahšie", value: "title-desc" },
  { label: "Najpredávanejšie", value: "oldest" },
  { label: "Najnovšie", value: "newest" },
];

export function StorefrontCategoryListing({
  slug,
}: StorefrontCategoryListingProps) {
  const region = useRegionContext();
  const [queryState, setQueryState] = useQueryStates(plpQueryParsers);
  const [addToCartError, setAddToCartError] = useState<string | null>(null);
  const [activeProductId, setActiveProductId] = useState<string | null>(null);

  const categoriesQuery = useCategories({
    page: 1,
    limit: 500,
    fields: "id,name,handle,parent_category_id,rank",
  });

  const categoryByHandle = useMemo(() => {
    const map = new Map<string, HttpTypes.StoreProductCategory>();

    for (const category of categoriesQuery.categories) {
      if (!category.handle) {
        continue;
      }

      map.set(category.handle, category);
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
  const activeCategoryId = activeCategory?.id ?? null;

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

  const breadcrumbItems = useMemo(() => {
    const items: Array<{ label: string; href?: string }> = [
      { label: "Domov", href: "/" },
    ];

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
      const isLast = index === trail.length - 1;
      const label = normalizeCategoryName(category.name);

      if (isLast) {
        items.push({ label });
        continue;
      }

      items.push({
        label,
        href: category.handle ? `/c/${category.handle}` : undefined,
      });
    }

    return items;
  }, [activeCategory, categoryById, slug]);

  const sortOrder = resolveProductSortOrder(queryState.sort);

  const productsInput = useMemo(() => {
    return {
      page: queryState.page,
      limit: PLP_PAGE_SIZE,
      fields: STOREFRONT_PRODUCT_CARD_FIELDS,
      category_id:
        activeCategoryFilterIds.length > 0
          ? activeCategoryFilterIds
          : undefined,
      order: sortOrder,
      region_id: region?.region_id,
      country_code: region?.country_code,
      enabled: Boolean(region?.region_id && activeCategory?.id),
    };
  }, [
    activeCategory?.id,
    activeCategoryFilterIds,
    region?.country_code,
    region?.region_id,
    queryState.page,
    sortOrder,
  ]);

  const productsQuery = useProducts(productsInput);
  const {
    productsCurrencyCode,
    asidePriceBands,
    asideStatusItems,
    asideFormItems,
    asideBrandItems,
    asideIngredientItems,
    activeAsideFilterCount,
    displayedProducts,
    applyPriceBandsFromRange,
    toggleStatusFilter,
    toggleFormFilter,
    toggleBrandFilter,
    toggleIngredientFilter,
    resetAsideFilters,
  } = useCategoryAsideFilters({
    products: productsQuery.products,
    activeCategoryId,
  });

  useEffect(() => {
    if (!productsInput.enabled || productsQuery.isLoading) {
      return;
    }

    const safeLastPage = Math.max(productsQuery.totalPages, 1);
    if (queryState.page <= safeLastPage) {
      return;
    }

    void setQueryState({ page: safeLastPage });
  }, [
    productsInput.enabled,
    productsQuery.isLoading,
    productsQuery.totalPages,
    queryState.page,
    setQueryState,
  ]);

  usePrefetchPages({
    enabled: Boolean(productsInput.enabled),
    shouldPrefetch: productsQuery.products.length > 0,
    baseInput: productsInput,
    currentPage: productsQuery.currentPage,
    hasNextPage: productsQuery.hasNextPage,
    hasPrevPage: productsQuery.hasPrevPage,
    totalPages: productsQuery.totalPages,
    pageSize: PLP_PAGE_SIZE,
    mode: "priority",
  });

  const cartQuery = useCart({
    autoCreate: true,
    region_id: region?.region_id,
    country_code: region?.country_code,
    enabled: Boolean(region?.region_id),
  });
  const addLineItemMutation = useAddLineItem();
  const prefetchProduct = usePrefetchProduct({
    defaultDelay: 180,
    skipMode: "any",
  });
  const prefetchCategory = usePrefetchCategory({
    defaultDelay: 200,
    skipMode: "any",
  });
  const prefetchCategories = usePrefetchCategories({
    defaultDelay: 250,
    skipMode: "any",
  });
  const prefetchProducts = usePrefetchProducts({
    defaultDelay: 250,
    skipMode: "any",
  });

  const handleAddToCart = async (product: HttpTypes.StoreProduct) => {
    setAddToCartError(null);

    const variantId = product.variants?.[0]?.id;
    if (!variantId || !region?.region_id) {
      setAddToCartError(
        "Produkt nemá dostupnú variantu na pridanie do košíka.",
      );
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
      setAddToCartError(resolveErrorMessage(error));
    } finally {
      setActiveProductId(null);
    }
  };

  const handleSortChange = (value: ProductSortValue) => {
    void setQueryState({
      sort: value,
      page: 1,
    });
  };

  const showCategoryNotFound =
    !categoriesQuery.isLoading &&
    categoriesQuery.categories.length > 0 &&
    !activeCategory;

  const categorySubtitle =
    activeCategoryFilterIds.length > 1
      ? `Zobrazené vrátane ${activeCategoryFilterIds.length - 1} podkategórií`
      : "Zobrazené produkty danej kategórie";

  const handleCategoryBlur = (category: HttpTypes.StoreProductCategory) => {
    prefetchCategory.cancelPrefetch(`prefetch-category-${category.id}`);
    prefetchProducts.cancelPrefetch(
      `prefetch-category-products-${category.id}`,
    );
  };

  const handleCategoryFocus = (category: HttpTypes.StoreProductCategory) => {
    prefetchCategory.delayedPrefetch(
      { id: category.id },
      200,
      `prefetch-category-${category.id}`,
    );
    prefetchProducts.delayedPrefetch(
      {
        page: 1,
        limit: PLP_PAGE_SIZE,
        fields: STOREFRONT_PRODUCT_CARD_FIELDS,
        category_id: [category.id],
        order: sortOrder,
        region_id: region?.region_id,
        country_code: region?.country_code,
      },
      250,
      `prefetch-category-products-${category.id}`,
    );
  };

  const handleCategoryMouseEnter = (
    category: HttpTypes.StoreProductCategory,
  ) => {
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
    prefetchProducts.delayedPrefetch(
      {
        page: 1,
        limit: PLP_PAGE_SIZE,
        fields: STOREFRONT_PRODUCT_CARD_FIELDS,
        category_id: [category.id],
        order: sortOrder,
        region_id: region?.region_id,
        country_code: region?.country_code,
      },
      250,
      `prefetch-category-products-${category.id}`,
    );
  };

  const handleCategoryMouseLeave = (
    category: HttpTypes.StoreProductCategory,
  ) => {
    prefetchCategory.cancelPrefetch(`prefetch-category-${category.id}`);
    prefetchCategories.cancelPrefetch(
      `prefetch-category-children-${category.id}`,
    );
    prefetchProducts.cancelPrefetch(
      `prefetch-category-products-${category.id}`,
    );
  };

  const handleProductHoverEnd = (product: HttpTypes.StoreProduct) => {
    prefetchProduct.cancelPrefetch(`plp-product-${product.id}`);
  };

  const handleProductHoverStart = (product: HttpTypes.StoreProduct) => {
    if (!product.handle) {
      return;
    }

    prefetchProduct.delayedPrefetch(
      {
        handle: product.handle,
        fields: STOREFRONT_PRODUCT_DETAIL_FIELDS,
      },
      180,
      `plp-product-${product.id}`,
    );
  };

  const isProductAdding = (productId: string) => {
    return addLineItemMutation.isPending && activeProductId === productId;
  };

  return (
    <main className="mx-auto flex w-full max-w-max-w flex-col gap-600 p-600">
      <Breadcrumb items={breadcrumbItems} linkAs={NextLink} />

      <section className="space-y-400 rounded-xl border border-border-secondary bg-surface p-600">
        <CategoryHeader
          activeAsideFilterCount={activeAsideFilterCount}
          categoryFound={Boolean(activeCategory)}
          categorySubtitle={categorySubtitle}
          displayedProductsCount={displayedProducts.length}
          title={normalizeCategoryName(activeCategory?.name ?? slug)}
          totalProducts={productsQuery.totalCount}
        />
        <CategoryTopLevelLinks
          activeCategoryHandle={activeCategory?.handle ?? null}
          getCategoryLabel={(category) => normalizeCategoryName(category.name)}
          onCategoryBlur={handleCategoryBlur}
          onCategoryFocus={handleCategoryFocus}
          onCategoryMouseEnter={handleCategoryMouseEnter}
          onCategoryMouseLeave={handleCategoryMouseLeave}
          topLevelCategories={topLevelCategories}
        />
      </section>

      <section className="space-y-400 rounded-xl border border-border-secondary bg-surface p-600">
        <div className="grid gap-600 xl:grid-cols-12">
          <div className="xl:col-span-3">
            <AsideFilter
              activeFilterCount={activeAsideFilterCount}
              brandItems={asideBrandItems}
              currencyCode={productsCurrencyCode}
              formItems={asideFormItems}
              ingredientItems={asideIngredientItems}
              isLoading={categoriesQuery.isLoading || productsQuery.isLoading}
              onBrandToggle={toggleBrandFilter}
              onFormToggle={toggleFormFilter}
              onIngredientToggle={toggleIngredientFilter}
              onPriceBandSelectionChange={applyPriceBandsFromRange}
              onReset={resetAsideFilters}
              onStatusToggle={toggleStatusFilter}
              priceBands={asidePriceBands}
              statusItems={asideStatusItems}
            />
          </div>

          <div className="space-y-400 xl:col-span-9">
            <CategorySortTabs
              activeSort={queryState.sort}
              onSortChange={handleSortChange}
              sortItems={SORT_TAB_ITEMS}
              totalProducts={productsQuery.totalCount}
            />

            {addToCartError && <ErrorText showIcon>{addToCartError}</ErrorText>}
            {categoriesQuery.error && (
              <ErrorText showIcon>{categoriesQuery.error}</ErrorText>
            )}
            {productsQuery.error && (
              <ErrorText showIcon>{productsQuery.error}</ErrorText>
            )}
            {showCategoryNotFound && (
              <ErrorText showIcon>
                Kategóriu sa nepodarilo nájsť. Skontrolujte URL alebo vyberte
                inú kategóriu.
              </ErrorText>
            )}

            {(categoriesQuery.isLoading || productsQuery.isLoading) && (
              <ProductGridSkeleton />
            )}

            {!categoriesQuery.isLoading &&
              !productsQuery.isLoading &&
              !showCategoryNotFound &&
              productsQuery.products.length === 0 && (
                <div className="rounded-lg border border-border-secondary bg-base p-400">
                  <p className="text-sm text-fg-secondary">
                    V tejto kategórii zatiaľ nie sú dostupné produkty pre
                    zvolený filter.
                  </p>
                </div>
              )}

            {!categoriesQuery.isLoading &&
              !productsQuery.isLoading &&
              !showCategoryNotFound &&
              productsQuery.products.length > 0 &&
              displayedProducts.length === 0 && (
                <div className="rounded-lg border border-border-secondary bg-base p-400">
                  <p className="text-sm text-fg-secondary">
                    Žiadny produkt nevyhovuje vybranému filtrovanému rozsahu.
                  </p>
                </div>
              )}

            {!categoriesQuery.isLoading &&
              !productsQuery.isLoading &&
              displayedProducts.length > 0 && (
                <CategoryProductsGrid
                  isProductAdding={isProductAdding}
                  onAddToCart={handleAddToCart}
                  onProductHoverEnd={handleProductHoverEnd}
                  onProductHoverStart={handleProductHoverStart}
                  products={displayedProducts}
                />
              )}

            {productsQuery.totalPages > 1 && (
              <Pagination
                count={productsQuery.totalCount}
                onPageChange={(nextPage) => {
                  if (nextPage === queryState.page) {
                    return;
                  }

                  void setQueryState({ page: nextPage });
                }}
                page={queryState.page}
                pageSize={PLP_PAGE_SIZE}
                size="sm"
                variant="outlined"
              />
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
