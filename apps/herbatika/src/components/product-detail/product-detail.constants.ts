export const PRODUCT_FALLBACK_IMAGE = "/file.svg";

export const RELATED_PRODUCTS_PER_SECTION = 4;

export const RELATED_SECTION_TITLES = [
  "Ďalšie kúpil tiež",
  "Súvisiace produkty",
  "Naposledy navštívené",
] as const;

export const RELATED_PRODUCTS_LIMIT =
  RELATED_PRODUCTS_PER_SECTION * RELATED_SECTION_TITLES.length + 1;

export const PRODUCT_DETAIL_SECTION_ORDER = [
  "description",
  "usage",
  "composition",
  "warning",
  "other",
] as const;

export const PRODUCT_DETAIL_SECTION_TITLES: Record<string, string> = {
  description: "Popis",
  usage: "Použitie",
  composition: "Zloženie",
  warning: "Upozornenie",
  other: "Ostatné informácie",
};

export const PDP_FREE_SHIPPING_THRESHOLD = 49;
