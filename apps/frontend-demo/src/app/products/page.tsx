"use client"
import { Button } from "@techsio/ui-kit/atoms/button"
import type { PaginationGetPageUrl } from "@techsio/ui-kit/molecules/pagination"
import { BreadcrumbTemplate } from "@techsio/ui-kit/templates/breadcrumb"
import { SelectTemplate } from "@techsio/ui-kit/templates/select"
import Link from "next/link"
import { Suspense, useEffect, useRef } from "react"

import { ProductGridSkeleton } from "@/components/molecules/product-grid-skeleton"
import { ProductFilters } from "@/components/organisms/product-filters"
import { ProductGrid } from "@/components/organisms/product-grid"
import { useInfiniteProducts } from "@/hooks/use-infinite-products"
import { usePrefetchPages } from "@/hooks/use-prefetch-pages"
import { useProducts } from "@/hooks/use-products"
import { useRegions } from "@/hooks/use-region"
import { useUrlFilters } from "@/hooks/use-url-filters"
import type { ExtendedSortOption } from "@/hooks/use-url-filters"
import type { Product } from "@/types/product"

const SORT_OPTIONS: { value: ExtendedSortOption; label: string }[] = [
  { label: "Nejnovější", value: "newest" },
  { label: "Název: A-Z", value: "name-asc" },
  { label: "Název: Z-A", value: "name-desc" },
]

const isExtendedSortOption = (value: unknown): value is ExtendedSortOption => {
  switch (value) {
    case "name-asc":
    case "name-desc":
    case "newest":
    case "relevance": {
      return true
    }
    default: {
      return false
    }
  }
}

interface ProductResultsProps {
  currentPage: number
  hasNextPage: boolean
  isFetchingNextPage: boolean
  isLoading: boolean
  onLoadMore: () => void
  pageSize: number
  products: Product[]
  totalCount: number
  getPageUrl: PaginationGetPageUrl
}

const ProductResults = ({
  currentPage,
  getPageUrl,
  hasNextPage,
  isFetchingNextPage,
  isLoading,
  onLoadMore,
  pageSize,
  products,
  totalCount,
}: ProductResultsProps) => {
  if (isLoading) {
    return <ProductGridSkeleton numberOfItems={12} />
  }

  if (products.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">Žádné produkty nenalezeny</p>
      </div>
    )
  }

  return (
    <div>
      <ProductGrid
        currentPage={currentPage}
        getPageUrl={getPageUrl}
        pageSize={pageSize}
        products={products}
        totalCount={totalCount}
      />
      <div className="mt-8 flex justify-center">
        <Button
          disabled={!hasNextPage || isFetchingNextPage}
          onClick={onLoadMore}
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

const ProductsContent = () => {
  const { selectedRegion } = useRegions()
  const pageSize = 12
  const previousPageRef = useRef(1)

  const urlFilters = useUrlFilters()

  const productFilters = {
    categories: [...urlFilters.filters.categories] as string[],
    sizes: [...urlFilters.filters.sizes] as string[],
  }

  // Use infinite products for load more functionality
  const {
    products: infiniteProducts,
    isLoading: infiniteLoading,
    totalCount: infiniteTotalCount,
    hasNextPage: infiniteHasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch: refetchInfinite,
  } = useInfiniteProducts({
    filters: productFilters,
    limit: pageSize,
    pageRange: urlFilters.pageRange,
    q: urlFilters.searchQuery.length === 0 ? undefined : urlFilters.searchQuery,
    region_id: selectedRegion?.id,
    sort: urlFilters.sortBy === "relevance" ? undefined : urlFilters.sortBy,
  })

  // Fallback to regular products hook for pagination compatibility
  // Only enable when NOT in range mode to avoid duplicate queries
  const {
    products: regularProducts,
    isLoading: regularLoading,
    totalCount: regularTotalCount,
    currentPage: regularCurrentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
  } = useProducts({
    // Disable when in range mode.
    enabled: !urlFilters.pageRange.isRange,
    filters: productFilters,
    limit: pageSize,
    page: urlFilters.page,
    q: urlFilters.searchQuery.length === 0 ? undefined : urlFilters.searchQuery,
    region_id: selectedRegion?.id,
    sort: urlFilters.sortBy === "relevance" ? undefined : urlFilters.sortBy,
  })

  // Detect page range change and reset infinite query when switching between single/range modes
  useEffect(() => {
    const currentPageStart = urlFilters.pageRange.start
    if (currentPageStart !== previousPageRef.current) {
      refetchInfinite()
      previousPageRef.current = currentPageStart
    }
  }, [urlFilters.pageRange.start, refetchInfinite])

  // Use infinite products if we have a range or loaded additional pages
  const shouldUseInfiniteData =
    urlFilters.pageRange.isRange ||
    (urlFilters.pageRange.start === 1 && infiniteProducts.length > pageSize)
  const products = shouldUseInfiniteData ? infiniteProducts : regularProducts
  const isLoading = shouldUseInfiniteData ? infiniteLoading : regularLoading
  const totalCount = shouldUseInfiniteData
    ? infiniteTotalCount
    : regularTotalCount

  // Fix: Use the end of the range for current page when using infinite data
  const currentPage = shouldUseInfiniteData
    ? urlFilters.pageRange.end
    : regularCurrentPage

  // Calculate pagination values based on active data source
  const calculatedTotalPages = Math.ceil(totalCount / pageSize)
  const effectiveTotalPages = shouldUseInfiniteData
    ? calculatedTotalPages
    : totalPages
  const effectiveHasNextPage = shouldUseInfiniteData
    ? infiniteHasNextPage
    : hasNextPage
  const effectiveHasPrevPage = shouldUseInfiniteData
    ? urlFilters.pageRange.start > 1
    : hasPrevPage

  // Use prefetch hook for page prefetching
  usePrefetchPages({
    currentPage,
    filters: productFilters,
    hasNextPage: effectiveHasNextPage,
    hasPrevPage: effectiveHasPrevPage,
    pageSize,
    productsLength: products.length,
    regionId: selectedRegion?.id,
    searchQuery: urlFilters.searchQuery,
    sortBy: urlFilters.sortBy,
    totalPages: effectiveTotalPages,
  })

  const handleFiltersChange = urlFilters.setFilters
  const loadMore = async () => {
    try {
      await fetchNextPage()
      urlFilters.extendPageRange()
    } catch (error: unknown) {
      console.error("Loading more products failed:", error)
    }
  }

  const handleLoadMore = () => {
    void loadMore()
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-product-listing-header-margin">
        <BreadcrumbTemplate
          items={[
            { href: "/", label: "Domů" },
            { href: "/products", label: "Produkty" },
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
          onFiltersChange={handleFiltersChange}
        />
      </div>

      <div className="flex gap-8">
        <aside className="sticky top-20 hidden h-[calc(100vh-5rem)] w-64 flex-shrink-0 overflow-y-auto lg:block">
          <ProductFilters
            filters={urlFilters.filters}
            onFiltersChange={handleFiltersChange}
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
                const value: unknown = details.value[0]
                if (isExtendedSortOption(value)) {
                  urlFilters.setSortBy(value)
                }
              }}
              placeholder="Vybrat Řazení"
              size="sm"
              value={[urlFilters.sortBy]}
            />
          </div>

          <ProductResults
            currentPage={currentPage}
            getPageUrl={urlFilters.getPageUrl}
            hasNextPage={infiniteHasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            isLoading={isLoading}
            onLoadMore={handleLoadMore}
            pageSize={pageSize}
            products={products}
            totalCount={totalCount}
          />
        </main>
      </div>
    </div>
  )
}

const ProductsPage = () => (
  <Suspense fallback={<ProductGridSkeleton numberOfItems={12} />}>
    <ProductsContent />
  </Suspense>
)

export default ProductsPage
