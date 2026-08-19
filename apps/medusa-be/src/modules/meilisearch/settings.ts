const TYPO_TOLERANCE_SETTINGS = {
  enabled: true,

  minWordSizeForTypos: {
    oneTypo: 4,
    twoTypos: 6,
  },

  disableOnWords: [],
  disableOnAttributes: ["search_identifiers", "search_identifiers_normalized"],
  disableOnNumbers: true,
}

const COMMON_SETTINGS = {
  typoTolerance: TYPO_TOLERANCE_SETTINGS,

  pagination: {
    maxTotalHits: 500,
  },

  proximityPrecision: "byAttribute",
}

export const PRODUCT_INDEX_SETTINGS = {
  ...COMMON_SETTINGS,
  searchableAttributes: [
    "search_identifiers",
    "title",
    "search_variant_titles",
    "brand.title",
    "categories.name",
    "description",
    "handle",
  ],

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
    "facet_collection_id",
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
    "facet_collection_id",
    "facet_sales_channel_ids",
    "facet_status",
    "facet_form",
    "facet_brand",
    "facet_ingredient",
    "facet_category_ids",
    "facet_in_stock",
    "facet_price",
  ],

  sortableAttributes: [
    "created_at",
    "title",
    "facet_price",
    "facet_popularity",
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
}

export const CATEGORY_INDEX_SETTINGS = {
  ...COMMON_SETTINGS,
  searchableAttributes: ["name", "description", "product_titles", "handle"],
  displayedAttributes: [
    "id",
    "name",
    "description",
    "handle",
    "parent_category_id",
  ],
  filterableAttributes: ["id", "handle", "parent_category_id"],
}

export const BRAND_INDEX_SETTINGS = {
  ...COMMON_SETTINGS,
  searchableAttributes: ["title", "description", "handle"],
  displayedAttributes: ["id", "title", "description", "handle"],
  filterableAttributes: ["id", "handle"],
}

export const CONTENT_INDEX_SETTINGS = {
  ...COMMON_SETTINGS,
  searchableAttributes: ["title", "excerpt", "content", "slug"],
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
}

export const SEARCH_INDEX_SETTINGS = {
  product: PRODUCT_INDEX_SETTINGS,
  category: CATEGORY_INDEX_SETTINGS,
  brand: BRAND_INDEX_SETTINGS,
  content: CONTENT_INDEX_SETTINGS,
} as const
