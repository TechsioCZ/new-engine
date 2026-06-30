import type { StoreProduct } from "@medusajs/types"
import { slugify } from "@techsio/ui-kit/utils"
import type {
  Product,
  ProductDetail,
  ProductImage,
  ProductVariantDetail,
  StoreProductExtended,
} from "@/types/product"
import { formatPrice, formatVariants } from "../format/format-product"

const IMAGE_PREFIX_REGEX = /^[a-f0-9]{10}-/

const formatStockValue = (
  variants?: StoreProduct["variants"]
): "Skladem" | "Vyprodáno" => {
  if (
    !variants ||
    variants.length === 0 ||
    variants.every((v) => v.inventory_quantity === 0)
  ) {
    return "Vyprodáno"
  }

  return "Skladem"
}

/**
 * Extracts base product fields that are common between Product and ProductDetail
 */
const getBaseProductFields = (product: StoreProduct) => ({
  id: product.id,
  handle: product.handle,
  title: product.title,
  price: formatPrice({ variants: product.variants }),
  withoutTax: formatPrice({ variants: product.variants, tax: false }),
  imageSrc: product.thumbnail || "/placeholder.jpg",
  stockValue: formatStockValue(product.variants),
})

export const transformProduct = (product: StoreProduct): Product => ({
  ...getBaseProductFields(product),
  variants: formatVariants(product.variants),
})

const removeDuplicatedImageUrl = (images: ProductImage[]) => {
  const uniqueUrls = new Set<string>()
  return images.filter((img) => {
    const filename = img.src.split("/").pop() || ""
    const baseName = filename.replace(IMAGE_PREFIX_REGEX, "")
    if (uniqueUrls.has(baseName)) {
      return false
    }
    uniqueUrls.add(baseName)
    return true
  })
}

// ============================================
// V2 Transform - Optimized for new API structure
// ============================================

export const transformProductDetail = (
  product: StoreProductExtended
): ProductDetail => {
  const variantMetadata = product.variants?.[0]
    ?.metadata as ProductVariantDetail["metadata"]
  const variantImages = variantMetadata?.images
  const imagesData: ProductImage[] =
    variantImages && variantImages.length > 0
      ? variantImages.map((img) => ({
          id: slugify(img.url),
          src: img.url,
        }))
      : product.images?.map((img) => ({
          id: img.id,
          src: img.url,
        })) || []

  const images: ProductImage[] = removeDuplicatedImageUrl(imagesData)

  const variants: ProductVariantDetail[] =
    product.variants?.map((variant) => ({
      id: variant.id,
      title: variant.title || "",
      sku: variant.sku,
      barcode: variant.barcode,
      ean: variant.ean,
      upc: variant.upc,
      material: variant.material,
      allow_backorder: variant.allow_backorder ?? false,
      inventory_quantity: variant.inventory_quantity ?? undefined,
      manage_inventory: variant.manage_inventory ?? true,
      metadata: variant.metadata as ProductVariantDetail["metadata"],
      calculated_price: variant.calculated_price
        ? {
            calculated_amount: variant.calculated_price.calculated_amount,
            calculated_amount_with_tax:
              variant.calculated_price.calculated_amount_with_tax,
            calculated_amount_without_tax:
              variant.calculated_price.calculated_amount_without_tax,
            original_amount: variant.calculated_price.original_amount,
            currency_code: variant.calculated_price.currency_code,
          }
        : undefined,
    })) || []

  return {
    // Base Product fields
    ...getBaseProductFields(product),

    // Extended fields
    description: product.description,
    subtitle: product.subtitle,
    thumbnail: product.thumbnail,
    collection_id: product.collection_id,
    type_id: product.type_id,
    weight: product.weight,
    material: product.material,

    // Full data
    images,
    variants,
    tags:
      product.tags?.map((tag) => ({
        id: tag.id,
        value: tag.value,
      })) || [],
    // Brand data
    brand: product.brand
      ? {
          id: product.brand.id,
          title: product.brand.title,
          attributes:
            product.brand.attributes?.map((attr) => ({
              value: attr.value,
              attributeType: attr.attributeType
                ? {
                    name: attr.attributeType.name,
                  }
                : undefined,
            })) || [],
        }
      : undefined,
  }
}
