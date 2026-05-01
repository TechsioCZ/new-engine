"use client";

import { Badge } from "@techsio/ui-kit/atoms/badge";
import { CatalogListingShell } from "@/components/catalog-listing-shell";
import { CategoryFacetsPanel } from "@/components/category/category-facets-panel";
import { SORT_TAB_ITEMS } from "@/components/category/category-listing.constants";
import { CategoryResultsSection } from "@/components/category/category-results-section";
import { RecentlyVisitedProductsSection } from "@/components/recently-visited-products-section";
import { PLP_PAGE_SIZE } from "@/lib/storefront/plp-query-state";
import { useSearchListingController } from "./search/use-search-listing-controller";

export function StorefrontSearchResults() {
  const controller = useSearchListingController();
  const safeTotalPages = Math.max(controller.catalogQuery.totalPages, 1);

  return (
    <main className="mx-auto flex w-full max-w-max-w flex-col gap-600 px-400 py-500 font-rubik sm:p-600">
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
        <CatalogListingShell
          facets={
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
          }
          results={
            <CategoryResultsSection
              activeSort={controller.queryState.sort}
              addToCartError={controller.addToCartError}
              categoriesError={null}
              catalogError={controller.catalogError}
              isEmpty={controller.products.length === 0}
              isLoading={controller.isResultsLoading}
              isRefreshing={controller.isResultsRefreshing}
              isProductAdding={controller.isProductAdding}
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
          }
        />
      )}

      <RecentlyVisitedProductsSection hideWhenEmpty />
    </main>
  );
}
