"use client"

import { CatalogListingShell } from "@/components/catalog-listing-shell"
import { CategoryContextPanel } from "@/components/category/category-context-panel"
import { CategoryFacetsPanel } from "@/components/category/category-facets-panel"
import { SORT_TAB_ITEMS } from "@/components/category/category-listing.constants"
import { normalizeCategoryName } from "@/components/category/category-product-utils"
import { CategoryResultsSection } from "@/components/category/category-results-section"
import { CategoryRichText } from "@/components/category/category-rich-text"
import { useCategoryListingController } from "@/components/category/use-category-listing-controller"
import { PRIMARY_NAV_ITEMS } from "@/components/header/herbatika-header.navigation"
import { HerbatikaBreadcrumb } from "@/components/herbatika-breadcrumb"
import { RecentlyVisitedProductsSection } from "@/components/recently-visited-products-section"
import { PLP_PAGE_SIZE } from "@/lib/storefront/plp-query-state"

type CategoryListingProps = {
  slug: string
}

const humanizeCategorySlug = (value: string) =>
  value
    .split("-")
    .filter(Boolean)
    .map((word, index) => {
      if (index > 0 && word.length <= 2) {
        return word.toLowerCase()
      }

      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(" ")

export function CategoryListing({ slug }: CategoryListingProps) {
  const controller = useCategoryListingController({ slug })
  const hasResultProducts = controller.products.length > 0
  const isResultsLoading =
    controller.categoriesQuery.isLoading ||
    (controller.catalogQuery.isLoading && !hasResultProducts)
  const isResultsRefreshing =
    controller.catalogQuery.isFetching &&
    (hasResultProducts || controller.catalogQuery.query.isPlaceholderData)
  const fallbackNavTitle =
    PRIMARY_NAV_ITEMS.find((item) => item.href === `/c/${slug}`)?.label ??
    humanizeCategorySlug(slug)
  const categoryTitle = normalizeCategoryName(
    controller.activeCategory?.name ?? fallbackNavTitle
  )

  return (
    <main className="mx-auto flex w-full max-w-max-w flex-col gap-category-page-gap p-category-page font-rubik 2xl:p-category-page-lg">
      <HerbatikaBreadcrumb items={controller.breadcrumbItems} />

      <section>
        <h1 className="font-bold text-4xl text-fg-primary leading-snug">
          {categoryTitle}
        </h1>
      </section>

      <CategoryContextPanel
        imageTiles={controller.categoryContextImageTiles}
        introHtml={controller.categoryIntroHtml}
        introText={controller.categoryIntroText}
      />

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
            categoriesError={controller.categoriesError}
            isEmpty={controller.products.length === 0}
            isLoading={isResultsLoading}
            isProductAdding={controller.isProductAdding}
            isRefreshing={isResultsRefreshing}
            onAddToCart={controller.onAddToCart}
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
        }
      />

      <CategoryRichText
        className="rounded-2xl bg-surface p-500"
        html={controller.categoryBottomHtml}
      />

      <RecentlyVisitedProductsSection hideWhenEmpty />
    </main>
  )
}
