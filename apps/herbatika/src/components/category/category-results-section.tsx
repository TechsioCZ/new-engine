import type { HttpTypes } from "@medusajs/types";
import { Skeleton } from "@techsio/ui-kit/atoms/skeleton";
import { Pagination } from "@techsio/ui-kit/molecules/pagination";
import { StatusText } from "@techsio/ui-kit/atoms/status-text";
import type { ReactNode } from "react";
import {
  HerbatikaProductGrid,
  type HerbatikaProductGridLayout,
} from "@/components/product/herbatika-product-grid";
import type { ProductSortValue } from "@/lib/storefront/plp-query-state";
import { CategorySortTabs } from "./category-sort-tabs";
import { ProductGridSkeleton } from "./product-grid-skeleton";

type CategoryResultsSectionProps = {
  activeSort: ProductSortValue;
  addToCartError: string | null;
  categoriesError: string | null;
  catalogError: string | null;
  isEmpty: boolean;
  isLoading: boolean;
  isProductAdding: (productId: string) => boolean;
  onAddToCart: (product: HttpTypes.StoreProduct) => Promise<void>;
  onPageChange: (nextPage: number) => void;
  onProductHoverEnd: (product: HttpTypes.StoreProduct) => void;
  onProductHoverStart: (product: HttpTypes.StoreProduct) => void;
  onSortChange: (value: ProductSortValue) => void;
  page: number;
  pageSize: number;
  products: HttpTypes.StoreProduct[];
  layout?: HerbatikaProductGridLayout;
  loadingSkeleton?: ReactNode;
  showCategoryNotFound: boolean;
  sortItems: Array<{ label: string; value: ProductSortValue }>;
  totalCount: number;
  totalPages: number;
  totalProducts: number;
  isRefreshing?: boolean;
};

export function CategoryResultsSection({
  activeSort,
  addToCartError,
  categoriesError,
  catalogError,
  isEmpty,
  isLoading,
  isProductAdding,
  onAddToCart,
  onPageChange,
  onProductHoverEnd,
  onProductHoverStart,
  onSortChange,
  page,
  pageSize,
  products,
  layout = "catalog",
  loadingSkeleton,
  showCategoryNotFound,
  sortItems,
  totalCount,
  totalPages,
  totalProducts,
  isRefreshing = false,
}: CategoryResultsSectionProps) {
  const resolvedLoadingSkeleton =
    loadingSkeleton ?? <ProductGridSkeleton layout={layout} />;
  const shouldShowInitialSkeleton = isLoading && products.length === 0;
  const shouldShowProductsGrid = !showCategoryNotFound && products.length > 0;

  return (
    <div className="min-w-0 space-y-400 xl:col-span-9">
      <CategorySortTabs
        activeSort={activeSort}
        onSortChange={onSortChange}
        sortItems={sortItems}
        totalProducts={totalProducts}
      />

      {isRefreshing ? (
        <Skeleton.Rectangle className="h-100 rounded-full" speed="fast" />
      ) : null}

      {addToCartError && (
        <StatusText showIcon status="error">
          {addToCartError}
        </StatusText>
      )}
      {categoriesError && (
        <StatusText showIcon status="error">
          {categoriesError}
        </StatusText>
      )}
      {catalogError && (
        <StatusText showIcon status="error">
          {catalogError}
        </StatusText>
      )}
      {showCategoryNotFound && (
        <StatusText showIcon status="error">
          Kategóriu sa nepodarilo nájsť. Skontrolujte URL alebo vyberte inú
          kategóriu.
        </StatusText>
      )}

      {shouldShowInitialSkeleton && resolvedLoadingSkeleton}

      {!isLoading && !showCategoryNotFound && isEmpty && (
        <div className="rounded-lg border border-border-secondary bg-base p-400">
          <p className="text-sm text-fg-secondary">
            V tejto kategórii zatiaľ nie sú dostupné produkty pre zvolený filter.
          </p>
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
          onPageChange={onPageChange}
          page={page}
          pageSize={pageSize}
          size="sm"
          variant="outlined"
        />
      )}
    </div>
  );
}
