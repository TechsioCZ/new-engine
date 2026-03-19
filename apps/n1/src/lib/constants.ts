export const PRODUCT_DETAILED_FIELDS =
  "id,title,subtitle,description,handle,thumbnail,images.id,images.url," +
  "producer.title,producer.attributes.value,producer.attributes.attributeType.name," +
  "variants.id,variants.title,variants.sku,variants.ean,variants.upc," +
  "variants.material,variants.allow_backorder,variants.manage_inventory," +
  "variants.inventory_quantity," +
  "variants.calculated_price," +
  "categories.id,categories.parent_category_id"

export const PRODUCT_LIST_FIELDS =
  "id,title,handle,thumbnail," +
  "variants.title," +
  "variants.manage_inventory," +
  "variants.inventory_quantity," +
  "variants.calculated_price,"

export const PRODUCT_LIMIT = 24 as const

export const FREE_SHIPPING_THRESHOLD = 1500

/**
 * Default country code for addresses and regions
 */
export const DEFAULT_COUNTRY_CODE = "cz"

/**
 * Supported countries for shipping addresses
 */
export const COUNTRY_OPTIONS = [
  {
    value: "cz",
    label: "Česká republika",
    displayValue: "Česká republika",
    phonePrefix: "+420",
  },
  // { value: 'sk', label: 'Slovensko', displayValue: 'Slovensko' },
]

/**
 * Cache times (in milliseconds) for React Query
 */
export const CACHE_TIMES = {
  /** Shipping options staleTime - 5 minutes */
  SHIPPING_OPTIONS_STALE: 5 * 60 * 1000,
  /** Shipping options gcTime - 30 minutes */
  SHIPPING_OPTIONS_GC: 30 * 60 * 1000,
  /** Payment providers staleTime - 5 minutes */
  PAYMENT_PROVIDERS_STALE: 5 * 60 * 1000,
} as const

/**
 * Currency defaults
 */
export const DEFAULT_CURRENCY = "czk"
export const CURRENCY_SYMBOL = "Kč"
