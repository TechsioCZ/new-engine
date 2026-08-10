"use client"

import { Badge } from "@techsio/ui-kit/atoms/badge"
import { useTranslations } from "next-intl"

import { CatalogListingShell } from "@/components/catalog-listing-shell"
import { CategoryFacetsPanel } from "@/components/category/category-facets-panel"
import { CategoryResultsSection } from "@/components/category/category-results-section"
import { RecentlyVisitedProductsSection } from "@/components/recently-visited-products-section"
import { PLP_PAGE_SIZE } from "@/lib/storefront/plp-query-state"

import { SearchEntityResults } from "./search/search-entity-results"
import { useSearchAutocomplete } from "./search/use-search-autocomplete"
import { useSearchListingController } from "./search/use-search-listing-controller"

export const SearchResults = () => {
  const t = useTranslations("search")
  const controller = useSearchListingController()
  const safeTotalPages = Math.max(controller.catalogQuery.totalPages, 1)
  const autocomplete = useSearchAutocomplete({
    ...(controller.searchCountryCode === undefined
      ? {}
      : { countryCode: controller.searchCountryCode }),
    currencyCode: controller.productsCurrencyCode,
    enabled: controller.isSearchQueryEnabled,
    query: controller.query,
    ...(controller.searchRegionId === undefined
      ? {}
      : { regionId: controller.searchRegionId }),
  })
  const handleAddToCart = controller.onAddToCart
  const handleBrandToggle = controller.onBrandToggle
  const handleFormToggle = controller.onFormToggle
  const handleIngredientToggle = controller.onIngredientToggle
  const handlePriceRangeCommit = controller.onPriceRangeCommit
  const handleProductHoverEnd = controller.onProductHoverEnd
  const handleProductHoverStart = controller.onProductHoverStart
  const handleResetFilters = controller.onResetFilters
  const handleSortChange = controller.onSortChange
  const handleStatusToggle = controller.onStatusToggle

  return (
    <main className="mx-auto flex w-full max-w-max-w flex-col gap-search-page-gap p-search-page font-rubik 2xl:p-search-page-lg">
      <section className="space-y-300">
        <h1 className="font-bold text-4xl text-fg-primary leading-snug">
          {t("results.title")}
        </h1>
        <p className="text-fg-secondary text-sm">{t("results.description")}</p>
      </section>

      {controller.query ? (
        <div className="flex flex-wrap items-center gap-200">
          <Badge variant="info">
            {t("results.query", { query: controller.query })}
          </Badge>
          <Badge variant="secondary">
            {t("results.found", {
              count: controller.catalogQuery.totalCount,
            })}
          </Badge>
          <Badge variant="secondary">
            {t("results.page", {
              page: controller.page,
              totalPages: safeTotalPages,
            })}
          </Badge>
        </div>
      ) : null}

      {controller.query ? (
        <>
          <SearchEntityResults
            brands={autocomplete.data.brands}
            brandsTitle={t("autocomplete.sections.brands")}
            categories={autocomplete.data.categories}
            categoriesTitle={t("autocomplete.sections.categories")}
            content={autocomplete.data.content}
            contentTitle={t("autocomplete.sections.content")}
            heading={t("results.related")}
          />

          <section className="space-y-300">
            <h2 className="font-bold text-2xl text-fg-primary">
              {t("autocomplete.sections.products")}
            </h2>
            <CatalogListingShell
              facets={
                <CategoryFacetsPanel
                  activeFilterCount={controller.activeAsideFilterCount}
                  brandItems={controller.asideBrandItems}
                  currencyCode={controller.productsCurrencyCode}
                  formItems={controller.asideFormItems}
                  ingredientItems={controller.asideIngredientItems}
                  isLoading={controller.isFiltersLoading}
                  onBrandToggle={handleBrandToggle}
                  onFormToggle={handleFormToggle}
                  onIngredientToggle={handleIngredientToggle}
                  onPriceRangeCommit={handlePriceRangeCommit}
                  onReset={handleResetFilters}
                  onStatusToggle={handleStatusToggle}
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
                  emptyMessage={t("results.empty", { query: controller.query })}
                  isEmpty={controller.products.length === 0}
                  isLoading={controller.isResultsLoading}
                  isProductAdding={controller.isProductAdding}
                  isRefreshing={controller.isResultsRefreshing}
                  layout="catalog"
                  onAddToCart={handleAddToCart}
                  onProductHoverEnd={handleProductHoverEnd}
                  onProductHoverStart={handleProductHoverStart}
                  onSortChange={handleSortChange}
                  page={controller.page}
                  pageSize={PLP_PAGE_SIZE}
                  products={controller.products}
                  showCategoryNotFound={false}
                  totalCount={controller.catalogQuery.totalCount}
                  totalPages={controller.catalogQuery.totalPages}
                  totalProducts={controller.catalogQuery.totalCount}
                />
              }
            />
          </section>
        </>
      ) : (
        <section className="rounded-lg border border-border-secondary bg-base p-400">
          <p className="text-fg-secondary text-sm">
            {t("results.enter_query")}
          </p>
        </section>
      )}

      <RecentlyVisitedProductsSection hideWhenEmpty />
    </main>
  )
}
