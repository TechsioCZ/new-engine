import { slugify } from "@techsio/ui-kit/utils"

import type {
  Product,
  ProductListProduct,
  ProductListVariant,
  ProductDetail,
  ProductImage,
  ProductVariantDetail,
  StoreProductExtended,
} from "@/types/product"

import { formatPrice, formatVariants } from "../format/format-product"

const IMAGE_PREFIX_REGEX = /^[a-f0-9]{10}-/u

const formatStockValue = (
  variants?: ProductListVariant[] | null,
): "Skladem" | "Vyprodáno" => {
  if (!variants || variants.every((v) => v.inventory_quantity === 0)) {
    return "Vyprodáno"
  }

  return "Skladem"
}

/**
 * Extracts base product fields that are common between Product and ProductDetail
 */
const getBaseProductFields = (product: ProductListProduct) => ({
  handle: product.handle,
  id: product.id,
  imageSrc:
    product.thumbnail === ""
      ? "/placeholder.jpg"
      : (product.thumbnail ?? "/placeholder.jpg"),
  price: formatPrice({ variants: product.variants }),
  stockValue: formatStockValue(product.variants),
  title: product.title,
  withoutTax: formatPrice({ tax: false, variants: product.variants }),
})

export const transformProduct = (product: ProductListProduct): Product => ({
  ...getBaseProductFields(product),
  variants: formatVariants(product.variants),
})

const removeDuplicatedImageUrl = (images: ProductImage[]) => {
  const uniqueUrls = new Set<string>()
  return images.filter((img) => {
    const filename = img.src.split("/").pop() ?? ""
    const baseName = filename.replace(IMAGE_PREFIX_REGEX, "")
    if (uniqueUrls.has(baseName)) {
      return false
    }
    uniqueUrls.add(baseName)
    return true
  })
}

const isMetadataImage = (value: unknown): value is { url: string } => {
  if (typeof value !== "object" || value === null) {
    return false
  }
  return "url" in value && typeof value.url === "string"
}

const isMetadataAttribute = (
  value: unknown,
): value is { name: string; value: string } => {
  if (typeof value !== "object" || value === null) {
    return false
  }
  if (!("name" in value) || typeof value.name !== "string") {
    return false
  }
  return "value" in value && typeof value.value === "string"
}

const normalizeVariantMetadata = (
  metadata: unknown,
): ProductVariantDetail["metadata"] => {
  if (typeof metadata !== "object" || metadata === null) {
    return undefined
  }

  const rawImages: unknown = "images" in metadata ? metadata.images : undefined
  const images =
    Array.isArray(rawImages) && rawImages.every(isMetadataImage)
      ? rawImages.map((image) => ({ url: image.url }))
      : undefined
  const rawAttributes: unknown =
    "attributes" in metadata ? metadata.attributes : undefined
  const attributes =
    Array.isArray(rawAttributes) && rawAttributes.every(isMetadataAttribute)
      ? rawAttributes.map((attribute) => ({
          name: attribute.name,
          value: attribute.value,
        }))
      : undefined
  const thumbnail =
    "thumbnail" in metadata && typeof metadata.thumbnail === "string"
      ? metadata.thumbnail
      : undefined
  const userCode =
    "user_code" in metadata && typeof metadata.user_code === "string"
      ? metadata.user_code
      : undefined

  return {
    ...(attributes === undefined ? {} : { attributes }),
    ...(images === undefined ? {} : { images }),
    ...(thumbnail === undefined ? {} : { thumbnail }),
    ...(userCode === undefined ? {} : { user_code: userCode }),
  }
}

// ============================================
// V2 Transform - Optimized for new API structure
// ============================================

export const transformProductDetail = (
  product: StoreProductExtended,
): ProductDetail => {
  const variantMetadata = normalizeVariantMetadata(
    product.variants?.[0]?.metadata,
  )
  const variantImages = variantMetadata?.images
  const imagesData: ProductImage[] =
    variantImages && variantImages.length > 0
      ? variantImages.map((img) => ({
          id: slugify(img.url),
          src: img.url,
        }))
      : (product.images?.map((img) => ({
          id: img.id,
          src: img.url,
        })) ?? [])

  const images: ProductImage[] = removeDuplicatedImageUrl(imagesData)

  const variants: ProductVariantDetail[] =
    product.variants?.map((variant) => ({
      allow_backorder: variant.allow_backorder ?? false,
      barcode: variant.barcode,
      calculated_price: variant.calculated_price
        ? {
            calculated_amount: variant.calculated_price.calculated_amount,
            calculated_amount_with_tax:
              variant.calculated_price.calculated_amount_with_tax,
            calculated_amount_without_tax:
              variant.calculated_price.calculated_amount_without_tax,
            currency_code: variant.calculated_price.currency_code,
            original_amount: variant.calculated_price.original_amount,
          }
        : undefined,
      ean: variant.ean,
      id: variant.id,
      inventory_quantity: variant.inventory_quantity ?? undefined,
      manage_inventory: variant.manage_inventory ?? true,
      material: variant.material,
      metadata: normalizeVariantMetadata(variant.metadata),
      sku: variant.sku,
      title: variant.title ?? "",
      upc: variant.upc,
    })) ?? []

  return {
    // Base Product fields
    ...getBaseProductFields(product),
    // Brand data
    brand: product.brand
      ? {
          attributes:
            product.brand.attributes?.map((attr) => ({
              attributeType: attr.attributeType
                ? {
                    name: attr.attributeType.name,
                  }
                : undefined,
              value: attr.value,
            })) ?? [],
          id: product.brand.id,
          title: product.brand.title,
        }
      : undefined,
    collection_id: product.collection_id,
    description: product.description,
    images,
    material: product.material,
    subtitle: product.subtitle,
    tags:
      product.tags?.map((tag) => ({
        id: tag.id,
        value: tag.value,
      })) ?? [],
    thumbnail: product.thumbnail,
    type_id: product.type_id,
    variants,
    weight: product.weight,
  }
}
