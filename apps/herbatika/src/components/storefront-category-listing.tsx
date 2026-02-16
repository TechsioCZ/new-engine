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
import {
  AsideFilter,
  type AsideFilterCategoryItem,
} from "@/components/aside-filter";
import { HerbatikaProductCard } from "@/components/herbatika-product-card";
import { useAddLineItem, useCart } from "@/lib/storefront/cart";
import {
  useCategories,
  usePrefetchCategories,
  usePrefetchCategory,
} from "@/lib/storefront/categories";
import { collectDescendantCategoryIds } from "@/lib/storefront/category-tree";
import {
  PLP_PAGE_SIZE,
  PRODUCT_SORT_OPTIONS,
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

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return null;
};

const resolveProductPriceAmount = (
  product: HttpTypes.StoreProduct,
): number | null => {
  const amount = product.variants?.[0]?.calculated_price?.calculated_amount;
  return typeof amount === "number" ? amount : null;
};

const resolveProductCurrencyCode = (
  products: HttpTypes.StoreProduct[],
): string => {
  for (const product of products) {
    const code = product.variants?.[0]?.calculated_price?.currency_code;
    if (typeof code === "string" && code.length === 3) {
      return code.toUpperCase();
    }
  }

  return "EUR";
};

const resolveProductInStock = (product: HttpTypes.StoreProduct): boolean => {
  const metadata = asRecord(product.metadata);
  const topOffer = asRecord(metadata?.top_offer);
  const stock = asRecord(topOffer?.stock);
  const amount = stock?.amount;

  if (typeof amount === "number") {
    return amount > 0;
  }

  return true;
};

type PriceBandDefinition = {
  id: string;
  min: number;
  maxExclusive: number | null;
};

const buildPriceBandDefinitions = (
  amounts: number[],
): PriceBandDefinition[] => {
  if (amounts.length === 0) {
    return [];
  }

  const minimum = Math.floor(Math.min(...amounts));
  const maximum = Math.ceil(Math.max(...amounts));

  if (minimum >= maximum) {
    return [
      {
        id: `price-${minimum}-plus`,
        min: minimum,
        maxExclusive: null,
      },
    ];
  }

  const bandCount = 4;
  const span = maximum - minimum;
  const step = Math.max(Math.ceil(span / bandCount), 1);
  const definitions: PriceBandDefinition[] = [];

  for (let index = 0; index < bandCount; index += 1) {
    const start = minimum + index * step;
    if (start > maximum) {
      break;
    }

    const nextBoundary = start + step;
    const maxExclusive = nextBoundary > maximum ? null : nextBoundary;

    definitions.push({
      id: `price-${start}-${maxExclusive ?? "plus"}`,
      min: start,
      maxExclusive,
    });

    if (maxExclusive === null) {
      break;
    }
  }

  return definitions;
};

const matchesPriceBand = (amount: number, definition: PriceBandDefinition) => {
  if (definition.maxExclusive === null) {
    return amount >= definition.min;
  }

  return amount >= definition.min && amount < definition.maxExclusive;
};

const formatAmount = (amount: number, currencyCode: string): string => {
  const locale = currencyCode === "CZK" ? "cs-CZ" : "sk-SK";

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${Math.round(amount)} ${currencyCode}`;
  }
};

const formatPriceBandLabel = (
  definition: PriceBandDefinition,
  currencyCode: string,
): string => {
  if (definition.maxExclusive === null) {
    return `${formatAmount(definition.min, currencyCode)}+`;
  }

  return `${formatAmount(definition.min, currencyCode)} - ${formatAmount(
    definition.maxExclusive,
    currencyCode,
  )}`;
};

const SORT_SELECT_ITEMS: SelectItem[] = PRODUCT_SORT_OPTIONS.map((option) => ({
  label: option.label,
  value: option.value,
}));

const PRODUCT_SKELETON_KEYS = [
  "skeleton-1",
  "skeleton-2",
  "skeleton-3",
  "skeleton-4",
  "skeleton-5",
  "skeleton-6",
  "skeleton-7",
  "skeleton-8",
] as const;

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
      {PRODUCT_SKELETON_KEYS.map((skeletonKey) => (
        <div
          className="rounded-[16px] border-transparent bg-surface p-[20px] pb-[26px]"
          key={skeletonKey}
        >
          <Skeleton.Rectangle className="mb-[10px] aspect-[294/259.2] rounded-none" />
          <Skeleton.Text className="rounded-full" noOfLines={2} size="lg" />
          <Skeleton.Text
            className="mt-2 rounded-full"
            noOfLines={2}
            size="sm"
          />
          <Skeleton.Rectangle className="mt-[18px] h-[40px] rounded-[7px]" />
        </div>
      ))}
    </div>
  );
}

export function StorefrontCategoryListing({
  slug,
}: StorefrontCategoryListingProps) {
  const region = useRegionContext();
  const [queryState, setQueryState] = useQueryStates(plpQueryParsers);
  const [addToCartError, setAddToCartError] = useState<string | null>(null);
  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  const [searchDraft, setSearchDraft] = useState(queryState.q);
  const [selectedPriceBandIds, setSelectedPriceBandIds] = useState<string[]>(
    [],
  );
  const [onlyInStock, setOnlyInStock] = useState(false);

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

  const asideCategoryItems = useMemo<AsideFilterCategoryItem[]>(() => {
    const sourceCategories = activeCategory
      ? categoriesQuery.categories.filter(
          (category) =>
            category.parent_category_id === activeCategory.id &&
            category.handle,
        )
      : topLevelCategories;

    const sortedSourceCategories = [...sourceCategories].sort((left, right) => {
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

    const items: AsideFilterCategoryItem[] = sortedSourceCategories.map(
      (category) => ({
        id: category.id,
        label: normalizeCategoryName(category.name),
        href: `/c/${category.handle}`,
        isActive: category.handle === activeCategory?.handle,
      }),
    );

    if (activeCategory?.handle) {
      items.unshift({
        id: activeCategory.id,
        label: normalizeCategoryName(activeCategory.name),
        href: `/c/${activeCategory.handle}`,
        isActive: true,
      });
    }

    const deduplicatedItems = new Map<string, AsideFilterCategoryItem>();

    for (const item of items) {
      if (deduplicatedItems.has(item.id)) {
        continue;
      }

      deduplicatedItems.set(item.id, item);
    }

    return Array.from(deduplicatedItems.values());
  }, [activeCategory, categoriesQuery.categories, topLevelCategories]);

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
  const searchQuery = queryState.q.trim();

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

  const productPriceAmounts = useMemo(() => {
    return productsQuery.products
      .map(resolveProductPriceAmount)
      .filter((amount): amount is number => typeof amount === "number");
  }, [productsQuery.products]);

  const priceBandDefinitions = useMemo(() => {
    return buildPriceBandDefinitions(productPriceAmounts);
  }, [productPriceAmounts]);

  const priceBandDefinitionById = useMemo(() => {
    return new Map(
      priceBandDefinitions.map((definition) => [definition.id, definition]),
    );
  }, [priceBandDefinitions]);

  const productsCurrencyCode = useMemo(() => {
    return resolveProductCurrencyCode(productsQuery.products);
  }, [productsQuery.products]);

  const asidePriceBands = useMemo(() => {
    return priceBandDefinitions.map((definition) => {
      let count = 0;

      for (const product of productsQuery.products) {
        const amount = resolveProductPriceAmount(product);
        if (typeof amount !== "number") {
          continue;
        }

        if (matchesPriceBand(amount, definition)) {
          count += 1;
        }
      }

      return {
        id: definition.id,
        label: formatPriceBandLabel(definition, productsCurrencyCode),
        checked: selectedPriceBandIds.includes(definition.id),
        count,
        disabled: count === 0,
      };
    });
  }, [
    priceBandDefinitions,
    productsCurrencyCode,
    productsQuery.products,
    selectedPriceBandIds,
  ]);

  const inStockCount = useMemo(() => {
    return productsQuery.products.reduce((count, product) => {
      return count + (resolveProductInStock(product) ? 1 : 0);
    }, 0);
  }, [productsQuery.products]);

  const outOfStockCount = Math.max(
    productsQuery.products.length - inStockCount,
    0,
  );

  const activeAsideFilterCount =
    selectedPriceBandIds.length + (onlyInStock ? 1 : 0);

  const displayedProducts = useMemo(() => {
    return productsQuery.products.filter((product) => {
      if (onlyInStock && !resolveProductInStock(product)) {
        return false;
      }

      if (selectedPriceBandIds.length === 0) {
        return true;
      }

      const amount = resolveProductPriceAmount(product);
      if (typeof amount !== "number") {
        return false;
      }

      return selectedPriceBandIds.some((selectedBandId) => {
        const definition = priceBandDefinitionById.get(selectedBandId);
        if (!definition) {
          return false;
        }

        return matchesPriceBand(amount, definition);
      });
    });
  }, [
    onlyInStock,
    priceBandDefinitionById,
    productsQuery.products,
    selectedPriceBandIds,
  ]);

  useEffect(() => {
    setSelectedPriceBandIds((currentState) =>
      currentState.filter((bandId) => priceBandDefinitionById.has(bandId)),
    );
  }, [priceBandDefinitionById]);

  useEffect(() => {
    setSelectedPriceBandIds([]);
    setOnlyInStock(false);
    if (activeCategoryId === null) {
      return;
    }
  }, [activeCategoryId]);

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

  const togglePriceBand = (bandId: string) => {
    setSelectedPriceBandIds((currentState) => {
      if (currentState.includes(bandId)) {
        return currentState.filter(
          (existingBandId) => existingBandId !== bandId,
        );
      }

      return [...currentState, bandId];
    });
  };

  const resetAsideFilters = () => {
    setSelectedPriceBandIds([]);
    setOnlyInStock(false);
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
      <Breadcrumb items={breadcrumbItems} linkAs={NextLink} />

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
            {activeAsideFilterCount > 0 && (
              <Badge variant="warning">{`po filtri: ${displayedProducts.length}`}</Badge>
            )}
          </div>
        </header>

        <div className="flex flex-wrap gap-2">
          {topLevelCategories.map((category) => (
            <LinkButton
              as={NextLink}
              href={`/c/${category.handle}`}
              key={category.id}
              onBlur={() => {
                prefetchCategory.cancelPrefetch(
                  `prefetch-category-${category.id}`,
                );
                prefetchProducts.cancelPrefetch(
                  `prefetch-category-products-${category.id}`,
                );
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
                prefetchCategory.cancelPrefetch(
                  `prefetch-category-${category.id}`,
                );
                prefetchCategories.cancelPrefetch(
                  `prefetch-category-children-${category.id}`,
                );
                prefetchProducts.cancelPrefetch(
                  `prefetch-category-products-${category.id}`,
                );
              }}
              size="sm"
              theme={
                category.handle === activeCategory?.handle
                  ? "solid"
                  : "outlined"
              }
              variant={
                category.handle === activeCategory?.handle
                  ? "primary"
                  : "secondary"
              }
            >
              {normalizeCategoryName(category.name)}
            </LinkButton>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-black/10 bg-white p-6">
        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <AsideFilter
            activeFilterCount={activeAsideFilterCount}
            categoryItems={asideCategoryItems}
            inStockCount={inStockCount}
            isLoading={categoriesQuery.isLoading || productsQuery.isLoading}
            onOnlyInStockChange={setOnlyInStock}
            onPriceBandToggle={togglePriceBand}
            onReset={resetAsideFilters}
            onlyInStock={onlyInStock}
            outOfStockCount={outOfStockCount}
            priceBands={asidePriceBands}
          />

          <div className="space-y-4">
            <form
              className="grid gap-3 md:grid-cols-[1fr_240px_auto]"
              onSubmit={handleSearchSubmit}
            >
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
                <Button
                  onClick={resetFilters}
                  theme="outlined"
                  type="button"
                  variant="secondary"
                >
                  Reset
                </Button>
              </div>
            </form>

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
                <div className="rounded-lg border border-black/10 bg-base p-4">
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
                <div className="rounded-lg border border-black/10 bg-base p-4">
                  <p className="text-sm text-fg-secondary">
                    Žiadny produkt nevyhovuje vybranému filtrovanému rozsahu.
                  </p>
                </div>
              )}

            {!categoriesQuery.isLoading &&
              !productsQuery.isLoading &&
              displayedProducts.length > 0 && (
                <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
                  {displayedProducts.map((product) => (
                    <HerbatikaProductCard
                      isAdding={
                        addLineItemMutation.isPending &&
                        activeProductId === product.id
                      }
                      key={product.id}
                      onAddToCart={handleAddToCart}
                      onProductHoverEnd={(hoveredProduct) => {
                        prefetchProduct.cancelPrefetch(
                          `plp-product-${hoveredProduct.id}`,
                        );
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
          </div>
        </div>
      </section>
    </main>
  );
}
