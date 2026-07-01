"use client"
import { RELATED_PRODUCTS_LIMIT } from "@/components/product-detail/product-detail.constants"
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

type UseProductDetailRelatedProductsProps = {
  product: Product | null
}

export function useProductDetailRelatedProducts({
  product,
}: UseProductDetailRelatedProductsProps) {
  const relatedCategoryIds = resolveRelatedCategoryIds(product)
  const relatedReferenceCodes = resolveRelatedProductReferenceCodes(product)
  const relatedReferenceHandles = relatedReferenceCodes
    .map(resolveProductReferenceHandle)
    .filter((handle): handle is string => Boolean(handle))
  const referencedProductsQuery = useProducts({
    page: 1,
    limit: RELATED_PRODUCTS_LIMIT,
    handle:
      relatedReferenceHandles.length > 0 ? relatedReferenceHandles : undefined,
    fields: RELATED_PRODUCT_FIELDS,
    enabled: Boolean(product?.id && relatedReferenceHandles.length > 0),
  })

  const fallbackProductsQuery = useProducts({
    page: 1,
    limit: RELATED_PRODUCTS_LIMIT,
    category_id: relatedCategoryIds.length > 0 ? relatedCategoryIds : undefined,
    order: "-created_at",
    fields: PRODUCT_CARD_FIELDS,
    enabled: Boolean(product?.id),
  })
  const referencedProducts = orderProductsByReferenceCodes(
    referencedProductsQuery.products,
    relatedReferenceCodes
  )
  const products = [...referencedProducts, ...fallbackProductsQuery.products]
  const usedProductIds = new Set<string>()
  const filtered: Product[] = []

  for (const relatedProduct of products) {
    if (!relatedProduct.id || relatedProduct.id === product?.id) {
      continue
    }

    if (usedProductIds.has(relatedProduct.id)) {
      continue
    }

    usedProductIds.add(relatedProduct.id)
    filtered.push(relatedProduct)
  }

  const relatedProducts = filtered.slice(0, RELATED_PRODUCTS_LIMIT)

  return resolveRelatedSections(relatedProducts)
}
