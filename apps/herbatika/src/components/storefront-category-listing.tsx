"use client";

import { Breadcrumb } from "@techsio/ui-kit/molecules/breadcrumb";
import NextLink from "next/link";
import { CategoryFacetsPanel } from "@/components/category/category-facets-panel";
import { CategoryContextPanel } from "@/components/category/category-context-panel";
import { SORT_TAB_ITEMS } from "@/components/category/category-listing.constants";
import { normalizeCategoryName } from "@/components/category/category-product-utils";
import { CategoryResultsSection } from "@/components/category/category-results-section";
import { useCategoryListingController } from "@/components/category/use-category-listing-controller";
import { PRIMARY_NAV_ITEMS } from "@/components/header/herbatika-header.navigation";
import { PLP_PAGE_SIZE } from "@/lib/storefront/plp-query-state";

type StorefrontCategoryListingProps = {
  slug: string;
};

const humanizeCategorySlug = (value: string) => {
  return value
    .split("-")
    .filter(Boolean)
    .map((word, index) => {
      if (index > 0 && word.length <= 2) {
        return word.toLowerCase();
      }

      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
};

export function StorefrontCategoryListing({
  slug,
}: StorefrontCategoryListingProps) {
  const controller = useCategoryListingController({ slug });
  const hasResultProducts = controller.products.length > 0;
  const isResultsLoading =
    controller.categoriesQuery.isLoading ||
    (controller.catalogQuery.isLoading && !hasResultProducts);
  const isResultsRefreshing =
    controller.catalogQuery.isFetching &&
    (hasResultProducts || controller.catalogQuery.query.isPlaceholderData);
  const fallbackNavTitle =
    PRIMARY_NAV_ITEMS.find((item) => item.href === `/c/${slug}`)?.label ??
    humanizeCategorySlug(slug);
  const categoryTitle = normalizeCategoryName(
    controller.activeCategory?.name ?? fallbackNavTitle,
  );

  return (
    <main className="mx-auto flex w-full max-w-max-w flex-col gap-600 px-400 py-500 font-rubik sm:p-600">
      <Breadcrumb items={controller.breadcrumbItems} linkAs={NextLink} />

      <section>
        <h1 className="text-4xl font-bold leading-snug text-fg-primary">
          {categoryTitle}
        </h1>
      </section>

      <CategoryContextPanel
        imageTiles={controller.categoryContextImageTiles}
        introSegments={controller.categoryIntroSegments}
        introText={controller.categoryIntroText}
      />

      <section className="space-y-400">
        <div className="flex min-w-0 flex-col gap-600 xl:grid xl:grid-cols-12 xl:items-start">
          <div className="min-w-0 xl:col-span-3 xl:self-start xl:sticky xl:top-400">
            <CategoryFacetsPanel
              activeFilterCount={controller.activeAsideFilterCount}
              brandItems={controller.asideBrandItems}
              currencyCode={controller.productsCurrencyCode}
              formItems={controller.asideFormItems}
              ingredientItems={controller.asideIngredientItems}
              isLoading={controller.isFiltersLoading}
              onBrandToggle={controller.onBrandToggle}
              onFormToggle={controller.onFormToggle}
              onIngredientToggle={controller.onIngredientToggle}
              onPriceRangeCommit={controller.onPriceRangeCommit}
              onReset={controller.onResetFilters}
              onStatusToggle={controller.onStatusToggle}
              priceBounds={controller.priceBounds}
              selectedPriceRange={controller.selectedPriceRange}
              statusItems={controller.asideStatusItems}
            />
          </div>

          <CategoryResultsSection
            activeSort={controller.queryState.sort}
            addToCartError={controller.addToCartError}
            categoriesError={controller.categoriesError}
            catalogError={controller.catalogError}
            isEmpty={controller.products.length === 0}
            isLoading={isResultsLoading}
            isRefreshing={isResultsRefreshing}
            isProductAdding={controller.isProductAdding}
            onAddToCart={controller.onAddToCart}
            onPageChange={controller.onPageChange}
            onProductHoverEnd={controller.onProductHoverEnd}
            onProductHoverStart={controller.onProductHoverStart}
            onSortChange={controller.onSortChange}
            page={controller.page}
            pageSize={PLP_PAGE_SIZE}
            products={controller.products}
            showCategoryNotFound={controller.showCategoryNotFound}
            sortItems={SORT_TAB_ITEMS}
            totalCount={controller.catalogQuery.totalCount}
            totalPages={controller.catalogQuery.totalPages}
            totalProducts={controller.catalogQuery.totalCount}
          />
        </div>
      </section>
    </main>
  );
}
