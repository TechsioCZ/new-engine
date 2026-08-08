export const MEILISEARCH_MAX_TOTAL_HITS = 1000

const TYPO_TOLERANCE_SETTINGS = {
  disableOnAttributes: ["search_identifiers", "search_identifiers_normalized"],

  disableOnNumbers: true,

  disableOnWords: [],

  enabled: true,

  minWordSizeForTypos: {
    oneTypo: 4,
    twoTypos: 6,
  },
}

const COMMON_SETTINGS = {
  pagination: {
    maxTotalHits: MEILISEARCH_MAX_TOTAL_HITS,
  },

  proximityPrecision: "byAttribute",

  typoTolerance: TYPO_TOLERANCE_SETTINGS,
}

export const PRODUCT_INDEX_SETTINGS = {
  ...COMMON_SETTINGS,
  displayedAttributes: [
    "id",
    "status",
    "title",
    "description",
    "thumbnail",
    "handle",
    "created_at",
    "metadata",
    "brand",
    "categories",
    "sales_channels",
    "search_identifiers_normalized",
    "search_has_variants",
    "search_product_id",
    "search_result_kind",
    "search_variant_id",
    "search_variant_title",
    "search_variant_titles",
    "facet_product_status",
    "facet_sales_channel_ids",
    "facet_status",
    "facet_form",
    "facet_brand",
    "facet_ingredient",
    "facet_category_ids",
    "facet_in_stock",
    "facet_price",
    "facet_popularity",
  ],

  filterableAttributes: [
    "id",
    "handle",
    "search_identifiers_normalized",
    "search_has_variants",
    "search_result_kind",
    "facet_product_status",
    "facet_sales_channel_ids",
    "facet_status",
    "facet_form",
    "facet_brand",
    "facet_ingredient",
    "facet_category_ids",
    "facet_in_stock",
    "facet_price",
  ],

  rankingRules: [
    "words",
    "typo",
    "proximity",
    "attributeRank",
    "sort",
    "wordPosition",
    "exactness",
  ],

  searchableAttributes: [
    "search_identifiers",
    "title",
    "search_variant_titles",
    "brand.title",
    "categories.name",
    "description",
    "handle",
  ],

  sortableAttributes: [
    "created_at",
    "title",
    "facet_price",
    "facet_popularity",
  ],
}

export const CATEGORY_INDEX_SETTINGS = {
  ...COMMON_SETTINGS,
  displayedAttributes: [
    "id",
    "name",
    "description",
    "handle",
    "parent_category_id",
  ],
  filterableAttributes: ["id", "handle", "parent_category_id"],
  searchableAttributes: ["name", "description", "product_titles", "handle"],
}

export const BRAND_INDEX_SETTINGS = {
  ...COMMON_SETTINGS,
  displayedAttributes: ["id", "title", "description", "handle"],
  filterableAttributes: ["id", "handle"],
  searchableAttributes: ["title", "description", "handle"],
}

export const CONTENT_INDEX_SETTINGS = {
  ...COMMON_SETTINGS,
  displayedAttributes: [
    "id",
    "source_id",
    "type",
    "locale",
    "title",
    "excerpt",
    "slug",
    "href",
  ],
  filterableAttributes: ["id", "source_id", "type", "locale", "slug"],
  searchableAttributes: ["title", "excerpt", "content", "slug"],
}

export const SEARCH_INDEX_SETTINGS = {
  brand: BRAND_INDEX_SETTINGS,
  category: CATEGORY_INDEX_SETTINGS,
  content: CONTENT_INDEX_SETTINGS,
  product: PRODUCT_INDEX_SETTINGS,
} as const
