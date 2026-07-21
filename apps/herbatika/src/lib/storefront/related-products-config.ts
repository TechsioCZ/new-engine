export const RELATED_PRODUCTS_PER_SECTION = 4

export const RELATED_PRODUCT_SECTION_MESSAGE_KEYS = [
  "product_detail.related.also_bought",
  "product_detail.related.products",
] as const

export const RELATED_PRODUCTS_LIMIT =
  RELATED_PRODUCTS_PER_SECTION * RELATED_PRODUCT_SECTION_MESSAGE_KEYS.length + 1
