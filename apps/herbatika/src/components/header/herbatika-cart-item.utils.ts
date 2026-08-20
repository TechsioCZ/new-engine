import type { HttpTypes } from "@medusajs/types"
import { FALLBACK_IMAGE_SRC } from "@/components/fallback-image.constants"
import { asFiniteNumber } from "@/lib/storefront/cart-calculations"
import { resolveDefaultStockInventoryQuantity } from "@/lib/storefront/default-stock-availability"
import { buildProjectedEntityPath } from "@/lib/url/link-projections/projected-entity-link"
import type { Market } from "@/lib/url/types"

export const FALLBACK_MAX_QUANTITY = 99

const readPublicSlugProjection = (source: unknown) => {
  if (!(source && typeof source === "object" && !Array.isArray(source))) {
    return
  }

  const record = source as Record<string, unknown>
  if (typeof record.publicSlug === "string") {
    return { publicSlug: record.publicSlug }
  }

  const metadata = record.metadata
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    const publicSlug = (metadata as Record<string, unknown>).publicSlug
    if (typeof publicSlug === "string") {
      return { publicSlug }
    }
  }

  return
}

export const resolveLineItemHref = (
  item: HttpTypes.StoreCartLineItem,
  market: Market,
  product?: HttpTypes.StoreProduct | null
) =>
  buildProjectedEntityPath(
    "product",
    readPublicSlugProjection(product) ?? readPublicSlugProjection(item),
    market
  )

export const resolveLineItemInventory = (item: HttpTypes.StoreCartLineItem) => {
  const itemRecord = item as unknown as Record<string, unknown>
  const metadata =
    itemRecord.metadata &&
    typeof itemRecord.metadata === "object" &&
    !Array.isArray(itemRecord.metadata)
      ? (itemRecord.metadata as Record<string, unknown>)
      : null
  const variant =
    itemRecord.variant &&
    typeof itemRecord.variant === "object" &&
    !Array.isArray(itemRecord.variant)
      ? (itemRecord.variant as Record<string, unknown>)
      : null

  const defaultStockInventory = resolveDefaultStockInventoryQuantity(variant)
  if (defaultStockInventory !== null) {
    return defaultStockInventory
  }

  const metadataInventory = asFiniteNumber(metadata?.inventory_quantity)
  if (metadataInventory !== null) {
    return metadataInventory
  }

  const variantInventory = asFiniteNumber(variant?.inventory_quantity)
  if (variantInventory !== null) {
    return variantInventory
  }

  return asFiniteNumber(itemRecord.variant_inventory_quantity)
}

export const resolveLineItemThumbnail = (item: HttpTypes.StoreCartLineItem) => {
  if (typeof item.thumbnail === "string" && item.thumbnail.length > 0) {
    return item.thumbnail
  }

  return FALLBACK_IMAGE_SRC
}
