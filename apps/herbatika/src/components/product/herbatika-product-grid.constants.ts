const CATALOG_PRODUCT_GRID_CLASSNAME =
  "grid grid-cols-1 gap-300 sm:grid-cols-2 xl:grid-cols-3"
const COLLECTION_PRODUCT_GRID_CLASSNAME =
  "grid grid-cols-1 gap-400 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"

export const HERBATIKA_PRODUCT_GRID_LAYOUT_CLASSNAME = {
  catalog: CATALOG_PRODUCT_GRID_CLASSNAME,
  collection: COLLECTION_PRODUCT_GRID_CLASSNAME,
} as const

export type HerbatikaProductGridLayout =
  keyof typeof HERBATIKA_PRODUCT_GRID_LAYOUT_CLASSNAME
