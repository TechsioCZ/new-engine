"use client"
import { Button } from "@techsio/ui-kit/atoms/button"
import { Breadcrumb } from "@techsio/ui-kit/molecules/breadcrumb"
import { SelectTemplate } from "@techsio/ui-kit/templates/select"
import Link from "next/link"
import { Suspense, useMemo } from "react"
import { ErrorText } from "@/components/atoms/error-text"
import { ProductGridSkeleton } from "@/components/molecules/product-grid-skeleton"
import { ProductFilters } from "@/components/organisms/product-filters"
import { ProductGrid } from "@/components/organisms/product-grid"
import { useInfiniteProducts } from "@/hooks/use-infinite-products"
import { useRegions } from "@/hooks/use-region"
import {
  type ExtendedSortOption,
  useUrlFilters,
} from "@/hooks/use-url-filters"

const SORT_OPTIONS: Array<{ value: ExtendedSortOption; label: string }> = [
  { value: "newest", label: "NejnovÄ›jĹˇĂ­" },
  { value: "name-asc", label: "NĂˇzev: A-Z" },
  { value: "name-desc", label: "NĂˇzev: Z-A" },
]

function ProductsContent() {
  const { selectedRegion } = useRegions()
  const pageSize = 12
  const urlFilters = useUrlFilters()

  const productFilters = useMemo(
    () => ({
      categories: Array.from(urlFilters.filters.categories).sort() as string[],
      sizes: Array.from(urlFilters.filters.sizes).sort() as string[],
    }),
    [urlFilters.filters.categories, urlFilters.filters.sizes]
  )

  // Single data path: infinite products powers both pagination and "load more".
  const {
    products,
    isLoading,
    error,
    totalCount,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteProducts({
    pageRange: urlFilters.pageRange,
    limit: pageSize,
    filters: productFilters,
    sort: urlFilters.sortBy === "relevance" ? undefined : urlFilters.sortBy,
    q: urlFilters.searchQuery || undefined,
    region_id: selectedRegion?.id,
  })

  const currentPage = urlFilters.pageRange.end
  const hasSizeFilters = productFilters.sizes.length > 0
  const hasSizeFilterError = Boolean(error && hasSizeFilters)

  const clearSizeFilters = () => {
    urlFilters.setFilters({
      categories: new Set(urlFilters.filters.categories),
      sizes: new Set(),
    })
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-product-listing-header-margin">
        <Breadcrumb
          items={[
            { label: "DomĹŻ", href: "/" },
            { label: "Produkty", href: "/products" },
          ]}
          linkAs={Link}
        />
        <h1 className="mb-product-listing-title-margin font-product-listing-title text-product-listing-title">
          VĹˇechny produkty
        </h1>
      </div>
      <div className="sticky top-16 z-40 mb-4 sm:static lg:hidden">
        <ProductFilters
          filters={urlFilters.filters}
          onFiltersChange={urlFilters.setFilters}
        />
      </div>

      <div className="flex gap-8">
        <aside className="sticky top-20 hidden h-[calc(100vh-5rem)] w-64 flex-shrink-0 overflow-y-auto lg:block">
          <ProductFilters
            filters={urlFilters.filters}
            onFiltersChange={urlFilters.setFilters}
          />
        </aside>
        <main className="w-full flex-1">
          <div className="mb-6 flex items-center justify-between">
            <p className="text-gray-600 text-sm dark:text-gray-400">
              Zobrazeno {products.length} z {totalCount} produktĹŻ
            </p>
            <SelectTemplate
              className="max-w-64"
              items={SORT_OPTIONS}
              label="Ĺadit podle"
              onValueChange={(details) => {
                const value = details.value[0] as ExtendedSortOption | undefined
                if (value) {
                  urlFilters.setSortBy(value)
                }
              }}
              placeholder="Vybrat ĹazenĂ­"
              size="sm"
              value={[urlFilters.sortBy || "newest"]}
            />
          </div>
          {hasSizeFilterError && (
            <div className="mb-4 space-y-2 rounded-md border border-error bg-surface p-3">
              <ErrorText showIcon>
                Filtr velikosti je docasne nedostupny. Zkuste prosim jinou
                velikost nebo filtr vymazat.
              </ErrorText>
              <Button onClick={clearSizeFilters} size="sm" theme="borderless">
                Vymazat filtr velikosti
              </Button>
            </div>
          )}

          {isLoading ? (
            <ProductGridSkeleton numberOfItems={12} />
          ) : products.length > 0 ? (
            <div>
              <ProductGrid
                currentPage={currentPage}
                onPageChange={urlFilters.setPage}
                pageSize={pageSize}
                products={products}
                totalCount={totalCount}
              />
              {hasNextPage && (
                <div className="mt-8 flex justify-center">
                  <Button
                    disabled={isFetchingNextPage}
                    onClick={async () => {
                      // First fetch the next page data
                      await fetchNextPage()
                      // Then update URL without navigation
                      urlFilters.extendPageRange()
                    }}
                    size="sm"
                    variant="primary"
                  >
                    {isFetchingNextPage
                      ? `NaÄŤĂ­tĂˇnĂ­ dalĹˇĂ­ch ${pageSize}...`
                      : `NaÄŤĂ­st dalĹˇĂ­ch ${pageSize} produktĹŻ`}
                  </Button>
                </div>
              )}
            </div>
          ) : error ? (
            <div className="py-12 text-center">
              <ErrorText showIcon>
                Nepodarilo se nacist produkty. Obnovte prosim stranku.
              </ErrorText>
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="text-gray-500">Žádné produkty nenalezeny</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductGridSkeleton numberOfItems={12} />}>
      <ProductsContent />
    </Suspense>
  )
}
