import type { HttpTypes } from "@medusajs/types"
import { Skeleton } from "@techsio/ui-kit/atoms/skeleton"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { Pagination } from "@techsio/ui-kit/molecules/pagination"
import NextLink from "next/link"
import { useTranslations } from "next-intl"
import type { ReactNode } from "react"
import {
  HerbatikaProductGrid,
  type HerbatikaProductGridLayout,
} from "@/components/product/herbatika-product-grid"
import { HerbatikaProductGridSkeleton } from "@/components/product/herbatika-product-grid-skeleton"
import type { ProductSortValue } from "@/lib/storefront/plp-query-state"
import { usePaginationUrlBuilder } from "@/lib/storefront/use-pagination-url-builder"
import { CategorySortTabs } from "./category-sort-tabs"

type CategoryResultsSectionProps = {
  activeSort: ProductSortValue
  categoriesError: unknown
  catalogError: unknown
  isEmpty: boolean
  isLoading: boolean
  isProductAdding: (productId: string) => boolean
  emptyMessage?: string
  onAddToCart: (product: HttpTypes.StoreProduct) => Promise<void>
  onProductHoverEnd: (product: HttpTypes.StoreProduct) => void
  onProductHoverStart: (product: HttpTypes.StoreProduct) => void
  onSortChange: (value: ProductSortValue) => void
  page: number
  pageSize: number
  products: HttpTypes.StoreProduct[]
  layout?: HerbatikaProductGridLayout
  loadingSkeleton?: ReactNode
  showCategoryNotFound: boolean
  totalCount: number
  totalPages: number
  totalProducts: number
  isRefreshing?: boolean
}

export function CategoryResultsSection({
  activeSort,
  categoriesError,
  catalogError,
  isEmpty,
  isLoading,
  isProductAdding,
  emptyMessage,
  onAddToCart,
  onProductHoverEnd,
  onProductHoverStart,
  onSortChange,
  page,
  pageSize,
  products,
  layout = "catalog",
  loadingSkeleton,
  showCategoryNotFound,
  totalCount,
  totalPages,
  totalProducts,
  isRefreshing = false,
}: CategoryResultsSectionProps) {
  const t = useTranslations("catalog")
  const getPageUrl = usePaginationUrlBuilder()
  const resolvedEmptyMessage = emptyMessage ?? t("results.empty_category")
  const resolvedLoadingSkeleton = loadingSkeleton ?? (
    <HerbatikaProductGridSkeleton layout={layout} />
  )
  const shouldShowInitialSkeleton = isLoading && products.length === 0
  const shouldShowProductsGrid = !showCategoryNotFound && products.length > 0

  return (
    <div className="min-w-0 space-y-400 xl:col-span-9">
      <CategorySortTabs
        activeSort={activeSort}
        onSortChange={onSortChange}
        totalProducts={totalProducts}
      />

      {isRefreshing ? (
        <Skeleton.Rectangle className="h-100 rounded-full" speed="fast" />
      ) : null}

      {categoriesError ? (
        <StatusText showIcon status="error">
          {t("errors.categories_load_failed")}
        </StatusText>
      ) : null}
      {catalogError ? (
        <StatusText showIcon status="error">
          {t("errors.products_load_failed")}
        </StatusText>
      ) : null}
      {showCategoryNotFound && (
        <StatusText showIcon status="error">
          {t("results.category_not_found")}
        </StatusText>
      )}

      {shouldShowInitialSkeleton && resolvedLoadingSkeleton}

      {!(isLoading || showCategoryNotFound) && isEmpty && (
        <div className="rounded-lg border border-border-secondary bg-base p-400">
          <p className="text-fg-secondary text-sm">{resolvedEmptyMessage}</p>
        </div>
      )}

      {shouldShowProductsGrid && (
        <HerbatikaProductGrid
          isProductAdding={(product) => isProductAdding(product.id)}
          keyPrefix={`${layout}-product`}
          layout={layout}
          onAddToCart={onAddToCart}
          onProductHoverEnd={onProductHoverEnd}
          onProductHoverStart={onProductHoverStart}
          products={products}
        />
      )}

      {totalPages > 1 && (
        <Pagination
          count={totalCount}
          getPageUrl={getPageUrl}
          linkAs={NextLink}
          page={page}
          pageSize={pageSize}
          size="sm"
          variant="outlined"
        />
      )}
    </div>
  )
}
