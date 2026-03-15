"use client"

import { Pagination } from "@techsio/ui-kit/molecules/pagination"
import Link from "next/link"
import { useState } from "react"
import { AddToCartDialog } from "@/components/molecules/add-to-cart-dialog"
import { DemoProductCard } from "@/components/molecules/demo-product-card"
import { usePrefetchProduct } from "@/hooks/use-prefetch-product"
import { useRegions } from "@/hooks/use-region"
import type { Product } from "@/types/product"
import { formatPrice } from "@/utils/price-utils"
import { extractProductData } from "@/utils/product-utils"

interface ProductGridProps {
  products: Product[]
  totalCount?: number
  currentPage?: number
  pageSize?: number
  onPageChange?: (page: number) => void
}

export function ProductGrid({
  products,
  totalCount,
  currentPage = 1,
  pageSize = 12,
  onPageChange,
}: ProductGridProps) {
  const { selectedRegion } = useRegions()
  const prefetchProduct = usePrefetchProduct()
  const [dialogProduct, setDialogProduct] = useState<Product | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const eagerImageCount = 4

  // Calculate total pages based on totalCount or products length
  const totalPages = Math.ceil((totalCount || products.length) / pageSize)

  const handleAddToCart = (product: Product) => {
    // If product has multiple variants, show dialog
    if (product.variants && product.variants.length > 1) {
      setDialogProduct(product)
      setIsDialogOpen(true)
    } else if (product.variants && product.variants.length === 1) {
      // Single variant - add directly to cart
      // This would need useCart hook here, but for now we'll show dialog anyway
      setDialogProduct(product)
      setIsDialogOpen(true)
    }
  }

  if (products.length === 0) {
    return (
      <div className="py-product-grid-empty-padding text-center">
        <p className="text-product-grid-empty-text">
          Žádné produkty nenalezeny
        </p>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 gap-product-grid-gap sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product, index) => {
          const { displayBadges } = extractProductData(
            product,
            selectedRegion?.currency_code
          )
          // Format the price for display
          // Prices from Medusa are already in dollars/euros, NOT cents
          const formattedPrice =
            product &&
            formatPrice(
              product.priceWithTax ?? 0,
              selectedRegion?.currency_code
            )

          return (
            <div className="relative" key={product.id}>
              <Link
                href={`/products/${product.handle}`}
                onMouseEnter={() => prefetchProduct(product.handle)}
                onTouchStart={() => prefetchProduct(product.handle)}
                prefetch={true}
              >
                <DemoProductCard
                  badges={displayBadges}
                  cartButtonText="Do košíku"
                  className="hover:bg-highlight"
                  hasCartButton={true}
                  imageLoading={index < eagerImageCount ? "eager" : "lazy"}
                  imageUrl={product.thumbnail || ""}
                  name={product.title}
                  onCartClick={() => handleAddToCart(product)}
                  price={formattedPrice || "není k dispozici"}
                />
              </Link>
            </div>
          )
        })}
      </div>

      {totalPages > 1 && onPageChange && (
        <div className="mt-product-grid-pagination-margin flex justify-center">
          {/* Mobile pagination with no siblings */}
          <Pagination
            className="sm:hidden"
            count={totalCount || products.length}
            onPageChange={onPageChange}
            page={currentPage}
            pageSize={pageSize}
            siblingCount={0}
          />
          {/* Desktop pagination with siblings */}
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

      {/* Add to Cart Dialog */}
      {dialogProduct && (
        <AddToCartDialog
          onOpenChange={({ open }) => {
            setIsDialogOpen(open)
            if (!open) {
              setDialogProduct(null)
            }
          }}
          open={isDialogOpen}
          product={dialogProduct}
        />
      )}
    </div>
  )
}
