"use client"

import { CatalogListingShell } from "@/components/catalog-listing-shell"
import { CategoryFacetsPanel } from "@/components/category/category-facets-panel"
import { SORT_TAB_ITEMS } from "@/components/category/category-listing.constants"
import { CategoryResultsSection } from "@/components/category/category-results-section"
import { HerbatikaBreadcrumb } from "@/components/herbatika-breadcrumb"
import { RecentlyVisitedProductsSection } from "@/components/recently-visited-products-section"
import { PLP_PAGE_SIZE } from "@/lib/storefront/plp-query-state"
import { useBrandListingController } from "./use-brand-listing-controller"

type BrandListingProps = {
  brandFacetId: string
  brandTitle: string
}

export function BrandListing({ brandFacetId, brandTitle }: BrandListingProps) {
  const controller = useBrandListingController({ brandFacetId })

  return (
    <main className="mx-auto flex w-full max-w-max-w flex-col gap-brand-listing-page-gap p-brand-listing-page font-rubik 2xl:p-brand-listing-page-lg">
      <HerbatikaBreadcrumb
        items={[
          { label: "Domů", href: "/", icon: "token-icon-home" },
          { label: "Značky", href: "/znacka" },
          { label: brandTitle },
        ]}
      />

      <section>
        <h1 className="font-bold text-4xl text-fg-primary leading-snug">
          {brandTitle}
        </h1>
      </section>

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
            showBrandFilter={false}
            statusItems={controller.asideStatusItems}
          />
        }
        results={
          <CategoryResultsSection
            activeSort={controller.queryState.sort}
            addToCartError={controller.addToCartError}
            catalogError={controller.catalogError}
            categoriesError={null}
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
        }
      />

      <RecentlyVisitedProductsSection hideWhenEmpty />
    </main>
  )
}
