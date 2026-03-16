import { Badge } from "@techsio/ui-kit/atoms/badge"
import { Pagination } from "@techsio/ui-kit/molecules/pagination"
import { ProductCard } from "@techsio/ui-kit/molecules/product-card"
import Image from "next/image"
import Link from "next/link"
import { Fragment } from "react"
import { usePrefetchProduct } from "@/hooks/use-prefetch-product"
import { PREFETCH_DELAYS } from "@/lib/prefetch-config"
import type { Product } from "@/types/product"
import { ProductCardSkeleton } from "../skeletons/product-card-skeleton"
import { VariantsBox } from "./variants-box"

type ProductGridProps = {
  products: Product[]
  totalCount?: number
  currentPage?: number
  pageSize?: number
  onPageChange?: (page: number) => void
  isLoading?: boolean
  skeletonCount?: number
}

export const ProductGrid = ({
  products,
  totalCount,
  currentPage = 1,
  pageSize = 24,
  onPageChange,
  isLoading = false,
  skeletonCount = 12,
}: ProductGridProps) => {
  const { delayedPrefetch, cancelPrefetch } = usePrefetchProduct()
  const totalPages = Math.ceil((totalCount || products.length) / pageSize)
  const skeletonKeys = Array.from(
    { length: skeletonCount },
    (_, index) => `product-skeleton-${index}`
  )

  // Loading state
  if (isLoading) {
    return (
      <div className="w-full max-w-max-w">
        <div className="grid w-full grid-cols-2 gap-200 md:grid-cols-4">
          {skeletonKeys.map((key) => (
            <ProductCardSkeleton key={key} />
          ))}
        </div>
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="py-300 text-center">
        <p className="text-fg-secondary">Žádné produkty nenalezeny</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="grid w-full grid-cols-1 gap-200 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {products.map((product, index) => (
          <Fragment key={product.id}>
            {index !== 0 &&
              index % 4 === 0 &&
              index + 1 !== products.length && (
                <div className="col-span-full h-[1px] bg-border-secondary md:hidden lg:flex" />
              )}
            {index !== 0 &&
              index % 3 === 0 &&
              index + 1 !== products.length && (
                <div className="col-span-full hidden h-[1px] bg-border-secondary md:flex lg:hidden" />
              )}
            <Link
              className="contents"
              href={`/produkt/${product.handle}`}
              onMouseEnter={() => {
                delayedPrefetch(product.handle, PREFETCH_DELAYS.PRODUCT_DETAIL)
              }}
              onMouseLeave={() => {
                cancelPrefetch(product.handle)
              }}
            >
              <ProductCard className="row-span-5 grid h-full max-w-3xs cursor-pointer grid-rows-subgrid place-items-center gap-y-100 hover:shadow-lg">
                <div className="flex flex-col gap-200 place-self-start">
                  <ProductCard.Name className="text-center">
                    {product.title}
                  </ProductCard.Name>
                  <ProductCard.Badges className="w-full">
                    {product.badges?.map((badge) => (
                      <Badge
                        key={`${badge.variant ?? "default"}-${badge.children}`}
                        {...badge}
                      />
                    ))}
                  </ProductCard.Badges>
                </div>
                <ProductCard.Image
                  alt={product.title}
                  as={Image}
                  className="aspect-square w-auto"
                  height={250}
                  src={product.imageSrc}
                  width={250}
                />
                <div className="flex flex-col items-center gap-300 self-start">
                  <ProductCard.Actions>
                    <VariantsBox variants={product.variants || []} />
                  </ProductCard.Actions>
                </div>
                <ProductCard.Stock
                  status={
                    product.stockValue === "Skladem"
                      ? "in-stock"
                      : "out-of-stock"
                  }
                >
                  {product.stockValue}
                </ProductCard.Stock>
                <div className="flex w-full flex-col items-center justify-evenly xl:flex-row">
                  <ProductCard.Price>{product.price}</ProductCard.Price>
                  <ProductCard.Actions>
                    {product?.variants && product.variants?.length > 1 ? (
                      <ProductCard.Button buttonVariant="detail">
                        <span className="font-bold uppercase">Detail</span>
                      </ProductCard.Button>
                    ) : (
                      <ProductCard.Button
                        buttonVariant="cart"
                        icon="icon-[mdi--cart-outline]"
                      >
                        <span className="font-bold uppercase">Do košíku</span>
                      </ProductCard.Button>
                    )}
                  </ProductCard.Actions>
                </div>
              </ProductCard>
            </Link>
          </Fragment>
        ))}
      </div>

      {totalPages > 1 && onPageChange && (
        <div className="mt-700 flex justify-end">
          <Pagination
            className="sm:hidden"
            count={totalCount || products.length}
            onPageChange={onPageChange}
            page={currentPage}
            pageSize={pageSize}
            siblingCount={0}
          />
          <Pagination
            className="hidden sm:flex"
            count={totalCount || products.length}
            onPageChange={onPageChange}
            page={currentPage}
            pageSize={pageSize}
            siblingCount={1}
          />
        </div>
      )}
    </div>
  )
}
