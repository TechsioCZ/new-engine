"use client"

import { Badge } from "@techsio/ui-kit/atoms/badge"
import { CatalogListingShell } from "@/components/catalog-listing-shell"
import { CategoryFacetsPanel } from "@/components/category/category-facets-panel"
import { SORT_TAB_ITEMS } from "@/components/category/category-listing.constants"
import { CategoryResultsSection } from "@/components/category/category-results-section"
import { RecentlyVisitedProductsSection } from "@/components/recently-visited-products-section"
import { PLP_PAGE_SIZE } from "@/lib/storefront/plp-query-state"
import { useSearchListingController } from "./search/use-search-listing-controller"

export function SearchResults() {
  const controller = useSearchListingController()
  const safeTotalPages = Math.max(controller.catalogQuery.totalPages, 1)

  return (
    <main className="mx-auto flex w-full max-w-max-w flex-col gap-search-page-gap p-search-page font-rubik 2xl:p-search-page-lg">
      <section className="space-y-300">
        <h1 className="font-bold text-4xl text-fg-primary leading-snug">
          Vyhľadávanie
        </h1>
        <p className="text-fg-secondary text-sm">
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

      {controller.query ? (
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
              catalogError={controller.catalogError}
              categoriesError={null}
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
          }
        />
      ) : (
        <section className="rounded-lg border border-border-secondary bg-base p-400">
          <p className="text-fg-secondary text-sm">
            Zadajte výraz do vyhľadávania v hornom paneli.
          </p>
        </section>
      )}

      <RecentlyVisitedProductsSection hideWhenEmpty />
    </main>
  )
}
