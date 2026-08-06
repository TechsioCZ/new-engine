"use client"

import type { HttpTypes } from "@medusajs/types"

import { HerbatikaProductCard } from "@/components/herbatika-product-card"

import { HERBATIKA_PRODUCT_GRID_LAYOUT_CLASSNAME } from "./herbatika-product-grid.constants"
import type { HerbatikaProductGridLayout } from "./herbatika-product-grid.constants"

export type { HerbatikaProductGridLayout } from "./herbatika-product-grid.constants"

interface HerbatikaProductGridProps {
  products: HttpTypes.StoreProduct[]
  onAddToCart: (product: HttpTypes.StoreProduct) => Promise<void> | void
  layout: HerbatikaProductGridLayout
  isProductAdding?: (product: HttpTypes.StoreProduct) => boolean
  onProductHoverStart?: (product: HttpTypes.StoreProduct) => void
  onProductHoverEnd?: (product: HttpTypes.StoreProduct) => void
  getDescriptionOverride?: (product: HttpTypes.StoreProduct) => string | null
  keyPrefix?: string
}

export const HerbatikaProductGrid = ({
  products,
  onAddToCart,
  layout,
  isProductAdding,
  onProductHoverStart,
  onProductHoverEnd,
  getDescriptionOverride,
  keyPrefix,
}: HerbatikaProductGridProps) => (
  <div className={`${HERBATIKA_PRODUCT_GRID_LAYOUT_CLASSNAME[layout]} min-w-0`}>
    {products.map((product) => (
      <HerbatikaProductCard
        descriptionOverride={getDescriptionOverride?.(product) ?? null}
        isAdding={isProductAdding?.(product) ?? false}
        key={`${keyPrefix ?? layout}-${product.id}`}
        onAddToCart={onAddToCart}
        {...(onProductHoverEnd === undefined ? {} : { onProductHoverEnd })}
        {...(onProductHoverStart === undefined ? {} : { onProductHoverStart })}
        product={product}
      />
    ))}
  </div>
)
