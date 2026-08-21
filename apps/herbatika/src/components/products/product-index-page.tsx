"use client"

import { CatalogListingShell } from "@/components/catalog-listing-shell"
import { CategoryFacetsPanel } from "@/components/category/category-facets-panel"
import { CategoryResultsSection } from "@/components/category/category-results-section"
import { PRODUCT_INDEX_TITLE } from "@/components/products/product-index-title"
import { RecentlyVisitedProductsSection } from "@/components/recently-visited-products-section"
import { useSearchListingController } from "@/components/search/use-search-listing-controller"
import { useMarketContext } from "@/lib/storefront/market-context-provider"
import { PLP_PAGE_SIZE } from "@/lib/storefront/plp-query-state"

type ProductIndexPageProps = Readonly<{
  productPublicSlugsById: Readonly<Record<string, string>>
}>

export function ProductIndexPage({
  productPublicSlugsById,
}: ProductIndexPageProps) {
  const market = useMarketContext().code
  const controller = useSearchListingController({ requireQuery: false })

  return (
    <main className="mx-auto flex w-full max-w-max-w flex-col gap-search-page-gap p-search-page font-rubik 2xl:p-search-page-lg">
      <h1 className="font-bold text-4xl text-fg-primary leading-snug">
        {PRODUCT_INDEX_TITLE[market]}
      </h1>
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
            catalogError={controller.catalogQuery.error}
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
            productPublicSlugsById={productPublicSlugsById}
            products={controller.products}
            showCategoryNotFound={false}
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
