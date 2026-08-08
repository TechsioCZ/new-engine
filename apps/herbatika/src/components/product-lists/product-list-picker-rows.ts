import {
  getProductListItemCount,
  getProductListTitle,
  isFavoriteProductList,
  isProductInProductList,
} from "@/lib/storefront/product-lists"
import type { StoreProductList } from "@/lib/storefront/product-lists"

export interface ProductListPickerRow {
  key: string
  title: string
  count: number
  checked: boolean
  isFavorite: boolean
  list: StoreProductList | null
}

export const normalizeProductListPickerQuantity = (quantity: number) =>
  Number.isFinite(quantity) && quantity >= 1 ? Math.floor(quantity) : 1

export const hydrateProductLists = (
  lists: StoreProductList[],
  details: (StoreProductList | null | undefined)[],
) => {
  const detailListsById = new Map<string, StoreProductList>()

  for (const list of details) {
    if (list?.id !== undefined && list.id !== "") {
      detailListsById.set(list.id, list)
    }
  }

  return lists.map((list) => detailListsById.get(list.id) ?? list)
}

export const buildProductListPickerRows = (params: {
  favoriteTitle: string
  lists: StoreProductList[]
  productId: string
  selectedVariantId: string | null
  untitledListTitle: string
}): ProductListPickerRow[] => {
  const favoriteList =
    params.lists.find((list) => isFavoriteProductList(list)) ?? null
  const customLists = params.lists.filter(
    (list) => !isFavoriteProductList(list),
  )

  return [
    {
      checked: isProductInProductList(
        favoriteList,
        params.productId,
        params.selectedVariantId,
      ),
      count: getProductListItemCount(favoriteList),
      isFavorite: true,
      key: favoriteList?.id ?? "favorite",
      list: favoriteList,
      title: params.favoriteTitle,
    },
    ...customLists.map((list) => ({
      checked: isProductInProductList(
        list,
        params.productId,
        params.selectedVariantId,
      ),
      count: getProductListItemCount(list),
      isFavorite: false,
      key: list.id,
      list,
      title: getProductListTitle(list, {
        favorite: params.favoriteTitle,
        untitled: params.untitledListTitle,
      }),
    })),
  ]
}
