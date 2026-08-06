"use client"

import { isRecord } from "@techsio/std/object"
import type { BadgeProps } from "@techsio/ui-kit/atoms/badge"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { BreadcrumbTemplate } from "@techsio/ui-kit/templates/breadcrumb"
import { GalleryTemplate } from "@techsio/ui-kit/templates/gallery"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"

import { SkeletonLoader } from "@/components/atoms/skeleton-loader"
import { ProductGrid } from "@/components/organisms/product-grid"
import { ProductInfo } from "@/components/organisms/product-info"
import { ProductTabs } from "@/components/organisms/product-tabs"
import { useProduct, useProducts } from "@/hooks/use-products"
import { useRegions } from "@/hooks/use-region"
import { truncateProductTitle } from "@/lib/order-utils"
import type { ProductVariant } from "@/types/product"
import { formatPrice } from "@/utils/price-utils"

interface ProductDetailProps {
  handle: string
}

const getProductBadges = (metadata: unknown): BadgeProps[] => {
  const badges: BadgeProps[] = []

  if (!isRecord(metadata)) {
    return badges
  }

  const { discount, isNew } = metadata
  if (isNew === true) {
    badges.push({ children: "New", variant: "info" })
  }

  if (typeof discount === "number" || typeof discount === "string") {
    badges.push({
      children: `${discount}% OFF`,
      variant: "warning",
    })
  }

  return badges
}

interface ProductDetailErrorProps {
  message: string
}

const ProductDetailLoading = () => (
  <div className="min-h-screen bg-product-detail-bg">
    <div className="mx-auto max-w-product-detail-max-w px-product-detail-container-x py-product-detail-container-y">
      <div>
        <SkeletonLoader className="mb-8 w-48" size="md" variant="text" />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <SkeletonLoader className="aspect-square w-full" variant="box" />
          <div className="space-y-4">
            <SkeletonLoader className="w-3/4" size="xl" variant="text" />
            <SkeletonLoader className="w-1/4" size="lg" variant="text" />
            <SkeletonLoader className="h-24 w-full" variant="box" />
          </div>
        </div>
      </div>
    </div>
  </div>
)

const ProductDetailError = ({ message }: ProductDetailErrorProps) => (
  <div className="min-h-screen bg-product-detail-bg">
    <div className="mx-auto max-w-product-detail-max-w px-product-detail-container-x py-product-detail-container-y text-center">
      <h1 className="mb-4 font-semibold text-2xl">Product not found</h1>
      <StatusText showIcon status="error">
        {message}
      </StatusText>
    </div>
  </div>
)

const getFormattedVariantPrices = (
  variant: ProductVariant | null,
  currencyCode: string | null | undefined,
) => {
  if (currencyCode === null || currencyCode === undefined) {
    return {}
  }

  const amount = variant?.calculated_price?.calculated_amount
  const amountWithTax = variant?.calculated_price?.calculated_amount_with_tax

  return {
    ...(typeof amount === "number"
      ? { price: formatPrice(amount, currencyCode) }
      : {}),
    ...(typeof amountWithTax === "number"
      ? { priceWithTax: formatPrice(amountWithTax, currencyCode) }
      : {}),
  }
}

const ProductDetail = ({ handle }: ProductDetailProps) => {
  const { selectedRegion } = useRegions()
  const regionId = selectedRegion?.id
  const { product, isLoading, error } = useProduct(handle, regionId)
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    null,
  )
  const productVariants = product?.variants ?? []
  const selectedVariant =
    productVariants.find((variant) => variant.id === selectedVariantId) ??
    productVariants[0] ??
    null
  const titleQuery = product?.title.split(" ").slice(0, 2).join(" ") ?? ""
  const hasRegionId = typeof regionId === "string" && regionId.length > 0

  const { products: relatedProducts } = useProducts({
    enabled: titleQuery.length > 0 && hasRegionId,
    limit: 5,
    q: titleQuery,
    region_id: regionId,
    sort: "newest",
  })

  // Filter out the current product from related products
  const filteredRelatedProducts = relatedProducts
    .filter((p) => p.handle !== handle)
    .slice(0, 4)

  if (isLoading) {
    return <ProductDetailLoading />
  }

  // Error state
  if (error !== null || product === undefined) {
    return (
      <ProductDetailError
        message={error ?? "The product you are looking for does not exist."}
      />
    )
  }

  // Prices from Medusa are already in dollars/euros, NOT cents
  const { price, priceWithTax } = getFormattedVariantPrices(
    selectedVariant,
    selectedRegion?.currency_code,
  )
  // Get badges for the product
  const badges = getProductBadges(product.metadata)

  const galleryImages =
    product.images?.map((img, idx) => ({
      alt: img.alt ?? product.title,
      id: `image-${idx}`,
      imageProps: { fill: true, sizes: "400px" },
      src: img.url,
    })) ?? []

  const handleVariantChange = (variant: ProductVariant) => {
    setSelectedVariantId(variant.id)
  }

  return (
    <div className="min-h-screen bg-product-detail-bg">
      <div className="mx-auto max-w-product-detail-max-w px-product-detail-container-x py-product-detail-container-y lg:px-product-detail-container-x-lg lg:py-product-detail-container-y-lg">
        {/* Breadcrumb */}
        <div className="mb-product-detail-breadcrumb-margin">
          <BreadcrumbTemplate
            items={[
              { href: "/", label: "Domů" },
              { href: "/products", label: "Produkty" },
              {
                href: `/products/${product.handle}`,
                label: truncateProductTitle(product.title),
              },
            ]}
            linkAs={Link}
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-product-detail-content-gap lg:grid-cols-[auto_1fr]">
          {/* Image Gallery */}
          <div className="aspect-square w-full max-w-container-sm">
            <GalleryTemplate
              aspectRatio="square"
              carouselHeight={400}
              carouselWidth={400}
              imageAs={Image}
              items={galleryImages}
              orientation="horizontal"
              thumbnailImageAs={Image}
              thumbnailSize={50}
            />
          </div>

          {/* Info Section */}
          <ProductInfo
            badges={badges}
            onVariantChange={handleVariantChange}
            price={price ?? "Cena není k dispozici"}
            {...(priceWithTax === undefined ? {} : { priceWithTax })}
            product={product}
            selectedVariant={selectedVariant}
          />
        </div>

        {/* Tabs Section */}
        <ProductTabs product={product} />

        {/* Related Products */}
        {filteredRelatedProducts.length > 0 && (
          <div className="mt-product-detail-related-margin">
            <div className="mb-4 flex flex-col">
              <h2 className="font-bold text-featured-title text-featured-title-size">
                Mohlo by se vám líbit
              </h2>
            </div>
            <ProductGrid products={filteredRelatedProducts} />
          </div>
        )}
      </div>
    </div>
  )
}

export default ProductDetail
