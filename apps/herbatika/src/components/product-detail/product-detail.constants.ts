export { FALLBACK_IMAGE_SRC as PRODUCT_FALLBACK_IMAGE } from "@/components/fallback-image.constants"

export const RELATED_PRODUCTS_PER_SECTION = 4

export const RELATED_RECOMMENDATION_SECTION_TITLES = [
  "Ďalšie kúpil tiež",
  "Súvisiace produkty",
] as const

export const RELATED_PRODUCTS_LIMIT =
  RELATED_PRODUCTS_PER_SECTION * RELATED_RECOMMENDATION_SECTION_TITLES.length +
  1

export const PRODUCT_DETAIL_SECTION_ORDER = [
  "description",
  "usage",
  "composition",
  "warning",
  "other",
] as const

export const PRODUCT_DETAIL_SECTION_TITLES: Record<string, string> = {
  description: "Popis",
  usage: "Použitie",
  composition: "Zloženie",
  warning: "Upozornenie",
  other: "Ostatné informácie",
}
