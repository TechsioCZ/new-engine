"use client";

import { Breadcrumb } from "@techsio/ui-kit/molecules/breadcrumb";
import NextLink from "next/link";
import {
  CategoryContextPanel,
} from "@/components/category/category-context-panel";
import { CategoryFacetsPanel } from "@/components/category/category-facets-panel";
import { CategoryHeader } from "@/components/category/category-header";
import { SORT_TAB_ITEMS } from "@/components/category/category-listing.constants";
import { normalizeCategoryName } from "@/components/category/category-product-utils";
import { CategoryResultsSection } from "@/components/category/category-results-section";
import { CategoryTopLevelLinks } from "@/components/category/category-top-level-links";
import { useCategoryListingController } from "@/components/category/use-category-listing-controller";
import { PLP_PAGE_SIZE } from "@/lib/storefront/plp-query-state";

type StorefrontCategoryListingProps = {
  slug: string;
};

export function StorefrontCategoryListing({
  slug,
}: StorefrontCategoryListingProps) {
  const controller = useCategoryListingController({ slug });
  const isResultsLoading =
    controller.categoriesQuery.isLoading || controller.catalogQuery.isLoading;

  return (
    <main className="mx-auto flex w-full max-w-max-w flex-col gap-600 p-600">
      <Breadcrumb items={controller.breadcrumbItems} linkAs={NextLink} />

      <section className="space-y-400 rounded-xl border border-border-secondary bg-surface p-600">
        <CategoryHeader
          activeAsideFilterCount={controller.activeAsideFilterCount}
          categoryFound={Boolean(controller.activeCategory)}
          categorySubtitle={controller.categorySubtitle}
          displayedProductsCount={controller.catalogQuery.totalCount}
          title={normalizeCategoryName(controller.activeCategory?.name ?? slug)}
          totalProducts={controller.catalogQuery.totalCount}
        />

        <CategoryTopLevelLinks
          activeCategoryHandle={controller.activeCategory?.handle ?? null}
          getCategoryLabel={(category) => normalizeCategoryName(category.name)}
          onCategoryBlur={controller.onCategoryBlur}
          onCategoryFocus={controller.onCategoryFocus}
          onCategoryMouseEnter={controller.onCategoryMouseEnter}
          onCategoryMouseLeave={controller.onCategoryMouseLeave}
          topLevelCategories={controller.topLevelCategories}
        />
      </section>

      <CategoryContextPanel
        introText={controller.categoryIntroText}
        tiles={controller.categoryContextTiles}
      />

      <section className="space-y-400 rounded-xl border border-border-secondary bg-surface p-600">
        <div className="grid gap-600 xl:grid-cols-12">
          <div className="xl:col-span-3">
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
