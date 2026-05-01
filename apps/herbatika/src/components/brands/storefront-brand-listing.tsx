"use client";

import { CategoryFacetsPanel } from "@/components/category/category-facets-panel";
import { CategoryResultsSection } from "@/components/category/category-results-section";
import { SORT_TAB_ITEMS } from "@/components/category/category-listing.constants";
import { HerbatikaBreadcrumb } from "@/components/herbatika-breadcrumb";
import { PLP_PAGE_SIZE } from "@/lib/storefront/plp-query-state";
import { useBrandListingController } from "./use-brand-listing-controller";

type StorefrontBrandListingProps = {
  brandFacetId: string;
  brandTitle: string;
};

export function StorefrontBrandListing({
  brandFacetId,
  brandTitle,
}: StorefrontBrandListingProps) {
  const controller = useBrandListingController({ brandFacetId });

  return (
    <main className="mx-auto flex w-full max-w-max-w flex-col gap-600 px-400 py-500 font-rubik sm:p-600">
      <HerbatikaBreadcrumb
        items={[
          { label: "Domů", href: "/", icon: "token-icon-home" },
          { label: "Značky", href: "/znacka" },
          { label: brandTitle },
        ]}
      />

      <section>
        <h1 className="text-4xl font-bold leading-snug text-fg-primary">
          {brandTitle}
        </h1>
      </section>

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
              showBrandFilter={false}
              statusItems={controller.asideStatusItems}
            />
          </div>

          <CategoryResultsSection
            activeSort={controller.queryState.sort}
            addToCartError={controller.addToCartError}
            categoriesError={null}
            catalogError={controller.catalogError}
            emptyMessage="Táto značka zatiaľ nemá dostupné produkty pre zvolený filter."
            isEmpty={controller.products.length === 0}
            isLoading={controller.isResultsLoading}
            isProductAdding={controller.isProductAdding}
            isRefreshing={controller.isResultsRefreshing}
            layout="catalog"
            onAddToCart={controller.onAddToCart}
            onProductHoverEnd={controller.onProductHoverEnd}
            onProductHoverStart={controller.onProductHoverStart}
            onSortChange={controller.onSortChange}
            page={controller.page}
            pageSize={PLP_PAGE_SIZE}
            products={controller.products}
            showCategoryNotFound={false}
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
