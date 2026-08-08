import type { HttpTypes } from "@medusajs/types"

import {
  resolveProductSummaryText,
  resolveShortDescriptionHtml,
} from "@/components/product-detail/product-detail-data.utils"
import type { Product } from "@/components/product-detail/product-detail.types"
import {
  resolveGalleryItems,
  resolveProductHighlights,
} from "@/components/product-detail/utils/display-utils"
import { resolveProductMediaFacts } from "@/components/product-detail/utils/media-facts"
import {
  resolveOfferState,
  resolveProductContentSections,
  resolveProductImages,
} from "@/components/product-detail/utils/metadata-parsers"
import {
  mergeWarrantyIntoProductContentSections,
  resolveProductWarranty,
} from "@/lib/storefront/product-attributes"

type ProductAttributes = Parameters<typeof resolveProductWarranty>[0]

interface ProductDetailPresentationLabels {
  dailyCapsules: (count: number) => string
  doses: (count: number) => string
  sections: {
    composition: string
    content: string
    description: string
    other: string
    usage: string
    warning: string
  }
  stock: {
    inStock: string
    outOfStock: string
  }
}

const resolveGalleryFallbackLabel = (
  product: Product | null,
  handle: string,
) => {
  const productHandle = product?.handle?.trim()
  if (productHandle !== undefined && productHandle !== "") {
    return productHandle
  }
  return product?.id ?? handle
}

export const resolveProductDetailPresentationData = ({
  handle,
  labels,
  product,
  productAttributes,
  selectedVariant,
}: {
  handle: string
  labels: ProductDetailPresentationLabels
  product: Product | null
  productAttributes: ProductAttributes
  selectedVariant: HttpTypes.StoreProductVariant | null
}) => {
  const offerState = resolveOfferState(product, selectedVariant, labels.stock)
  const shortDescriptionHtml = resolveShortDescriptionHtml(product)
  const productSummaryText = resolveProductSummaryText(
    product,
    shortDescriptionHtml,
  )
  const productImages = resolveProductImages(product)
  const galleryItems = resolveGalleryItems(
    productImages,
    product?.title,
    resolveGalleryFallbackLabel(product, handle),
  )
  const productContentSections = mergeWarrantyIntoProductContentSections(
    resolveProductContentSections(product, labels.sections),
    resolveProductWarranty(productAttributes),
    labels.sections.other,
  )
  const mediaFacts = resolveProductMediaFacts(product, productContentSections, {
    dailyCapsules: labels.dailyCapsules,
    doses: labels.doses,
  })

  return {
    galleryItems,
    mediaFacts,
    offerState,
    productContentSections,
    productHighlights: resolveProductHighlights(productSummaryText),
  }
}
