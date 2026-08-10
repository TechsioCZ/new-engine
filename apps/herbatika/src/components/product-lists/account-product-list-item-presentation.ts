import type { HttpTypes } from "@medusajs/types"

import { PRODUCT_FALLBACK_IMAGE } from "@/components/product-card/product-card.constants"
import { resolvePriceState } from "@/components/product-card/product-card.pricing"
import type { StoreProductListItem } from "@/lib/storefront/product-lists"

import { resolveProductListItemQuantity } from "./account-product-lists.utils"
import { resolveProductListItemAvailability } from "./product-list-availability"

const resolveProductTitle = (
  itemProduct: HttpTypes.StoreProduct | null,
  item: StoreProductListItem,
) => {
  const trimmedTitle = itemProduct?.title?.trim()
  if (trimmedTitle !== undefined && trimmedTitle !== "") {
    return trimmedTitle
  }
  if (
    item.product_id !== null &&
    item.product_id !== undefined &&
    item.product_id !== ""
  ) {
    return item.product_id
  }
  return item.id ?? ""
}

export const resolveProductListItemPresentation = (
  item: StoreProductListItem,
  product: HttpTypes.StoreProduct | null,
  priceUnavailableLabel: string,
) => {
  const itemProduct = product ?? item.product ?? null
  const productTitle = resolveProductTitle(itemProduct, item)
  const productHref =
    itemProduct?.handle === null ||
    itemProduct?.handle === undefined ||
    itemProduct.handle === ""
      ? "#"
      : `/p/${itemProduct.handle}`
  const price =
    itemProduct === null
      ? null
      : resolvePriceState(itemProduct, undefined, priceUnavailableLabel)

  return {
    availability: resolveProductListItemAvailability(item, itemProduct),
    imageSrc: itemProduct?.thumbnail ?? PRODUCT_FALLBACK_IMAGE,
    itemProduct,
    price,
    productHref,
    productTitle,
    quantity: resolveProductListItemQuantity(item),
  }
}
