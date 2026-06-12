"use client"

import type { HttpTypes } from "@medusajs/types"
import type { ReactNode } from "react"
import { InlineProductsCarousel } from "@/components/blog/inline-products-carousel"
import {
  HerbatikaProductGrid,
  type HerbatikaProductGridLayout,
} from "@/components/product/herbatika-product-grid"
import { HerbatikaProductGridSkeleton } from "@/components/product/herbatika-product-grid-skeleton"
import { SupportingText } from "@/components/text/supporting-text"

type ProductCollectionSectionCommonProps = {
  title: string
  products: HttpTypes.StoreProduct[]
  id?: string
  subtitle?: string
  shouldShowSkeleton?: boolean
  emptyText?: string
  sectionClassName?: string
  headerClassName?: string
  titleClassName?: string
  subtitleClassName?: string
  headerAction?: ReactNode
  keyPrefix?: string
  onProductHoverStart?: (product: HttpTypes.StoreProduct) => void
  onProductHoverEnd?: (product: HttpTypes.StoreProduct) => void
}

type ProductCollectionSectionGridProps = ProductCollectionSectionCommonProps & {
  display?: "grid"
  layout: HerbatikaProductGridLayout
  onAddToCart: (product: HttpTypes.StoreProduct) => Promise<void> | void
  isProductAdding?: (product: HttpTypes.StoreProduct) => boolean
}

type ProductCollectionSectionCarouselProps =
  ProductCollectionSectionCommonProps & {
    display: "carousel"
    slidesSm?: number
    slidesMd?: number
    slidesLg?: number
  }

type ProductCollectionSectionProps =
  | ProductCollectionSectionGridProps
  | ProductCollectionSectionCarouselProps

const EMPTY_PRODUCTS_TEXT = "Produkty sa momentálne načítavajú."

export function ProductCollectionSection(props: ProductCollectionSectionProps) {
  const {
    title,
    products,
    id,
    subtitle,
    shouldShowSkeleton = false,
    emptyText = EMPTY_PRODUCTS_TEXT,
    sectionClassName,
    headerClassName,
    titleClassName,
    subtitleClassName,
    headerAction,
    keyPrefix,
    onProductHoverStart,
    onProductHoverEnd,
  } = props
  const isCarousel = props.display === "carousel"
  const sectionClassNames = ["space-y-400", sectionClassName]
    .filter(Boolean)
    .join(" ")
  const headerClassNames = [
    "flex items-end justify-between gap-400",
    headerClassName,
  ]
    .filter(Boolean)
    .join(" ")
  const titleClassNames = [
    "text-3xl font-bold leading-none text-fg-primary",
    titleClassName,
  ]
    .filter(Boolean)
    .join(" ")
  const subtitleClassNames = [
    "mt-100 text-sm text-fg-secondary",
    subtitleClassName,
  ]
    .filter(Boolean)
    .join(" ")
  const skeletonLayout: HerbatikaProductGridLayout = isCarousel
    ? "collection"
    : props.layout
  let productContent: ReactNode
  if (shouldShowSkeleton) {
    productContent = <HerbatikaProductGridSkeleton layout={skeletonLayout} />
  } else if (products.length === 0) {
    productContent = (
      <SupportingText className="text-fg-secondary text-sm">
        {emptyText}
      </SupportingText>
    )
  } else if (isCarousel) {
    productContent = (
      <InlineProductsCarousel
        keyPrefix={keyPrefix}
        onProductHoverEnd={onProductHoverEnd}
        onProductHoverStart={onProductHoverStart}
        products={products}
        slidesLg={props.slidesLg}
        slidesMd={props.slidesMd}
        slidesSm={props.slidesSm}
      />
    )
  } else {
    productContent = (
      <HerbatikaProductGrid
        isProductAdding={props.isProductAdding}
        keyPrefix={keyPrefix}
        layout={props.layout}
        onAddToCart={props.onAddToCart}
        onProductHoverEnd={onProductHoverEnd}
        onProductHoverStart={onProductHoverStart}
        products={products}
      />
    )
  }

  return (
    <section className={sectionClassNames} id={id}>
      <header className={headerClassNames}>
        <div>
          <h2 className={titleClassNames}>{title}</h2>
          {subtitle ? <p className={subtitleClassNames}>{subtitle}</p> : null}
        </div>
        {headerAction}
      </header>

      {productContent}
    </section>
  )
}
