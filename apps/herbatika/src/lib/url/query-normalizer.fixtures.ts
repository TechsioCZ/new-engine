export const allowedQueryKeyCases = [
  ["product-detail", "variant"],
  ["product-index", "page"],
  ["product-index", "sort"],
  ["product-index", "status"],
  ["product-index", "form"],
  ["product-index", "brand"],
  ["product-index", "ingredient"],
  ["product-index", "price_min"],
  ["product-index", "price_max"],
  ["category-detail", "brand"],
  ["brand-detail", "ingredient"],
  ["collection-detail", "brand"],
  ["campaign-detail", "brand"],
  ["advice-index", "page"],
  ["search", "q"],
  ["search", "page"],
  ["search", "brand"],
  ["account-orders", "page"],
] as const

export const forbiddenQueryKeyCases = [
  ["product-detail", "q"],
  ["brand-detail", "brand"],
  ["category-index", "page"],
  ["brand-index", "sort"],
  ["collection-index", "status"],
  ["campaign-index", "form"],
  ["advice-article", "page"],
  ["information-detail", "q"],
  ["static-page", "page"],
  ["homepage", "sort"],
  ["account-orders", "sort"],
] as const

export const invalidPageValues = [
  "0",
  "01",
  "+1",
  "-1",
  "1.5",
  "9007199254740992",
] as const

export const validSortValues = [
  "newest",
  "price-asc",
  "price-desc",
  "name-asc",
  "name-desc",
  "bestsellers",
] as const

export const invalidPriceValues = [
  "",
  ".5",
  "1.",
  "1.234",
  "-1",
  "+1",
  "1,50",
  "1e2",
] as const

export const canonicalSerializationCases = [
  ["q=Green%20Tea", "q=Green+Tea"],
  ["q=%C4%8Daj", "q=%C4%8Daj"],
  ["q=100%25%20Herbal", "q=100%25+Herbal"],
] as const
