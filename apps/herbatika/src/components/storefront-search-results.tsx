"use client";

import { Badge } from "@techsio/ui-kit/atoms/badge";
import { CategoryFacetsPanel } from "@/components/category/category-facets-panel";
import { SORT_TAB_ITEMS } from "@/components/category/category-listing.constants";
import { CategoryResultsSection } from "@/components/category/category-results-section";
import { useSearchListingController } from "./search/use-search-listing-controller";
import { PLP_PAGE_SIZE } from "@/lib/storefront/plp-query-state";

export function StorefrontSearchResults() {
  const controller = useSearchListingController();
  const safeTotalPages = Math.max(controller.catalogQuery.totalPages, 1);

  return (
    <main className="mx-auto flex w-full max-w-max-w flex-col gap-600 p-600 font-rubik">
      <section className="space-y-300">
        <h1 className="text-4xl font-bold leading-snug text-fg-primary">
          Vyhľadávanie
        </h1>
        <p className="text-sm text-fg-secondary">
          Vyhľadajte produkty v katalógu.
        </p>
      </section>

      {controller.query ? (
        <div className="flex flex-wrap items-center gap-200">
          <Badge variant="info">{`dotaz: ${controller.query}`}</Badge>
          <Badge variant="secondary">{`nájdené: ${controller.catalogQuery.totalCount}`}</Badge>
          <Badge variant="secondary">{`strana: ${controller.page}/${safeTotalPages}`}</Badge>
        </div>
      ) : null}

      {!controller.query ? (
        <section className="rounded-lg border border-border-secondary bg-base p-400">
          <p className="text-sm text-fg-secondary">
            Zadajte výraz do vyhľadávania v hornom paneli.
          </p>
        </section>
      ) : (
        <section className="space-y-400">
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
              categoriesError={null}
              catalogError={controller.catalogError}
              isEmpty={controller.products.length === 0}
              isLoading={controller.isResultsLoading}
              isProductAdding={controller.isProductAdding}
              onAddToCart={controller.onAddToCart}
              onPageChange={controller.onPageChange}
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
      )}
    </main>
  );
}
