import { isRecord } from "@techsio/std/object"

import type {
  Product,
  RelatedProductsSection,
} from "@/components/product-detail/product-detail.types"
import { RELATED_PRODUCTS_PER_SECTION } from "@/lib/storefront/related-products-config"

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item): item is string => typeof item === "string")
}

const normalizeProductReferenceCode = (value: string) => value.trim()

const slugifyProductReferenceCode = (value: string) =>
  normalizeProductReferenceCode(value)
    .normalize("NFKD")
    .replaceAll(/[\u0300-\u036F]/gu, "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, "-")
    .replaceAll(/-+/gu, "-")
    .replaceAll(/^-|-$/gu, "")

export const resolveProductReferenceHandle = (code: string) => {
  const slug = slugifyProductReferenceCode(code)

  return slug === "" ? null : `shopitem-${slug}`
}

export const resolveRelatedProductReferenceCodes = (
  product: Product | null,
): string[] => {
  const productMetadata = product?.metadata
  const metadata = isRecord(productMetadata) ? productMetadata : null
  const codes = [
    ...asStringArray(metadata?.["related_products"]),
    ...asStringArray(metadata?.["alternative_products"]),
  ]
  const seen = new Set<string>()
  const result: string[] = []

  for (const code of codes) {
    const normalized = normalizeProductReferenceCode(code)
    if (normalized !== "" && !seen.has(normalized)) {
      seen.add(normalized)
      result.push(normalized)
    }
  }

  return result
}

export const orderProductsByReferenceCodes = (
  products: Product[],
  referenceCodes: string[],
): Product[] => {
  const productBySourceId = new Map<string, Product>()
  const productByHandle = new Map<string, Product>()
  const usedProductIds = new Set<string>()
  const result: Product[] = []

  for (const product of products) {
    if (product.handle !== undefined && product.handle !== "") {
      productByHandle.set(product.handle, product)
    }

    const metadata = isRecord(product.metadata) ? product.metadata : null
    const sourceShopitemId = metadata?.["source_shopitem_id"]
    if (typeof sourceShopitemId === "string" && sourceShopitemId !== "") {
      productBySourceId.set(sourceShopitemId, product)
    }
  }

  for (const code of referenceCodes) {
    const referenceHandle = resolveProductReferenceHandle(code)
    const product =
      productBySourceId.get(code) ??
      (referenceHandle === null
        ? undefined
        : productByHandle.get(referenceHandle))

    if (
      product?.id !== undefined &&
      product.id !== "" &&
      !usedProductIds.has(product.id)
    ) {
      usedProductIds.add(product.id)
      result.push(product)
    }
  }

  return result
}

const fillSectionProducts = (
  products: Product[],
  sectionIndex: number,
): Product[] => {
  if (products.length === 0) {
    return []
  }

  const start = sectionIndex * RELATED_PRODUCTS_PER_SECTION
  const initialSlice = products.slice(
    start,
    start + RELATED_PRODUCTS_PER_SECTION,
  )

  if (initialSlice.length >= RELATED_PRODUCTS_PER_SECTION) {
    return initialSlice
  }

  const sectionProducts = [...initialSlice]
  const usedIds = new Set(sectionProducts.map((product) => product.id))

  for (const product of products) {
    if (sectionProducts.length >= RELATED_PRODUCTS_PER_SECTION) {
      break
    }

    if (!usedIds.has(product.id)) {
      sectionProducts.push(product)
      usedIds.add(product.id)
    }
  }

  return sectionProducts
}

export const resolveRelatedSections = (
  products: Product[],
  sectionTitles: readonly string[],
): RelatedProductsSection[] => {
  const recommendationSections = sectionTitles.map((title, sectionIndex) => ({
    id: `related-${sectionIndex}`,
    products: fillSectionProducts(products, sectionIndex),
    title,
  }))

  return recommendationSections.filter((section) => section.products.length > 0)
}
