import type { ProductListBase, ProductListItemBase } from "./types"

export const getProductListItems = <
  TItem,
  TProductList extends ProductListBase<TItem>,
>(
  list?: TProductList | null
): TItem[] => list?.items ?? []

export const getProductListItemCount = <
  TItem,
  TProductList extends ProductListBase<TItem>,
>(
  list?: TProductList | null
): number => {
  if (!list) {
    return 0
  }

  if (typeof list.items_count === "number") {
    return list.items_count
  }

  if (typeof list.item_count === "number") {
    return list.item_count
  }

  return getProductListItems(list).length
}

export const isFavoriteProductList = <TItem>(
  list?: ProductListBase<TItem> | null
): boolean => list?.type === "favorite" || list?.handle === "favorites"

export const getProductListItemProductId = (
  item: ProductListItemBase
): string | null => item.product_id ?? item.product?.id ?? null

export const getProductListItemVariantId = (
  item: ProductListItemBase
): string | null => item.variant_id ?? item.variant?.id ?? null

export const resolveProductListItemQuantity = (
  item: ProductListItemBase
): number =>
  typeof item.quantity === "number" && item.quantity > 0
    ? Math.floor(item.quantity)
    : 1

const normalizeVariantId = (variantId?: string | null) => {
  if (typeof variantId !== "string") {
    return null
  }

  const trimmedVariantId = variantId.trim()
  return trimmedVariantId ? trimmedVariantId : null
}

export const productListItemMatchesSelection = (
  item: ProductListItemBase,
  productId: string,
  variantId?: string | null
): boolean => {
  if (getProductListItemProductId(item) !== productId) {
    return false
  }

  const requestedVariantId = normalizeVariantId(variantId)
  const itemVariantId = normalizeVariantId(getProductListItemVariantId(item))

  if (requestedVariantId) {
    return itemVariantId === requestedVariantId
  }

  return !itemVariantId
}

export const isProductInProductList = <
  TItem extends ProductListItemBase,
  TProductList extends ProductListBase<TItem>,
>(
  list: TProductList | null | undefined,
  productId: string,
  variantId?: string | null
): boolean =>
  (list?.items ?? []).some((item) =>
    productListItemMatchesSelection(item, productId, variantId)
  )

export const findProductListItem = <
  TItem extends ProductListItemBase,
  TProductList extends ProductListBase<TItem>,
>(
  list: TProductList | null | undefined,
  productId: string,
  variantId?: string | null
): TItem | undefined =>
  (list?.items ?? []).find((item) =>
    productListItemMatchesSelection(item, productId, variantId)
  )
