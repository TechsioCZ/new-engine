"use client"

import type { HttpTypes } from "@medusajs/types"
import { useRegionContext } from "@techsio/storefront-data/shared/region-context"
import { type ReactNode, useMemo, useState } from "react"
import { HerbatikaProductCardCompact } from "@/components/herbatika-product-card-compact"
import { HerbatikaProductCardSkeleton } from "@/components/herbatika-product-card-skeleton"
import { SupportingText } from "@/components/text/supporting-text"
import { PRODUCT_CARD_FIELDS, useProducts } from "@/lib/storefront/products"
import {
  orderProductsByHandles,
  useRecentlyVisitedProductHandles,
} from "@/lib/storefront/recently-visited-products"

type RecentlyVisitedProductsSectionProps = {
  className?: string
  excludeHandle?: string | null
  emptyText?: string
  headingText?: string
  hideWhenEmpty?: boolean
  id?: string
  visibleCount?: number
}

const DEFAULT_EMPTY_TEXT = "Zatiaľ nemáte žiadne naposledy navštívené produkty."
const DEFAULT_HEADING_TEXT = "Naposledy navštívené"
const DEFAULT_VISIBLE_COUNT = 4
const RECENT_PRODUCTS_GRID_CLASSNAME = "grid grid-cols-2 gap-300 md:grid-cols-4"
const RECENT_PRODUCT_SKELETON_KEYS = [
  "recent-product-skeleton-1",
  "recent-product-skeleton-2",
  "recent-product-skeleton-3",
  "recent-product-skeleton-4",
] as const

export function RecentlyVisitedProductsSection({
  className,
  excludeHandle,
  emptyText = DEFAULT_EMPTY_TEXT,
  headingText = DEFAULT_HEADING_TEXT,
  hideWhenEmpty = false,
  id = "naposledy-navstivene",
  visibleCount = DEFAULT_VISIBLE_COUNT,
}: RecentlyVisitedProductsSectionProps) {
  const region = useRegionContext()
  const recentlyVisitedHandles = useRecentlyVisitedProductHandles({
    excludeHandle,
  })
  const productHandles = useMemo(
    () => recentlyVisitedHandles.slice(0, visibleCount),
    [recentlyVisitedHandles, visibleCount]
  )
  const [productsWithImageError, setProductsWithImageError] = useState<
    string[]
  >([])

  const recentProductsQuery = useProducts({
    page: 1,
    limit: productHandles.length,
    handle: productHandles.length > 0 ? productHandles : undefined,
    fields: PRODUCT_CARD_FIELDS,
    enabled: Boolean(region?.region_id && productHandles.length > 0),
  })

  const visibleProducts = useMemo(
    () =>
      orderProductsByHandles(
        recentProductsQuery.products,
        productHandles
      ).filter((product) => {
        if (!product.id) {
          return true
        }

        return !productsWithImageError.includes(product.id)
      }),
    [productHandles, productsWithImageError, recentProductsQuery.products]
  )

  const shouldShowSkeleton =
    productHandles.length > 0 &&
    visibleProducts.length === 0 &&
    (!region?.region_id || recentProductsQuery.isLoading)

  if (hideWhenEmpty && !shouldShowSkeleton && visibleProducts.length === 0) {
    return null
  }

  const handleCompactImageError = (product: HttpTypes.StoreProduct) => {
    if (!product.id) {
      return
    }

    setProductsWithImageError((currentProductsWithImageError) =>
      currentProductsWithImageError.includes(product.id)
        ? currentProductsWithImageError
        : [...currentProductsWithImageError, product.id]
    )
  }
  let content: ReactNode
  if (shouldShowSkeleton) {
    content = (
      <div className={RECENT_PRODUCTS_GRID_CLASSNAME}>
        {RECENT_PRODUCT_SKELETON_KEYS.map((skeletonKey) => (
          <HerbatikaProductCardSkeleton key={skeletonKey} variant="compact" />
        ))}
      </div>
    )
  } else if (visibleProducts.length > 0) {
    content = (
      <div className={RECENT_PRODUCTS_GRID_CLASSNAME}>
        {visibleProducts.map((product, index) => (
          <HerbatikaProductCardCompact
            key={`recent-product-${product.id}-${index}`}
            onCompactImageError={handleCompactImageError}
            product={product}
          />
        ))}
      </div>
    )
  } else {
    content = (
      <SupportingText className="text-fg-secondary text-sm">
        {emptyText}
      </SupportingText>
    )
  }

  return (
    <section
      className={["space-y-400", className].filter(Boolean).join(" ")}
      id={id}
    >
      <header>
        <h2 className="font-bold text-3xl text-fg-primary">{headingText}</h2>
      </header>

      {content}
    </section>
  )
}
