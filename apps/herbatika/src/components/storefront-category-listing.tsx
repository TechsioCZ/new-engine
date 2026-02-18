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
import {
  buildCategoryContextTiles,
  CategoryContextPanel,
} from "@/components/category/category-context-panel";
import { CategoryHeader } from "@/components/category/category-header";
import {
  normalizeCategoryName,
  resolveCategoryRank,
  resolveErrorMessage,
  resolveProductCurrencyCode,
} from "@/components/category/category-listing.helpers";
import { CategoryProductsGrid } from "@/components/category/category-products-grid";
import { CategorySortTabs } from "@/components/category/category-sort-tabs";
import { CategoryTopLevelLinks } from "@/components/category/category-top-level-links";
import { ProductGridSkeleton } from "@/components/category/product-grid-skeleton";
import { useAddLineItem, useCart } from "@/lib/storefront/cart";
import { useCatalogProducts } from "@/lib/storefront/catalog-products";
import {
  buildCatalogProductsParams,
  resolveCatalogActiveFilterCount,
} from "@/lib/storefront/catalog-query-state";
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
  resolveCatalogQueryStatePatch,
} from "@/lib/storefront/plp-query-state";
import {
  STOREFRONT_PRODUCT_DETAIL_FIELDS,
  usePrefetchProduct,
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

type CategoryContextPreset = {
  introText: string;
  preferredTiles: Array<{
    handle: string;
    label: string;
  }>;
};

const CATEGORY_DESCRIPTION_PLACEHOLDER = "Imported from Herbatica XML feed.";

const CATEGORY_CONTEXT_PRESETS: Record<string, CategoryContextPreset> = {
  "trapi-ma": {
    introText:
      "Človek je neoddeliteľnou súčasťou prírody, každá jedna bunka je s ňou prepojená a závislá od jej ďalších zložiek: vody, vzduchu, stromov, rastlín a ďalších živých tvorov na zemi. Spôsob, akým k nej pristupujeme, sa odráža aj na našom zdraví. Trápi vás oslabená imunita, kožné problémy, únava alebo bolesti kĺbov? V Herbatica sme pre vás pripravili jedinečnú kategóriu Trápi ma, v ktorej nájdete prírodné produkty rozdelené podľa účelu a oblasti zdravia.",
    preferredTiles: [
      { handle: "trapi-ma-kozne-problemy", label: "Kožné problémy" },
      {
        handle: "trapi-ma-mozog-a-nervovy-system",
        label: "Mozog a nervový systém",
      },
      { handle: "trapi-ma-imunita-a-obranyschopnost", label: "Imunita" },
      { handle: "trapi-ma-klby-a-pohybovy-aparat", label: "Kĺby a pohyb" },
      {
        handle: "trapi-ma-travenie-a-metabolizmus",
        label: "Trávenie a metabolizmus",
      },
      { handle: "trapi-ma-srdce-a-cievy", label: "Srdce a cievy" },
      {
        handle: "trapi-ma-hormonalna-rovnovaha",
        label: "Hormonálna rovnováha",
      },
      {
        handle: "trapi-ma-hormonalna-rovnovaha-zenske-zdravie",
        label: "Ženské zdravie",
      },
    ],
  },
};

const toggleMultiValueSelection = (values: string[], value: string): string[] => {
  if (values.includes(value)) {
    return values.filter((item) => item !== value);
  }

  return [...values, value];
};

type CatalogFacetItem = {
  id: string;
  label: string;
  count: number;
};

const buildFacetChipItems = (
  currentFacetItems: CatalogFacetItem[],
  seedFacetItems: CatalogFacetItem[],
  selectedIds: string[],
) => {
  const countById = new Map(currentFacetItems.map((item) => [item.id, item.count]));
  const labelById = new Map<string, string>();
  const orderedIds: string[] = [];
  const seenIds = new Set<string>();

  const pushOrderedId = (id: string) => {
    if (seenIds.has(id)) {
      return;
    }

    seenIds.add(id);
    orderedIds.push(id);
  };

  for (const item of seedFacetItems) {
    labelById.set(item.id, item.label);
    pushOrderedId(item.id);
  }

  for (const item of currentFacetItems) {
    labelById.set(item.id, item.label);
    pushOrderedId(item.id);
  }

  for (const selectedId of selectedIds) {
    if (!labelById.has(selectedId)) {
      labelById.set(selectedId, selectedId);
    }

    pushOrderedId(selectedId);
  }

  const selectedIdSet = new Set(selectedIds);

  return orderedIds.map((id) => {
    const label = labelById.get(id) ?? id;
    const count = countById.get(id) ?? 0;
    const checked = selectedIdSet.has(id);

    return {
      id,
      label,
      count,
      checked,
      disabled: count === 0 && !checked,
    };
  });
};

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
    fields: "id,name,handle,parent_category_id,rank,description",
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

  const catalogProductsInput = useMemo(() => {
    return buildCatalogProductsParams({
      queryState,
      categoryIds: activeCategoryFilterIds,
      limit: PLP_PAGE_SIZE,
      regionId: region?.region_id,
      countryCode: region?.country_code,
    });
  }, [
    activeCategoryFilterIds,
    queryState,
    region?.country_code,
    region?.region_id,
  ]);
  const isCatalogQueryEnabled = Boolean(region?.region_id && activeCategory?.id);

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
      regionId: region?.region_id,
      countryCode: region?.country_code,
    });
  }, [
    activeCategoryFilterIds,
    queryState.q,
    region?.country_code,
    region?.region_id,
  ]);

  const catalogFacetSeedQuery = useCatalogProducts({
    ...catalogFacetSeedInput,
    enabled: isCatalogQueryEnabled,
  });

  const activeAsideFilterCount = resolveCatalogActiveFilterCount(queryState);
  const productsCurrencyCode = useMemo(() => {
    return resolveProductCurrencyCode(catalogQuery.products);
  }, [catalogQuery.products]);

  const asideStatusItems = useMemo(() => {
    return buildFacetChipItems(
      catalogQuery.facets.status,
      catalogFacetSeedQuery.facets.status,
      queryState.status,
    );
  }, [
    catalogFacetSeedQuery.facets.status,
    catalogQuery.facets.status,
    queryState.status,
  ]);

  const asideFormItems = useMemo(() => {
    return buildFacetChipItems(
      catalogQuery.facets.form,
      catalogFacetSeedQuery.facets.form,
      queryState.form,
    );
  }, [catalogFacetSeedQuery.facets.form, catalogQuery.facets.form, queryState.form]);

  const asideBrandItems = useMemo(() => {
    return buildFacetChipItems(
      catalogQuery.facets.brand,
      catalogFacetSeedQuery.facets.brand,
      queryState.brand,
    );
  }, [
    catalogFacetSeedQuery.facets.brand,
    catalogQuery.facets.brand,
    queryState.brand,
  ]);

  const asideIngredientItems = useMemo(() => {
    return buildFacetChipItems(
      catalogQuery.facets.ingredient,
      catalogFacetSeedQuery.facets.ingredient,
      queryState.ingredient,
    );
  }, [
    catalogFacetSeedQuery.facets.ingredient,
    catalogQuery.facets.ingredient,
    queryState.ingredient,
  ]);

  useEffect(() => {
    if (!isCatalogQueryEnabled || catalogQuery.isLoading) {
      return;
    }

    const safeLastPage = Math.max(catalogQuery.totalPages, 1);
    if (queryState.page <= safeLastPage) {
      return;
    }

    void setQueryState({ page: safeLastPage });
  }, [
    isCatalogQueryEnabled,
    catalogQuery.isLoading,
    catalogQuery.totalPages,
    queryState.page,
    setQueryState,
  ]);

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
    void setQueryState(
      resolveCatalogQueryStatePatch(queryState, {
        sort: value,
      }),
    );
  };

  const handleStatusToggle = (itemId: string) => {
    void setQueryState(
      resolveCatalogQueryStatePatch(queryState, {
        status: toggleMultiValueSelection(queryState.status, itemId),
      }),
    );
  };

  const handleFormToggle = (itemId: string) => {
    void setQueryState(
      resolveCatalogQueryStatePatch(queryState, {
        form: toggleMultiValueSelection(queryState.form, itemId),
      }),
    );
  };

  const handleBrandToggle = (itemId: string) => {
    void setQueryState(
      resolveCatalogQueryStatePatch(queryState, {
        brand: toggleMultiValueSelection(queryState.brand, itemId),
      }),
    );
  };

  const handleIngredientToggle = (itemId: string) => {
    void setQueryState(
      resolveCatalogQueryStatePatch(queryState, {
        ingredient: toggleMultiValueSelection(queryState.ingredient, itemId),
      }),
    );
  };

  const handlePriceRangeCommit = (range: { min?: number; max?: number }) => {
    void setQueryState(
      resolveCatalogQueryStatePatch(queryState, {
        price_min: range.min ?? null,
        price_max: range.max ?? null,
      }),
    );
  };

  const handleResetFilters = () => {
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
  };

  const showCategoryNotFound =
    !categoriesQuery.isLoading &&
    categoriesQuery.categories.length > 0 &&
    !activeCategory;

  const categorySubtitle =
    activeCategoryFilterIds.length > 1
      ? `Zobrazené vrátane ${activeCategoryFilterIds.length - 1} podkategórií`
      : "Zobrazené produkty danej kategórie";

  const categoryIntroText = useMemo(() => {
    const presetIntro = CATEGORY_CONTEXT_PRESETS[slug]?.introText;
    if (presetIntro) {
      return presetIntro;
    }

    const description = activeCategory?.description?.trim();
    if (!description || description === CATEGORY_DESCRIPTION_PLACEHOLDER) {
      return null;
    }

    return description;
  }, [activeCategory?.description, slug]);

  const categoryContextTiles = useMemo(() => {
    if (!activeCategory) {
      return [];
    }

    const presetTilesConfig =
      CATEGORY_CONTEXT_PRESETS[slug]?.preferredTiles ?? [];
    if (presetTilesConfig.length > 0) {
      const presetTiles = presetTilesConfig
        .map((tileConfig) => {
          const category = categoryByHandle.get(tileConfig.handle) ?? null;
          if (!category?.handle) {
            return null;
          }

          return {
            id: category.id,
            label: tileConfig.label,
            href: `/c/${category.handle}`,
            handle: category.handle,
          };
        })
        .filter(
          (
            tile,
          ): tile is {
            id: string;
            label: string;
            href: string;
            handle: string;
          } => Boolean(tile),
        );

      if (presetTiles.length > 0) {
        return buildCategoryContextTiles(presetTiles);
      }
    }

    const directChildren = categoriesQuery.categories
      .filter((category) => {
        return (
          category.parent_category_id === activeCategory.id &&
          Boolean(category.handle)
        );
      })
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
      })
      .slice(0, 8)
      .map((category) => ({
        id: category.id,
        label: normalizeCategoryName(category.name),
        href: `/c/${category.handle}`,
        handle: category.handle,
      }));

    if (directChildren.length > 0) {
      return buildCategoryContextTiles(directChildren);
    }

    const descendants = activeCategoryFilterIds
      .map((categoryId) => categoryById.get(categoryId) ?? null)
      .filter((category): category is HttpTypes.StoreProductCategory => {
        if (!category || !category.handle) {
          return false;
        }

        return category.id !== activeCategory.id;
      })
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
      })
      .slice(0, 8)
      .map((category) => ({
        id: category.id,
        label: normalizeCategoryName(category.name),
        href: `/c/${category.handle}`,
        handle: category.handle,
      }));

    return buildCategoryContextTiles(descendants);
  }, [
    activeCategory,
    activeCategoryFilterIds,
    categoriesQuery.categories,
    categoryByHandle,
    categoryById,
    slug,
  ]);

  const handleCategoryBlur = (category: HttpTypes.StoreProductCategory) => {
    prefetchCategory.cancelPrefetch(`prefetch-category-${category.id}`);
  };

  const handleCategoryFocus = (category: HttpTypes.StoreProductCategory) => {
    prefetchCategory.delayedPrefetch(
      { id: category.id },
      200,
      `prefetch-category-${category.id}`,
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
  };

  const handleCategoryMouseLeave = (
    category: HttpTypes.StoreProductCategory,
  ) => {
    prefetchCategory.cancelPrefetch(`prefetch-category-${category.id}`);
    prefetchCategories.cancelPrefetch(
      `prefetch-category-children-${category.id}`,
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
          displayedProductsCount={catalogQuery.totalCount}
          title={normalizeCategoryName(activeCategory?.name ?? slug)}
          totalProducts={catalogQuery.totalCount}
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

      <CategoryContextPanel
        introText={categoryIntroText}
        tiles={categoryContextTiles}
      />

      <section className="space-y-400 rounded-xl border border-border-secondary bg-surface p-600">
        <div className="grid gap-600 xl:grid-cols-12">
          <div className="xl:col-span-3">
            <AsideFilter
              activeFilterCount={activeAsideFilterCount}
              brandItems={asideBrandItems}
              currencyCode={productsCurrencyCode}
              formItems={asideFormItems}
              ingredientItems={asideIngredientItems}
              isLoading={
                categoriesQuery.isLoading ||
                catalogQuery.isLoading ||
                catalogFacetSeedQuery.isLoading
              }
              onBrandToggle={handleBrandToggle}
              onFormToggle={handleFormToggle}
              onIngredientToggle={handleIngredientToggle}
              onPriceRangeCommit={handlePriceRangeCommit}
              onReset={handleResetFilters}
              onStatusToggle={handleStatusToggle}
              priceBounds={
                catalogQuery.facets.price.min === null &&
                catalogQuery.facets.price.max === null
                  ? null
                  : {
                      min: catalogQuery.facets.price.min ?? 0,
                      max:
                        catalogQuery.facets.price.max ??
                        catalogQuery.facets.price.min ??
                        1,
                    }
              }
              selectedPriceRange={{
                min: queryState.price_min ?? undefined,
                max: queryState.price_max ?? undefined,
              }}
              statusItems={asideStatusItems}
            />
          </div>

          <div className="space-y-400 xl:col-span-9">
            <CategorySortTabs
              activeSort={queryState.sort}
              onSortChange={handleSortChange}
              sortItems={SORT_TAB_ITEMS}
              totalProducts={catalogQuery.totalCount}
            />

            {addToCartError && <ErrorText showIcon>{addToCartError}</ErrorText>}
            {categoriesQuery.error && (
              <ErrorText showIcon>{categoriesQuery.error}</ErrorText>
            )}
            {catalogQuery.error && (
              <ErrorText showIcon>{catalogQuery.error}</ErrorText>
            )}
            {showCategoryNotFound && (
              <ErrorText showIcon>
                Kategóriu sa nepodarilo nájsť. Skontrolujte URL alebo vyberte
                inú kategóriu.
              </ErrorText>
            )}

            {(categoriesQuery.isLoading || catalogQuery.isLoading) && (
              <ProductGridSkeleton />
            )}

            {!categoriesQuery.isLoading &&
              !catalogQuery.isLoading &&
              !showCategoryNotFound &&
              catalogQuery.products.length === 0 && (
                <div className="rounded-lg border border-border-secondary bg-base p-400">
                  <p className="text-sm text-fg-secondary">
                    V tejto kategórii zatiaľ nie sú dostupné produkty pre
                    zvolený filter.
                  </p>
                </div>
              )}

            {!categoriesQuery.isLoading &&
              !catalogQuery.isLoading &&
              catalogQuery.products.length > 0 && (
                <CategoryProductsGrid
                  isProductAdding={isProductAdding}
                  onAddToCart={handleAddToCart}
                  onProductHoverEnd={handleProductHoverEnd}
                  onProductHoverStart={handleProductHoverStart}
                  products={catalogQuery.products}
                />
              )}

            {catalogQuery.totalPages > 1 && (
              <Pagination
                count={catalogQuery.totalCount}
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
