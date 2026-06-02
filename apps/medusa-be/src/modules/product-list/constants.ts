export const PRODUCT_LIST_MODULE = "product_list"

export const PRODUCT_LIST_TYPES = ["favorite", "custom"] as const

export type ProductListType = (typeof PRODUCT_LIST_TYPES)[number]

export const DEFAULT_FAVORITE_LIST_TITLE = "Favorites"
export const DEFAULT_FAVORITE_LIST_HANDLE = "favorites"
