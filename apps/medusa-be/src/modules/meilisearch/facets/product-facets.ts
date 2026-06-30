type UnknownRecord = Record<string, unknown>

type ProductFacetValue = {
  id: string
  label: string
}

type FormFacetDefinition = ProductFacetValue & {
  keywords: string[]
}

export const IN_STOCK_FACET_ID = "in-stock"
export const BRAND_FACET_PREFIX = "brand-"
export const INGREDIENT_FACET_PREFIX = "ingredient-"
export const ACTIVE_INGREDIENT_ROOT = "Účinné zložky od A po Z"
export const ACTIVE_INGREDIENT_HANDLE_PREFIX = "ucinne-zlozky-od-a-po-z-"
const BIO_STATUS_REGEX = /\bbio\b/
const VEGAN_STATUS_REGEX = /\bvegan\b/

export const STATUS_FACET_DEFINITIONS: ProductFacetValue[] = [
  { id: IN_STOCK_FACET_ID, label: "Na sklade" },
  { id: "action", label: "Akcia" },
  { id: "new", label: "Novinka" },
  { id: "tip", label: "Tip" },
  { id: "bio", label: "BIO" },
  { id: "vegan", label: "Vegan" },
]

export const FORM_FACET_DEFINITIONS: FormFacetDefinition[] = [
  { id: "form-capsules", label: "Kapsuly", keywords: ["kapsul", "capsule"] },
  { id: "form-tablets", label: "Tablety", keywords: ["tablet", "tbl"] },
  { id: "form-softgel", label: "Softgel", keywords: ["softgel"] },
  { id: "form-powder", label: "Prášok", keywords: ["prasok", "prask"] },
  {
    id: "form-liquid",
    label: "Tekutiny",
    keywords: ["tekutin", "elixir", "tonikum", "extrakt"],
  },
  { id: "form-drink", label: "Nápoj", keywords: ["napoj", "drink", "caj"] },
  { id: "form-drops", label: "Kvapky", keywords: ["kvapk", "drop"] },
  { id: "form-spray", label: "Sprej", keywords: ["sprej", "spray"] },
  { id: "form-syrup", label: "Sirup", keywords: ["sirup", "syrup"] },
]

export const STATUS_FACET_IDS = new Set(
  STATUS_FACET_DEFINITIONS.map((item) => item.id)
)
export const FORM_FACET_IDS = new Set(
  FORM_FACET_DEFINITIONS.map((item) => item.id)
)

export const STATUS_FACET_LABEL_BY_ID = new Map(
  STATUS_FACET_DEFINITIONS.map((item) => [item.id, item.label])
)
export const FORM_FACET_LABEL_BY_ID = new Map(
  FORM_FACET_DEFINITIONS.map((item) => [item.id, item.label])
)

export type ProductFacetDocument = {
  facet_product_status?: string
  facet_sales_channel_ids: string[]
  facet_status: string[]
  facet_form: string[]
  facet_brand: string[]
  facet_ingredient: string[]
  facet_category_ids: string[]
  facet_in_stock: boolean
  facet_price?: number
}

const asRecord = (value: unknown): UnknownRecord | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }

  return value as UnknownRecord
}

const asArray = (value: unknown): unknown[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value
}

const getStringField = (
  value: UnknownRecord | null,
  field: string
): string | undefined => {
  const rawValue = value?.[field]
  return typeof rawValue === "string" && rawValue.trim() ? rawValue : undefined
}

const normalizeForMatch = (value: string): string =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .trim()

const toSlug = (value: string): string =>
  normalizeForMatch(value)
    .replaceAll(/[^a-z0-9-]+/g, "-")
    .replaceAll(/-+/g, "-")
    .replaceAll(/^-+/g, "")
    .replaceAll(/-+$/g, "")

const dedupe = (values: string[]): string[] => {
  const result: string[] = []
  const seen = new Set<string>()

  for (const value of values) {
    const normalized = value.trim()
    if (!normalized || seen.has(normalized)) {
      continue
    }
    seen.add(normalized)
    result.push(normalized)
  }

  return result
}

const resolveCategoryPaths = (document: UnknownRecord): string[] => {
  const metadata = asRecord(document.metadata)
  const categoryPaths = asArray(metadata?.category_paths)

  return categoryPaths.filter(
    (value): value is string => typeof value === "string"
  )
}

const resolveSalesChannelFacetIds = (document: UnknownRecord): string[] => {
  const ids: string[] = []

  for (const rawSalesChannel of asArray(document.sales_channels)) {
    const salesChannel = asRecord(rawSalesChannel)
    const id = getStringField(salesChannel, "id")
    if (id) {
      ids.push(id)
    }
  }

  for (const rawSalesChannelLink of asArray(document.sales_channels_link)) {
    const salesChannelLink = asRecord(rawSalesChannelLink)
    const salesChannelId = getStringField(salesChannelLink, "sales_channel_id")
    if (salesChannelId) {
      ids.push(salesChannelId)
    }
  }

  return dedupe(ids)
}

const resolveProductInStock = (document: UnknownRecord): boolean => {
  const metadata = asRecord(document.metadata)
  const topOffer = asRecord(metadata?.top_offer)
  const stock = asRecord(topOffer?.stock)
  const amount = stock?.amount

  if (typeof amount === "number") {
    return amount > 0
  }

  if (typeof amount === "string") {
    const parsed = Number.parseFloat(amount)
    return Number.isFinite(parsed) ? parsed > 0 : true
  }

  return true
}

const resolveActiveFlagCodes = (document: UnknownRecord): string[] => {
  const metadata = asRecord(document.metadata)
  const rawFlags = asArray(metadata?.flags)
  const codes: string[] = []

  for (const rawFlag of rawFlags) {
    const flag = asRecord(rawFlag)
    if (!flag || flag.active !== true || typeof flag.code !== "string") {
      continue
    }

    codes.push(flag.code.toLowerCase())
  }

  return dedupe(codes)
}

const resolveStatusKeywordCodes = (document: UnknownRecord): string[] => {
  const searchableText = normalizeForMatch(
    `${typeof document.title === "string" ? document.title : ""} ${resolveCategoryPaths(document).join(" ")}`
  )
  const codes: string[] = []

  if (BIO_STATUS_REGEX.test(searchableText)) {
    codes.push("bio")
  }
  if (VEGAN_STATUS_REGEX.test(searchableText)) {
    codes.push("vegan")
  }

  return codes
}

const resolveStatusFacetIds = (document: UnknownRecord): string[] => {
  const ids: string[] = []

  if (resolveProductInStock(document)) {
    ids.push(IN_STOCK_FACET_ID)
  }

  ids.push(...resolveActiveFlagCodes(document))
  ids.push(...resolveStatusKeywordCodes(document))

  return dedupe(ids)
}

const resolveFormFacetIds = (document: UnknownRecord): string[] => {
  const searchableText = normalizeForMatch(
    `${typeof document.title === "string" ? document.title : ""} ${resolveCategoryPaths(document).join(" ")}`
  )

  const ids: string[] = []

  for (const definition of FORM_FACET_DEFINITIONS) {
    if (
      !definition.keywords.some((keyword) => searchableText.includes(keyword))
    ) {
      continue
    }
    ids.push(definition.id)
  }

  return dedupe(ids)
}

const sanitizeHandle = (value: string): string | undefined => {
  const normalized = value.trim().toLowerCase()
  if (!normalized) {
    return
  }
  const slug = toSlug(normalized)
  return slug || undefined
}

const resolveBrandFacetIds = (document: UnknownRecord): string[] => {
  const brandCandidates = asArray(document.brand)
  const brand =
    brandCandidates.length > 0
      ? asRecord(brandCandidates[0])
      : asRecord(document.brand)

  if (!brand) {
    return []
  }

  const brandHandle =
    typeof brand.handle === "string" ? sanitizeHandle(brand.handle) : undefined
  const brandTitle =
    typeof brand.title === "string" ? sanitizeHandle(brand.title) : undefined
  const handle = brandHandle ?? brandTitle

  if (!handle) {
    return []
  }

  return [`${BRAND_FACET_PREFIX}${handle}`]
}

const isActiveIngredientRoot = (value: string): boolean =>
  normalizeForMatch(value) === normalizeForMatch(ACTIVE_INGREDIENT_ROOT)

const resolveIngredientFacetIds = (document: UnknownRecord): string[] => {
  const ids: string[] = []
  const categories = asArray(document.categories)

  for (const rawCategory of categories) {
    const category = asRecord(rawCategory)
    if (!category || typeof category.handle !== "string") {
      continue
    }

    if (!category.handle.startsWith(ACTIVE_INGREDIENT_HANDLE_PREFIX)) {
      continue
    }

    if (
      typeof category.name === "string" &&
      category.name.trim() &&
      isActiveIngredientRoot(category.name)
    ) {
      continue
    }

    const handle = sanitizeHandle(category.handle)
    if (!handle) {
      continue
    }

    ids.push(`${INGREDIENT_FACET_PREFIX}${handle}`)
  }

  return dedupe(ids)
}

const resolveCategoryFacetIds = (document: UnknownRecord): string[] => {
  const categories = asArray(document.categories)
  const ids: string[] = []

  for (const rawCategory of categories) {
    const category = asRecord(rawCategory)
    if (!category || typeof category.id !== "string") {
      continue
    }
    ids.push(category.id)
  }

  return dedupe(ids)
}

const parseNumericValue = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value !== "string") {
    return
  }

  const normalized = value.trim().replace(",", ".")
  if (!normalized) {
    return
  }

  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : undefined
}

const normalizeFacetPrice = (value: number | undefined): number | undefined => {
  if (value === undefined || !Number.isFinite(value) || value < 0) {
    return
  }

  return Math.round(value * 100) / 100
}

const toMajorUnitAmount = (value: number): number => {
  // Medusa price amounts are persisted in minor currency units (for example cents).
  return Number.isInteger(value) ? value / 100 : value
}

const parsePositiveFacetPrice = (value: unknown): number | undefined => {
  const parsedPrice = parseNumericValue(value)
  if (parsedPrice === undefined || parsedPrice <= 0) {
    return
  }

  return normalizeFacetPrice(parsedPrice)
}

const resolveTopOfferFacetPrice = (
  topOffer: UnknownRecord | null
): number | undefined =>
  [topOffer?.current_price, topOffer?.action_price, topOffer?.price_vat]
    .map(parsePositiveFacetPrice)
    .find((price) => price !== undefined)

const resolveVariantMinFacetPrice = (
  variants: unknown[]
): number | undefined => {
  let minPrice: number | undefined

  for (const rawVariant of variants) {
    const variant = asRecord(rawVariant)
    const prices = asArray(variant?.prices)

    for (const rawPrice of prices) {
      const price = asRecord(rawPrice)
      const amount = parseNumericValue(price?.amount)
      if (amount === undefined) {
        continue
      }

      const normalizedPrice = normalizeFacetPrice(toMajorUnitAmount(amount))
      if (normalizedPrice === undefined) {
        continue
      }

      if (minPrice === undefined || normalizedPrice < minPrice) {
        minPrice = normalizedPrice
      }
    }
  }

  return minPrice
}

const resolveFacetPrice = (document: UnknownRecord): number | undefined => {
  const metadata = asRecord(document.metadata)
  const topOfferPrice = resolveTopOfferFacetPrice(asRecord(metadata?.top_offer))

  return (
    topOfferPrice ?? resolveVariantMinFacetPrice(asArray(document.variants))
  )
}

export const buildProductFacetDocument = (
  document: unknown
): ProductFacetDocument => {
  const product = asRecord(document) ?? {}

  return {
    facet_product_status: getStringField(product, "status"),
    facet_sales_channel_ids: resolveSalesChannelFacetIds(product),
    facet_status: resolveStatusFacetIds(product),
    facet_form: resolveFormFacetIds(product),
    facet_brand: resolveBrandFacetIds(product),
    facet_ingredient: resolveIngredientFacetIds(product),
    facet_category_ids: resolveCategoryFacetIds(product),
    facet_in_stock: resolveProductInStock(product),
    facet_price: resolveFacetPrice(product),
  }
}

export const isBrandFacetId = (id: string): boolean =>
  id.startsWith(BRAND_FACET_PREFIX)

export const extractBrandHandleFromFacetId = (
  id: string
): string | undefined => {
  if (!isBrandFacetId(id)) {
    return
  }

  return id.slice(BRAND_FACET_PREFIX.length) || undefined
}

export const isIngredientFacetId = (id: string): boolean =>
  id.startsWith(INGREDIENT_FACET_PREFIX)

export const extractIngredientHandleFromFacetId = (
  id: string
): string | undefined => {
  if (!isIngredientFacetId(id)) {
    return
  }

  return id.slice(INGREDIENT_FACET_PREFIX.length) || undefined
}
