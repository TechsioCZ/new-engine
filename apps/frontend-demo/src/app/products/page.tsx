"use client"

import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@techsio/ui-kit/atoms/button"
import { Breadcrumb } from "@techsio/ui-kit/molecules/breadcrumb"
import { SelectTemplate } from "@techsio/ui-kit/templates/select"
import Link from "next/link"
import { Suspense, useEffect, useRef } from "react"
import { ProductGridSkeleton } from "@/components/molecules/product-grid-skeleton"
import { ProductFilters } from "@/components/organisms/product-filters"
import { ProductGrid } from "@/components/organisms/product-grid"
import {
  buildInfiniteProductsQueryKey,
  useInfiniteProducts,
} from "@/hooks/use-infinite-products"
import { usePrefetchPages } from "@/hooks/use-prefetch-pages"
import { useRegions } from "@/hooks/use-region"
import {
  type ExtendedSortOption,
  type PageRange,
  useUrlFilters,
} from "@/hooks/use-url-filters"

const SORT_OPTIONS: Array<{ value: ExtendedSortOption; label: string }> = [
  { value: "newest", label: "Nejnovější" },
  { value: "name-asc", label: "Název: A-Z" },
  { value: "name-desc", label: "Název: Z-A" },
]

const cloneQueryData = <T,>(value: T): T => {
  if (typeof structuredClone === "function") {
    return structuredClone(value)
  }

  return JSON.parse(JSON.stringify(value)) as T
}

const isProductInfiniteQueryKey = (value: readonly unknown[]): boolean =>
  value[0] === "frontend-demo" &&
  value[1] === "products" &&
  value[2] === "infinite"

type PendingCacheCleanup =
  | {
      mode: "remove"
      queryKey: readonly unknown[]
    }
  | {
      mode: "restore"
      queryKey: readonly unknown[]
      snapshot: unknown
    }

function ProductsContent() {
  const queryClient = useQueryClient()
  const { selectedRegion } = useRegions()
  const selectedCountryCode = selectedRegion
    ? (selectedRegion.countries?.[0]?.iso_2 ?? "cz")
    : undefined
  const pageSize = 12
  const urlFilters = useUrlFilters()
  const pendingCleanupRef = useRef<PendingCacheCleanup | null>(null)

  const productFilters = {
    categories: Array.from(urlFilters.filters.categories) as string[],
    sizes: Array.from(urlFilters.filters.sizes) as string[],
  }

  const {
    products,
    isLoading,
    totalCount,
    queryKey,
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
    country_code: selectedCountryCode,
  })

  const currentPage = urlFilters.pageRange.end
  const totalPages = Math.ceil(totalCount / pageSize)
  const hasPrevPage = urlFilters.pageRange.start > 1

  useEffect(() => {
    const pendingCleanup = pendingCleanupRef.current
    if (!pendingCleanup) {
      return
    }

    if (JSON.stringify(queryKey) === JSON.stringify(pendingCleanup.queryKey)) {
      return
    }

    if (pendingCleanup.mode === "restore") {
      queryClient.setQueryData(pendingCleanup.queryKey, pendingCleanup.snapshot)
    } else {
      queryClient.removeQueries({
        queryKey: pendingCleanup.queryKey,
        exact: true,
      })
    }

    pendingCleanupRef.current = null
  }, [queryClient, queryKey])

  const handleLoadMore = async () => {
    const nextPageRange: PageRange = {
      start: urlFilters.pageRange.start,
      end: urlFilters.pageRange.end + 1,
      isRange: true,
    }
    const activeQueryKey =
      queryClient
        .getQueryCache()
        .getAll()
        .find(
          (query) =>
            query.getObserversCount() > 0 &&
            isProductInfiniteQueryKey(query.queryKey)
        )?.queryKey ?? queryKey
    const sourceQueryData = queryClient.getQueryData(activeQueryKey)
    const sourceQuerySnapshot =
      sourceQueryData !== undefined
        ? cloneQueryData(sourceQueryData)
        : undefined

    await fetchNextPage()

    const expandedQueryData = queryClient.getQueryData(activeQueryKey)
    if (expandedQueryData !== undefined) {
      const targetQueryKey = buildInfiniteProductsQueryKey({
        pageRange: nextPageRange,
        limit: pageSize,
        filters: productFilters,
        sort: urlFilters.sortBy === "relevance" ? undefined : urlFilters.sortBy,
        q: urlFilters.searchQuery || undefined,
        region_id: selectedRegion?.id,
        country_code: selectedCountryCode,
      })

      queryClient.setQueryData(
        targetQueryKey,
        cloneQueryData(expandedQueryData)
      )
    }

    if (urlFilters.pageRange.isRange && sourceQuerySnapshot !== undefined) {
      pendingCleanupRef.current = {
        mode: "restore",
        queryKey: activeQueryKey,
        snapshot: sourceQuerySnapshot,
      }
    } else if (!urlFilters.pageRange.isRange) {
      pendingCleanupRef.current = {
        mode: "remove",
        queryKey: activeQueryKey,
      }
    }

    urlFilters.extendPageRange()
  }

  usePrefetchPages({
    currentPage,
    hasNextPage,
    hasPrevPage,
    productsLength: products.length,
    pageSize,
    sortBy: urlFilters.sortBy,
    totalPages,
    regionId: selectedRegion?.id,
    searchQuery: urlFilters.searchQuery,
    filters: productFilters,
  })

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
