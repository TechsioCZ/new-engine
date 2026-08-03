export const PRODUCT_SORT_VALUES = [
  "recommended",
  "best-selling",
  "newest",
  "oldest",
  "price-asc",
  "price-desc",
  "title-asc",
  "title-desc",
] as const

export type ProductSortValue = (typeof PRODUCT_SORT_VALUES)[number]

export const PLP_PAGE_SIZE = 12
