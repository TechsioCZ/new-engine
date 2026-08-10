"use client"
import { useTranslations } from "next-intl"

import type { Product } from "@/components/product-detail/product-detail.types"
import {
  orderProductsByReferenceCodes,
  resolveProductReferenceHandle,
  resolveRelatedProductReferenceCodes,
  resolveRelatedSections,
} from "@/components/product-detail/utils/related-products"
import { resolveRelatedCategoryIds } from "@/lib/storefront/category-tree"
import {
  PRODUCT_CARD_FIELDS,
  RELATED_PRODUCT_FIELDS,
  useProducts,
} from "@/lib/storefront/products"
import {
  RELATED_PRODUCT_SECTION_MESSAGE_KEYS,
  RELATED_PRODUCTS_LIMIT,
} from "@/lib/storefront/related-products-config"

interface UseProductDetailRelatedProductsProps {
  product: Product | null
}

export const useProductDetailRelatedProducts = ({
  product,
}: UseProductDetailRelatedProductsProps) => {
  const tCatalog = useTranslations("catalog")
  const relatedCategoryIds = resolveRelatedCategoryIds(product)
  const relatedReferenceCodes = resolveRelatedProductReferenceCodes(product)
  const relatedReferenceHandles = relatedReferenceCodes
    .map(resolveProductReferenceHandle)
    .filter((handle): handle is string => handle !== null)
  const referencedProductsQuery = useProducts({
    enabled:
      product?.id !== undefined &&
      product.id !== "" &&
      relatedReferenceHandles.length > 0,
    fields: RELATED_PRODUCT_FIELDS,
    limit: RELATED_PRODUCTS_LIMIT,
    page: 1,
    ...(relatedReferenceHandles.length > 0
      ? { handle: relatedReferenceHandles }
      : {}),
  })

  const fallbackProductsQuery = useProducts({
    enabled: product?.id !== undefined && product.id !== "",
    fields: PRODUCT_CARD_FIELDS,
    limit: RELATED_PRODUCTS_LIMIT,
    order: "-created_at",
    page: 1,
    ...(relatedCategoryIds.length > 0
      ? { category_id: relatedCategoryIds }
      : {}),
  })
  const referencedProducts = orderProductsByReferenceCodes(
    referencedProductsQuery.products,
    relatedReferenceCodes,
  )
  const products = [...referencedProducts, ...fallbackProductsQuery.products]
  const usedProductIds = new Set<string>()
  const filtered: Product[] = []

  for (const relatedProduct of products) {
    if (
      relatedProduct.id !== undefined &&
      relatedProduct.id !== "" &&
      relatedProduct.id !== product?.id &&
      !usedProductIds.has(relatedProduct.id)
    ) {
      usedProductIds.add(relatedProduct.id)
      filtered.push(relatedProduct)
    }
  }

  const relatedProducts = filtered.slice(0, RELATED_PRODUCTS_LIMIT)

  const sectionTitles = RELATED_PRODUCT_SECTION_MESSAGE_KEYS.map((key) =>
    tCatalog(key),
  )

  return resolveRelatedSections(relatedProducts, sectionTitles)
}
