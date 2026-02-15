"use client";

import type { HttpTypes } from "@medusajs/types";
import { useRegionContext } from "@techsio/storefront-data/shared";
import { Badge } from "@techsio/ui-kit/atoms/badge";
import { Button } from "@techsio/ui-kit/atoms/button";
import { ErrorText } from "@techsio/ui-kit/atoms/error-text";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { Skeleton } from "@techsio/ui-kit/atoms/skeleton";
import { Breadcrumb } from "@techsio/ui-kit/molecules/breadcrumb";
import { FormInput } from "@techsio/ui-kit/molecules/form-input";
import { Pagination } from "@techsio/ui-kit/molecules/pagination";
import { Select, type SelectItem } from "@techsio/ui-kit/molecules/select";
import NextLink from "next/link";
import { useQueryStates } from "nuqs";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { HerbatikaHomeProductCard } from "@/components/herbatika-home-product-card";
import { useAddLineItem, useCart } from "@/lib/storefront/cart";
import {
  useCategories,
  usePrefetchCategories,
  usePrefetchCategory,
} from "@/lib/storefront/categories";
import { collectDescendantCategoryIds } from "@/lib/storefront/category-tree";
import {
  PLP_PAGE_SIZE,
  plpQueryParsers,
  PRODUCT_SORT_OPTIONS,
  resolveProductSortOrder,
  type ProductSortValue,
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

const normalizeCategoryName = (value?: string | null) => {
  if (!value) {
    return "Kategória";
  }

  return value.replace(/^>\s*/, "").trim();
};

const resolveErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "An unknown error occurred.";
};

const resolveCategoryRank = (category: HttpTypes.StoreProductCategory) => {
  if (typeof category.rank === "number") {
    return category.rank;
  }

  return Number.MAX_SAFE_INTEGER;
};

const SORT_SELECT_ITEMS: SelectItem[] = PRODUCT_SORT_OPTIONS.map((option) => ({
  label: option.label,
  value: option.value,
}));

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          className="rounded-[14px] border border-border-secondary bg-surface p-3"
          key={`plp-skeleton-${index}`}
        >
          <Skeleton.Rectangle className="mb-3 h-44 rounded-[10px]" />
          <Skeleton.Text className="rounded-full" noOfLines={2} size="sm" />
          <Skeleton.Rectangle className="mt-4 h-8 rounded-[8px]" />
        </div>
      ))}
    </div>
  );
}

export function StorefrontCategoryListing({ slug }: StorefrontCategoryListingProps) {
  const region = useRegionContext();
  const [queryState, setQueryState] = useQueryStates(plpQueryParsers);
  const [addToCartError, setAddToCartError] = useState<string | null>(null);
  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  const [searchDraft, setSearchDraft] = useState(queryState.q);

  const categoriesQuery = useCategories({
    page: 1,
    limit: 500,
    fields: "id,name,handle,parent_category_id,rank",
  });

  useEffect(() => {
    setSearchDraft(queryState.q);
  }, [queryState.q]);

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
        const rankDifference = resolveCategoryRank(left) - resolveCategoryRank(right);
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
      ...collectDescendantCategoryIds(categoriesQuery.categories, activeCategory.id),
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

      currentCategory = categoryById.get(currentCategory.parent_category_id) ?? null;
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
  const searchQuery = queryState.q.trim();

  const productsInput = useMemo(() => {
    return {
      page: queryState.page,
      limit: PLP_PAGE_SIZE,
      fields: STOREFRONT_PRODUCT_CARD_FIELDS,
      category_id: activeCategoryFilterIds.length > 0 ? activeCategoryFilterIds : undefined,
      order: sortOrder,
      q: searchQuery || undefined,
      enabled: Boolean(region?.region_id && activeCategory?.id),
    };
  }, [
    activeCategory?.id,
    activeCategoryFilterIds,
    queryState.page,
    region?.region_id,
    searchQuery,
    sortOrder,
  ]);

  const productsQuery = useProducts(productsInput);

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
      setAddToCartError("Produkt nemá dostupnú variantu na pridanie do košíka.");
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

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void setQueryState({
      q: searchDraft.trim(),
      page: 1,
    });
  };

  const resetFilters = () => {
    setSearchDraft("");
    void setQueryState({
      q: "",
      sort: "recommended",
      page: 1,
    });
  };

  const activeSortSelection = useMemo(() => {
    return [queryState.sort];
  }, [queryState.sort]);

  const showCategoryNotFound =
    !categoriesQuery.isLoading &&
    categoriesQuery.categories.length > 0 &&
    !activeCategory;

  const categorySubtitle =
    activeCategoryFilterIds.length > 1
      ? `Zobrazené vrátane ${activeCategoryFilterIds.length - 1} podkategórií`
      : "Zobrazené produkty danej kategórie";

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <Breadcrumb
        items={breadcrumbItems}
        linkAs={NextLink}
      />

      <section className="space-y-4 rounded-xl border border-black/10 bg-white p-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">
            {normalizeCategoryName(activeCategory?.name ?? slug)}
          </h1>
          <div className="flex flex-wrap gap-2">
            <Badge variant={activeCategory ? "success" : "warning"}>
              {activeCategory ? "kategória nájdená" : "kategória nenájdená"}
            </Badge>
            <Badge variant="info">{categorySubtitle}</Badge>
            <Badge variant="info">{`produkty: ${productsQuery.totalCount}`}</Badge>
          </div>
        </header>

        <div className="flex flex-wrap gap-2">
          {topLevelCategories.map((category) => (
            <LinkButton
              as={NextLink}
              href={`/c/${category.handle}`}
              key={category.id}
              onBlur={() => {
                prefetchCategory.cancelPrefetch(`prefetch-category-${category.id}`);
                prefetchProducts.cancelPrefetch(`prefetch-category-products-${category.id}`);
              }}
              onFocus={() => {
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
                  },
                  250,
                  `prefetch-category-products-${category.id}`,
                );
              }}
              onMouseEnter={() => {
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
                  },
                  250,
                  `prefetch-category-products-${category.id}`,
                );
              }}
              onMouseLeave={() => {
                prefetchCategory.cancelPrefetch(`prefetch-category-${category.id}`);
                prefetchCategories.cancelPrefetch(
                  `prefetch-category-children-${category.id}`,
                );
                prefetchProducts.cancelPrefetch(`prefetch-category-products-${category.id}`);
              }}
              size="sm"
              theme={category.handle === activeCategory?.handle ? "solid" : "outlined"}
              variant={category.handle === activeCategory?.handle ? "primary" : "secondary"}
            >
              {normalizeCategoryName(category.name)}
            </LinkButton>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-black/10 bg-white p-6">
        <form className="grid gap-3 md:grid-cols-[1fr_240px_auto]" onSubmit={handleSearchSubmit}>
          <FormInput
            id="plp-search"
            label="Hľadať v kategórii"
            name="q"
            placeholder="Napr. borovica, vitamín C..."
            type="text"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
          />

          <Select
            items={SORT_SELECT_ITEMS}
            onValueChange={(details) => {
              const nextSort = details.value[0];
              if (!nextSort) {
                return;
              }

              handleSortChange(nextSort as ProductSortValue);
            }}
            value={activeSortSelection}
          >
            <Select.Label>Zoradiť podľa</Select.Label>
            <Select.Control>
              <Select.Trigger>
                <Select.ValueText placeholder="Zvoľte radenie" />
              </Select.Trigger>
              <Select.ClearTrigger />
            </Select.Control>
            <Select.Positioner>
              <Select.Content>
                {SORT_SELECT_ITEMS.map((item) => (
                  <Select.Item item={item} key={item.value}>
                    <Select.ItemText />
                    <Select.ItemIndicator />
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Positioner>
          </Select>

          <div className="flex items-end gap-2">
            <Button type="submit" variant="secondary">
              Použiť
            </Button>
            <Button onClick={resetFilters} theme="outlined" type="button" variant="secondary">
              Reset
            </Button>
          </div>
        </form>

        {addToCartError && <ErrorText showIcon>{addToCartError}</ErrorText>}
        {categoriesQuery.error && <ErrorText showIcon>{categoriesQuery.error}</ErrorText>}
        {productsQuery.error && <ErrorText showIcon>{productsQuery.error}</ErrorText>}
        {showCategoryNotFound && (
          <ErrorText showIcon>
            Kategóriu sa nepodarilo nájsť. Skontrolujte URL alebo vyberte inú kategóriu.
          </ErrorText>
        )}

        {(categoriesQuery.isLoading || productsQuery.isLoading) && <ProductGridSkeleton />}

        {!categoriesQuery.isLoading &&
          !productsQuery.isLoading &&
          !showCategoryNotFound &&
          productsQuery.products.length === 0 && (
            <div className="rounded-lg border border-black/10 bg-base p-4">
              <p className="text-sm text-fg-secondary">
                V tejto kategórii zatiaľ nie sú dostupné produkty pre zvolený filter.
              </p>
            </div>
          )}

        {!categoriesQuery.isLoading &&
          !productsQuery.isLoading &&
          productsQuery.products.length > 0 && (
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              {productsQuery.products.map((product) => (
                <HerbatikaHomeProductCard
                  isAdding={
                    addLineItemMutation.isPending && activeProductId === product.id
                  }
                  key={product.id}
                  onAddToCart={handleAddToCart}
                  onProductHoverEnd={(hoveredProduct) => {
                    prefetchProduct.cancelPrefetch(`plp-product-${hoveredProduct.id}`);
                  }}
                  onProductHoverStart={(hoveredProduct) => {
                    if (!hoveredProduct.handle) {
                      return;
                    }

                    prefetchProduct.delayedPrefetch(
                      {
                        handle: hoveredProduct.handle,
                        fields: STOREFRONT_PRODUCT_DETAIL_FIELDS,
                      },
                      180,
                      `plp-product-${hoveredProduct.id}`,
                    );
                  }}
                  product={product}
                />
              ))}
            </div>
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
      </section>
    </main>
  );
}
