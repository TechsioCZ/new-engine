"use client"

import type { HttpTypes } from "@medusajs/types"
import { useTranslations } from "next-intl"
import type { ReactNode } from "react"

import { InlineProductsCarousel } from "@/components/blog/inline-products-carousel"
import { HerbatikaProductGrid } from "@/components/product/herbatika-product-grid"
import type { HerbatikaProductGridLayout } from "@/components/product/herbatika-product-grid"
import { HerbatikaProductGridSkeleton } from "@/components/product/herbatika-product-grid-skeleton"
import { SupportingText } from "@/components/text/supporting-text"

interface ProductCollectionSectionCommonProps {
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

const resolveProductContent = (
  props: ProductCollectionSectionProps,
  emptyText: string,
): ReactNode => {
  const {
    keyPrefix,
    onProductHoverEnd,
    onProductHoverStart,
    products,
    shouldShowSkeleton = false,
  } = props
  const isCarousel = props.display === "carousel"
  const skeletonLayout: HerbatikaProductGridLayout = isCarousel
    ? "collection"
    : props.layout

  if (shouldShowSkeleton) {
    return <HerbatikaProductGridSkeleton layout={skeletonLayout} />
  }

  if (products.length === 0) {
    return (
      <SupportingText className="text-fg-secondary text-sm">
        {emptyText}
      </SupportingText>
    )
  }

  if (isCarousel) {
    return (
      <InlineProductsCarousel
        {...(keyPrefix === undefined ? {} : { keyPrefix })}
        {...(onProductHoverEnd === undefined ? {} : { onProductHoverEnd })}
        {...(onProductHoverStart === undefined ? {} : { onProductHoverStart })}
        products={products}
        {...(props.slidesLg === undefined ? {} : { slidesLg: props.slidesLg })}
        {...(props.slidesMd === undefined ? {} : { slidesMd: props.slidesMd })}
        {...(props.slidesSm === undefined ? {} : { slidesSm: props.slidesSm })}
      />
    )
  }

  return (
    <HerbatikaProductGrid
      {...(props.isProductAdding === undefined
        ? {}
        : { isProductAdding: props.isProductAdding })}
      {...(keyPrefix === undefined ? {} : { keyPrefix })}
      layout={props.layout}
      onAddToCart={props.onAddToCart}
      {...(onProductHoverEnd === undefined ? {} : { onProductHoverEnd })}
      {...(onProductHoverStart === undefined ? {} : { onProductHoverStart })}
      products={products}
    />
  )
}

export const ProductCollectionSection = (
  props: ProductCollectionSectionProps,
) => {
  const tCatalog = useTranslations("catalog")
  const {
    emptyText,
    headerAction,
    headerClassName,
    id,
    sectionClassName,
    subtitle,
    subtitleClassName,
    title,
    titleClassName,
  } = props
  const resolvedEmptyText =
    emptyText ?? tCatalog("product_card.collection_empty")
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
  const productContent = resolveProductContent(props, resolvedEmptyText)

  return (
    <section className={sectionClassNames} id={id}>
      <header className={headerClassNames}>
        <div>
          <h2 className={titleClassNames}>{title}</h2>
          {subtitle !== null && subtitle !== undefined && subtitle !== "" ? (
            <p className={subtitleClassNames}>{subtitle}</p>
          ) : null}
        </div>
        {headerAction}
      </header>

      {productContent}
    </section>
  )
}
