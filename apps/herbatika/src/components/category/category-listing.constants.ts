import type { ProductSortValue } from "@/lib/storefront/plp-query-state"

export const SORT_TAB_ITEMS = [
  { labelKey: "sort.recommended", value: "recommended" },
  { labelKey: "sort.price_asc", value: "price-asc" },
  { labelKey: "sort.price_desc", value: "price-desc" },
  { labelKey: "sort.best_selling", value: "best-selling" },
  { labelKey: "sort.newest", value: "newest" },
] as const satisfies readonly {
  labelKey: string
  value: ProductSortValue
}[]
