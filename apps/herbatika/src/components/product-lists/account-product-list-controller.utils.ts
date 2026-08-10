import { isFavoriteProductList } from "@/lib/storefront/product-lists"
import type { StoreProductList } from "@/lib/storefront/product-lists"

export const resolveActiveListId = (
  sortedLists: StoreProductList[],
  requestedListId: string | null,
  selectedListId: string | null,
) => {
  if (sortedLists.some((list) => list.id === requestedListId)) {
    return requestedListId
  }
  if (sortedLists.some((list) => list.id === selectedListId)) {
    return selectedListId
  }
  return sortedLists[0]?.id ?? null
}

export const resolveActiveList = (
  sortedLists: StoreProductList[],
  queriedList: StoreProductList | null,
  activeListId: string | null,
) => queriedList ?? sortedLists.find((list) => list.id === activeListId) ?? null

export const resolveDeleteList = (
  sortedLists: StoreProductList[],
  deleteListId: string | null,
) =>
  sortedLists.find(
    (list) => list.id === deleteListId && !isFavoriteProductList(list),
  ) ?? null

export const hasRegionSelection = (
  regionId: string | undefined,
  countryCode: string | undefined,
) =>
  (regionId !== undefined && regionId !== "") ||
  (countryCode !== undefined && countryCode !== "")

export const resolveRegionMutationOptions = (
  regionId: string | undefined,
  countryCode: string | undefined,
) => ({
  ...(regionId === undefined ? {} : { regionId }),
  ...(countryCode === undefined ? {} : { countryCode }),
})

export const shouldLoadProductListProducts = (
  regionId: string | undefined,
  activeListId: string | null,
  productCount: number,
) => {
  const hasRegionId = regionId !== undefined && regionId !== ""
  const hasActiveListId = activeListId !== null && activeListId !== ""
  return hasRegionId && hasActiveListId && productCount > 0
}
