"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { Breadcrumb } from "@techsio/ui-kit/molecules/breadcrumb"
import { SelectTemplate } from "@techsio/ui-kit/templates/select"
import Link from "next/link"
import { Suspense, useMemo } from "react"
import { ProductGridSkeleton } from "@/components/molecules/product-grid-skeleton"
import { ProductFilters } from "@/components/organisms/product-filters"
import { ProductGrid } from "@/components/organisms/product-grid"
import { useInfiniteProducts } from "@/hooks/use-infinite-products"
import { usePrefetchPages } from "@/hooks/use-prefetch-pages"
import { useRegions } from "@/hooks/use-region"
import { type ExtendedSortOption, useUrlFilters } from "@/hooks/use-url-filters"

const SORT_OPTIONS: Array<{ value: ExtendedSortOption; label: string }> = [
  { value: "newest", label: "Nejnovější" },
  { value: "name-asc", label: "Název: A-Z" },
  { value: "name-desc", label: "Název: Z-A" },
]

function ProductsContent() {
  const { selectedRegion } = useRegions()
  const selectedCountryCode = selectedRegion
    ? (selectedRegion.countries?.[0]?.iso_2 ?? "cz")
    : undefined
  const pageSize = 12
  const urlFilters = useUrlFilters()

  const productFilters = useMemo(
    () => ({
      categories: Array.from(urlFilters.filters.categories) as string[],
      sizes: Array.from(urlFilters.filters.sizes) as string[],
    }),
    [urlFilters.filters.categories, urlFilters.filters.sizes]
  )

  const infiniteProductsParams = useMemo(
    () => ({
      pageRange: urlFilters.pageRange,
      limit: pageSize,
      filters: productFilters,
      sort: urlFilters.sortBy === "relevance" ? undefined : urlFilters.sortBy,
      q: urlFilters.searchQuery || undefined,
      region_id: selectedRegion?.id,
      country_code: selectedCountryCode,
    }),
    [
      productFilters,
      selectedCountryCode,
      selectedRegion?.id,
      urlFilters.pageRange,
      urlFilters.searchQuery,
      urlFilters.sortBy,
    ]
  )

  const {
    products,
    isLoading,
    totalCount,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteProducts(infiniteProductsParams)
  const totalPages = Math.ceil(totalCount / pageSize)
  const currentPage = urlFilters.pageRange.end

  usePrefetchPages({
    enabled: Boolean(selectedRegion?.id) && totalPages > 1,
    currentPage,
    totalPages,
    limit: pageSize,
    filters: productFilters,
    sort: urlFilters.sortBy === "relevance" ? undefined : urlFilters.sortBy,
    q: urlFilters.searchQuery || undefined,
    region_id: selectedRegion?.id,
    country_code: selectedCountryCode,
  })

  const handleLoadMore = async () => {
    await fetchNextPage()
    urlFilters.extendPageRange()
  }

  let productsContent = (
    <div className="py-12 text-center">
      <p className="text-gray-500">Žádné produkty nenalezeny</p>
    </div>
  )

  if (isLoading) {
    productsContent = <ProductGridSkeleton numberOfItems={12} />
  } else if (products.length > 0) {
    productsContent = (
      <div>
        <ProductGrid
          currentPage={currentPage}
          onPageChange={urlFilters.setPage}
          pageSize={pageSize}
          products={products}
          totalCount={totalCount}
        />
        <div className="mt-8 flex justify-center">
          <Button
            disabled={!hasNextPage || isFetchingNextPage}
            onClick={handleLoadMore}
            size="sm"
            variant="primary"
          >
            {isFetchingNextPage
              ? `Načítání dalších ${pageSize}...`
              : `Načíst dalších ${pageSize} produktů`}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-product-listing-header-margin">
        <Breadcrumb
          items={[
            { label: "Domů", href: "/" },
            { label: "Produkty", href: "/products" },
          ]}
          linkAs={Link}
        />
        <h1 className="mb-product-listing-title-margin font-product-listing-title text-product-listing-title">
          Všechny produkty
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
              Zobrazeno {products.length} z {totalCount} produktů
            </p>
            <SelectTemplate
              className="max-w-64"
              items={SORT_OPTIONS}
              label="Řadit podle"
              onValueChange={(details) => {
                const value = details.value[0] as ExtendedSortOption | undefined
                if (value) {
                  urlFilters.setSortBy(value)
                }
              }}
              placeholder="Vybrat řazení"
              size="sm"
              value={[urlFilters.sortBy || "newest"]}
            />
          </div>

          {productsContent}
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
