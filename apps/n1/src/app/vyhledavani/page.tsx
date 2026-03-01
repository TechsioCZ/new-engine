"use client"

import { Breadcrumb } from "@techsio/ui-kit/molecules/breadcrumb"
import NextLink from "next/link"
import { Banner } from "@/components/atoms/banner"
import { Heading } from "@/components/heading"
import { ProductGrid } from "@/components/molecules/product-grid"
import { N1Aside } from "@/components/n1-aside"
import { categoryMap, categoryTree } from "@/data/static/categories"
import { useProducts } from "@/hooks/use-products"
import { useSearchUrlState } from "@/hooks/use-search-url-state"
import { ALL_CATEGORIES_MAP_BY_ID, PRODUCT_LIMIT } from "@/lib/constants"
import { SEARCH_ROUTE } from "@/lib/url-state/search"
import { transformProduct } from "@/utils/transform/transform-product"

export default function SearchPage() {
  const {
    query,
    page: currentPage,
    categoryId: selectedCategoryId,
    setPage,
    setCategory,
    clearCategory,
  } = useSearchUrlState()
  const selectedCategoryIds = selectedCategoryId
    ? (ALL_CATEGORIES_MAP_BY_ID[selectedCategoryId] ?? [selectedCategoryId])
    : []
  const selectedCategory = selectedCategoryId
    ? categoryMap[selectedCategoryId]
    : undefined
  const hasCategoryFilter = selectedCategoryIds.length > 0
  const hasSearchIntent = query.length > 0 || hasCategoryFilter

  const {
    products: rawProducts,
    totalCount,
    isLoading,
    isFetching,
    error,
  } = useProducts({
    category_id: selectedCategoryIds,
    q: query,
    page: currentPage,
    limit: PRODUCT_LIMIT,
    skipIfEmptyQuery: true,
  })

  const products = rawProducts.map(transformProduct)
  const isInitialSearchLoading =
    hasSearchIntent &&
    !error &&
    (isLoading || (isFetching && rawProducts.length === 0 && totalCount === 0))

  const handlePageChange = (page: number) => {
    if (!hasSearchIntent) {
      return
    }

    setPage(page)
  }

  return (
    <div className="relative grid grid-cols-[auto_minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] p-400">
      <header className="col-span-2 row-span-1">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Vyhledávání", href: SEARCH_ROUTE },
          ]}
          linkAs={NextLink}
          size="lg"
        />
      </header>

      <N1Aside
        categoryMap={categoryMap}
        categories={categoryTree}
        currentCategory={selectedCategory}
        label="Kategorie"
        onCategorySelect={(nextCategory) => setCategory(nextCategory.id)}
      />

      <main className="px-300">
        <header className="space-y-300">
          <Heading as="h1">Výsledky vyhledávání</Heading>
          {query ? (
            <p className="text-fg-secondary text-sm">
              Dotaz: <span className="font-semibold">{query}</span>
            </p>
          ) : hasCategoryFilter ? (
            <p className="text-fg-secondary text-sm">
              Výsledky pro vybranou kategorii bez textového dotazu.
            </p>
          ) : (
            <p className="text-fg-secondary text-sm">
              Zadej vyhledávací dotaz v headeru.
            </p>
          )}
          {hasCategoryFilter ? (
            <div className="flex items-center gap-200">
              <p className="text-fg-secondary text-sm">
                Kategorie:{" "}
                <span className="font-semibold">
                  {selectedCategory?.name || selectedCategoryId}
                </span>
              </p>
              <button
                className="cursor-pointer text-sm text-primary underline"
                onClick={clearCategory}
                type="button"
              >
                Zrušit filtr
              </button>
            </div>
          ) : null}
        </header>

        {hasSearchIntent ? (
          <Banner className="my-300" variant="warning">
            <div className="flex items-center gap-100">
              {isInitialSearchLoading ? (
                <span>Vyhledávám produkty...</span>
              ) : (
                <>
                  <span>Nalezeno</span>
                  <span className="font-bold">{totalCount}</span>
                  <span>produktů</span>
                  {isFetching ? (
                    <span className="text-fg-secondary text-xs">
                      (aktualizuji...)
                    </span>
                  ) : null}
                </>
              )}
            </div>
          </Banner>
        ) : null}

        {error ? (
          <div
            className="my-300 rounded-lg border border-danger bg-danger/10 p-300 text-sm"
            role="alert"
          >
            Nepodařilo se načíst výsledky: {error}
          </div>
        ) : null}

        <section>
          {hasSearchIntent && !error ? (
            <ProductGrid
              currentPage={currentPage}
              isLoading={isInitialSearchLoading}
              onPageChange={handlePageChange}
              pageSize={PRODUCT_LIMIT}
              products={products}
              skeletonCount={24}
              totalCount={totalCount}
            />
          ) : null}
        </section>
      </main>
    </div>
  )
}
