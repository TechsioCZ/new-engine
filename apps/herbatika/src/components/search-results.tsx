"use client"

import { Badge } from "@techsio/ui-kit/atoms/badge"
import { useTranslations } from "next-intl"
import { CatalogListingShell } from "@/components/catalog-listing-shell"
import { CategoryFacetsPanel } from "@/components/category/category-facets-panel"
import { CategoryResultsSection } from "@/components/category/category-results-section"
import { RecentlyVisitedProductsSection } from "@/components/recently-visited-products-section"
import { useMarketContext } from "@/lib/storefront/market-context-provider"
import { PLP_PAGE_SIZE } from "@/lib/storefront/plp-query-state"
import { buildPath } from "@/lib/url/public-url"
import { SearchEntityResults } from "./search/search-entity-results"
import { useSearchAutocomplete } from "./search/use-search-autocomplete"
import { useSearchListingController } from "./search/use-search-listing-controller"

type SearchResultsProps = {
  productPublicSlugsById?: Readonly<Record<string, string>>
}

export function SearchResults({ productPublicSlugsById }: SearchResultsProps) {
  const t = useTranslations("search")
  const { code: market } = useMarketContext()
  const controller = useSearchListingController({
    productPublicSlugsById,
    refreshServerDataOnQueryChange: true,
  })
  const safeTotalPages = Math.max(controller.catalogQuery.totalPages, 1)
  const autocomplete = useSearchAutocomplete({
    countryCode: controller.searchCountryCode,
    query: controller.query,
    currencyCode: controller.productsCurrencyCode,
    enabled: controller.isSearchQueryEnabled,
    productPublicSlugsById,
    regionId: controller.searchRegionId,
  })

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
            categories={autocomplete.data.categories}
            content={autocomplete.data.content}
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
                  emptyMessage={t("results.empty", { query: controller.query })}
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
                  paginationBasePath={buildPath({ kind: "search" }, market)}
                  productPublicSlugsById={controller.productPublicSlugsById}
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
