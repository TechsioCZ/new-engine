import {
  allCategories,
  leafCategories,
  rootCategories,
} from "@/data/static/categories"

const ROOT_CATEGORIES = rootCategories.map((cat) => ({
  id: cat.id,
  handle: cat.handle,
}))

const CATEGORIES_LEAFS_IDS = ROOT_CATEGORIES.map((cat) => {
  const children = leafCategories
    .filter((leaf) => leaf.root_category_id === cat.id)
    .map((leaf) => leaf.id)
  return {
    handle: cat.handle,
    children,
  }
})

export const CATEGORY_MAP_BY_ID = Object.fromEntries(
  allCategories.map((cat) => [cat.id, cat])
)

// Alternative: All category handles from allCategories
export const VALID_CATEGORY_ROUTES = allCategories.map((cat) => cat.handle)

export const CATEGORY_MAP: Record<string, string[]> = {
  panske:
    CATEGORIES_LEAFS_IDS.find((cat) => cat.handle === "panske")?.children || [],
  damske:
    CATEGORIES_LEAFS_IDS.find((cat) => cat.handle === "damske")?.children || [],
  detske:
    CATEGORIES_LEAFS_IDS.find((cat) => cat.handle === "detske")?.children || [],
  "obleceni-category-347":
    CATEGORIES_LEAFS_IDS.find((cat) => cat.handle === "obleceni-category-347")
      ?.children || [],
  "cyklo-category-378":
    CATEGORIES_LEAFS_IDS.find((cat) => cat.handle === "cyklo-category-378")
      ?.children || [],
  "moto-category-424":
    CATEGORIES_LEAFS_IDS.find((cat) => cat.handle === "moto-category-424")
      ?.children || [],
  "snb-skate-category-448":
    CATEGORIES_LEAFS_IDS.find((cat) => cat.handle === "snb-skate-category-448")
      ?.children || [],
  "ski-category-466":
    CATEGORIES_LEAFS_IDS.find((cat) => cat.handle === "ski-category-466")
      ?.children || [],
}

// Helper: recursively find all leaf category IDs under a given category
const findAllLeafIds = (categoryId: string): string[] => {
  // Find all direct children of this category (from ALL categories)
  const directChildren = allCategories.filter(
    (cat) => cat.parent_category_id === categoryId
  )

  if (directChildren.length === 0) {
    // No children = this is a leaf category, return its ID
    const isLeaf = leafCategories.find((cat) => cat.id === categoryId)
    return isLeaf ? [categoryId] : []
  }

  // Has children - recursively find all leaf IDs under each child
  return directChildren.flatMap((child) => findAllLeafIds(child.id))
}

const allCategoriesWithLeafIds = allCategories.map((cat) => ({
  id: cat.id,
  handle: cat.handle,
  leafIds: findAllLeafIds(cat.id),
}))

// Alternative implementation using allCategories (includes ALL categories)
export const ALL_CATEGORIES_MAP: Record<string, string[]> = Object.fromEntries(
  allCategoriesWithLeafIds.map((cat) => [cat.handle, cat.leafIds])
)

export const ALL_CATEGORIES_MAP_BY_ID: Record<string, string[]> =
  Object.fromEntries(allCategoriesWithLeafIds.map((cat) => [cat.id, cat.leafIds]))

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

/**
 * Tax rate for Czech Republic (DPH)
 * Used for price calculations and display
 */
export const TAX_RATE = 0.21 // 21% VAT

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
