import { getRecordValue, isRecord } from "@techsio/std/object"

interface ProductFacetValue {
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
const BIO_STATUS_REGEX = /\bbio\b/u
const VEGAN_STATUS_REGEX = /\bvegan\b/u
const NUMERIC_PREFIX_REGEX = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/iu

export const STATUS_FACET_DEFINITIONS: ProductFacetValue[] = [
  { id: IN_STOCK_FACET_ID, label: "Na sklade" },
  { id: "action", label: "Akcia" },
  { id: "new", label: "Novinka" },
  { id: "tip", label: "Tip" },
  { id: "bio", label: "BIO" },
  { id: "vegan", label: "Vegan" },
]

export const FORM_FACET_DEFINITIONS: FormFacetDefinition[] = [
  { id: "form-capsules", keywords: ["kapsul", "capsule"], label: "Kapsuly" },
  { id: "form-tablets", keywords: ["tablet", "tbl"], label: "Tablety" },
  { id: "form-softgel", keywords: ["softgel"], label: "Softgel" },
  { id: "form-powder", keywords: ["prasok", "prask"], label: "Prášok" },
  {
    id: "form-liquid",
    keywords: ["tekutin", "elixir", "tonikum", "extrakt"],
    label: "Tekutiny",
  },
  { id: "form-drink", keywords: ["napoj", "drink", "caj"], label: "Nápoj" },
  { id: "form-drops", keywords: ["kvapk", "drop"], label: "Kvapky" },
  { id: "form-spray", keywords: ["sprej", "spray"], label: "Sprej" },
  { id: "form-syrup", keywords: ["sirup", "syrup"], label: "Sirup" },
]

export const STATUS_FACET_IDS = new Set(
  STATUS_FACET_DEFINITIONS.map((item) => item.id),
)
export const FORM_FACET_IDS = new Set(
  FORM_FACET_DEFINITIONS.map((item) => item.id),
)

export const STATUS_FACET_LABEL_BY_ID = new Map(
  STATUS_FACET_DEFINITIONS.map((item) => [item.id, item.label]),
)
export const FORM_FACET_LABEL_BY_ID = new Map(
  FORM_FACET_DEFINITIONS.map((item) => [item.id, item.label]),
)

export interface ProductFacetDocument {
  facet_product_status?: string | undefined
  facet_sales_channel_ids: string[]
  facet_status: string[]
  facet_form: string[]
  facet_brand: string[]
  facet_ingredient: string[]
  facet_category_ids: string[]
  facet_in_stock: boolean
  facet_price?: number | undefined
}

const asRecord = (value: unknown): object | null =>
  isRecord(value) ? value : null

const asArray = (value: unknown): unknown[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value
}

const getStringField = (
  value: object | null,
  field: string,
): string | undefined => {
  const rawValue = value && getRecordValue(value, field)
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
    .replaceAll(/[^a-z0-9-]+/gu, "-")
    .replaceAll(/-+/gu, "-")
    .replaceAll(/^-+/gu, "")
    .replaceAll(/-+$/gu, "")

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

const resolveCategoryPaths = (document: object): string[] => {
  const metadata = asRecord(getRecordValue(document, "metadata"))
  const categoryPaths = asArray(
    metadata && getRecordValue(metadata, "category_paths"),
  )

  return categoryPaths.filter(
    (value): value is string => typeof value === "string",
  )
}

const resolveSalesChannelFacetIds = (document: object): string[] => {
  const ids: string[] = []

  for (const rawSalesChannel of asArray(
    getRecordValue(document, "sales_channels"),
  )) {
    const salesChannel = asRecord(rawSalesChannel)
    const id = getStringField(salesChannel, "id")
    if (id !== undefined) {
      ids.push(id)
    }
  }

  for (const rawSalesChannelLink of asArray(
    getRecordValue(document, "sales_channels_link"),
  )) {
    const salesChannelLink = asRecord(rawSalesChannelLink)
    const salesChannelId = getStringField(salesChannelLink, "sales_channel_id")
    if (salesChannelId !== undefined) {
      ids.push(salesChannelId)
    }
  }

  return dedupe(ids)
}

const parseNumericPrefix = (value: string): number | undefined => {
  const numericPrefix = NUMERIC_PREFIX_REGEX.exec(value.trim())?.[0]
  if (numericPrefix === undefined) {
    return undefined
  }

  const parsed = Number(numericPrefix)
  return Number.isFinite(parsed) ? parsed : undefined
}

const resolveProductInStock = (document: object): boolean => {
  const metadata = asRecord(getRecordValue(document, "metadata"))
  const topOffer = asRecord(metadata && getRecordValue(metadata, "top_offer"))
  const stock = asRecord(topOffer && getRecordValue(topOffer, "stock"))
  const amount = stock && getRecordValue(stock, "amount")

  if (typeof amount === "number") {
    return amount > 0
  }

  if (typeof amount === "string") {
    const parsed = parseNumericPrefix(amount)
    return parsed === undefined ? true : parsed > 0
  }

  return true
}

const resolveActiveFlagCodes = (document: object): string[] => {
  const metadata = asRecord(getRecordValue(document, "metadata"))
  const rawFlags = asArray(metadata && getRecordValue(metadata, "flags"))
  const codes: string[] = []

  for (const rawFlag of rawFlags) {
    const flag = asRecord(rawFlag)
    if (flag && getRecordValue(flag, "active") === true) {
      const code = getRecordValue(flag, "code")
      if (typeof code === "string") {
        codes.push(code.toLowerCase())
      }
    }
  }

  return dedupe(codes)
}

const resolveStatusKeywordCodes = (document: object): string[] => {
  const title = getRecordValue(document, "title")
  const searchableText = normalizeForMatch(
    `${typeof title === "string" ? title : ""} ${resolveCategoryPaths(document).join(" ")}`,
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

const resolveStatusFacetIds = (document: object): string[] => {
  const ids: string[] = []

  if (resolveProductInStock(document)) {
    ids.push(IN_STOCK_FACET_ID)
  }

  ids.push(
    ...resolveActiveFlagCodes(document),
    ...resolveStatusKeywordCodes(document),
  )

  return dedupe(ids)
}

const resolveFormFacetIds = (document: object): string[] => {
  const title = getRecordValue(document, "title")
  const searchableText = normalizeForMatch(
    `${typeof title === "string" ? title : ""} ${resolveCategoryPaths(document).join(" ")}`,
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
    return undefined
  }
  const slug = toSlug(normalized)
  return slug === "" ? undefined : slug
}

const resolveBrandFacetIds = (document: object): string[] => {
  const rawBrand = getRecordValue(document, "brand")
  const brandCandidates = asArray(rawBrand)
  const brand =
    brandCandidates.length > 0
      ? asRecord(brandCandidates[0])
      : asRecord(rawBrand)

  if (!brand) {
    return []
  }

  const rawHandle = getRecordValue(brand, "handle")
  const rawTitle = getRecordValue(brand, "title")
  const brandHandle =
    typeof rawHandle === "string" ? sanitizeHandle(rawHandle) : undefined
  const brandTitle =
    typeof rawTitle === "string" ? sanitizeHandle(rawTitle) : undefined
  const handle = brandHandle ?? brandTitle

  if (handle === undefined) {
    return []
  }

  return [`${BRAND_FACET_PREFIX}${handle}`]
}

const isActiveIngredientRoot = (value: string): boolean =>
  normalizeForMatch(value) === normalizeForMatch(ACTIVE_INGREDIENT_ROOT)

const resolveIngredientFacetIds = (document: object): string[] => {
  const ids: string[] = []
  const categories = asArray(getRecordValue(document, "categories"))

  for (const rawCategory of categories) {
    const category = asRecord(rawCategory)
    const categoryHandle = category && getRecordValue(category, "handle")
    const categoryName = category && getRecordValue(category, "name")
    const isRoot =
      typeof categoryName === "string" &&
      Boolean(categoryName.trim()) &&
      isActiveIngredientRoot(categoryName)
    const handle =
      typeof categoryHandle === "string" &&
      categoryHandle.startsWith(ACTIVE_INGREDIENT_HANDLE_PREFIX) &&
      !isRoot
        ? sanitizeHandle(categoryHandle)
        : undefined

    if (handle !== undefined) {
      ids.push(`${INGREDIENT_FACET_PREFIX}${handle}`)
    }
  }

  return dedupe(ids)
}

const resolveCategoryFacetIds = (document: object): string[] => {
  const categories = asArray(getRecordValue(document, "categories"))
  const ids: string[] = []

  for (const rawCategory of categories) {
    const category = asRecord(rawCategory)
    if (category) {
      const id = getRecordValue(category, "id")
      if (typeof id === "string") {
        ids.push(id)
      }
    }
  }

  return dedupe(ids)
}

const parseNumericValue = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value !== "string") {
    return undefined
  }

  const normalized = value.trim().replace(",", ".")
  if (!normalized) {
    return undefined
  }

  return parseNumericPrefix(normalized)
}

const normalizeFacetPrice = (value: number | undefined): number | undefined => {
  if (value === undefined || !Number.isFinite(value) || value < 0) {
    return undefined
  }

  return Math.round(value * 100) / 100
}

const toMajorUnitAmount = (value: number): number =>
  // Medusa price amounts are persisted in minor currency units (for example cents).
  Number.isInteger(value) ? value / 100 : value

const parsePositiveFacetPrice = (value: unknown): number | undefined => {
  const parsedPrice = parseNumericValue(value)
  if (parsedPrice === undefined || parsedPrice <= 0) {
    return undefined
  }

  return normalizeFacetPrice(parsedPrice)
}

const resolveTopOfferFacetPrice = (
  topOffer: object | null,
): number | undefined =>
  ["current_price", "action_price", "price_vat"]
    .map((field) => topOffer && getRecordValue(topOffer, field))
    .map(parsePositiveFacetPrice)
    .find((price) => price !== undefined)

const resolveVariantMinFacetPrice = (
  variants: unknown[],
): number | undefined => {
  let currencyCode: string | undefined
  let minPrice: number | undefined

  for (const rawVariant of variants) {
    const variant = asRecord(rawVariant)
    const prices = asArray(variant && getRecordValue(variant, "prices"))

    for (const rawPrice of prices) {
      const price = asRecord(rawPrice)
      const rawCurrencyCode = price && getRecordValue(price, "currency_code")
      if (
        typeof rawCurrencyCode !== "string" ||
        rawCurrencyCode.trim().length === 0
      ) {
        continue
      }
      const normalizedCurrencyCode = rawCurrencyCode.trim().toLowerCase()
      if (
        currencyCode !== undefined &&
        normalizedCurrencyCode !== currencyCode
      ) {
        return undefined
      }
      currencyCode = normalizedCurrencyCode

      const amount = parseNumericValue(price && getRecordValue(price, "amount"))
      const normalizedPrice =
        amount === undefined
          ? undefined
          : normalizeFacetPrice(toMajorUnitAmount(amount))

      if (
        normalizedPrice !== undefined &&
        (minPrice === undefined || normalizedPrice < minPrice)
      ) {
        minPrice = normalizedPrice
      }
    }
  }

  return minPrice
}

const resolveFacetPrice = (document: object): number | undefined => {
  const metadata = asRecord(getRecordValue(document, "metadata"))
  const topOfferPrice = resolveTopOfferFacetPrice(
    asRecord(metadata && getRecordValue(metadata, "top_offer")),
  )

  return (
    topOfferPrice ??
    resolveVariantMinFacetPrice(asArray(getRecordValue(document, "variants")))
  )
}

export const buildProductFacetDocument = (
  document: unknown,
): ProductFacetDocument => {
  const product = asRecord(document) ?? {}

  return {
    facet_brand: resolveBrandFacetIds(product),
    facet_category_ids: resolveCategoryFacetIds(product),
    facet_form: resolveFormFacetIds(product),
    facet_in_stock: resolveProductInStock(product),
    facet_ingredient: resolveIngredientFacetIds(product),
    facet_price: resolveFacetPrice(product),
    facet_product_status: getStringField(product, "status"),
    facet_sales_channel_ids: resolveSalesChannelFacetIds(product),
    facet_status: resolveStatusFacetIds(product),
  }
}

export const isBrandFacetId = (id: string): boolean =>
  id.startsWith(BRAND_FACET_PREFIX)

export const extractBrandHandleFromFacetId = (
  id: string,
): string | undefined => {
  if (!isBrandFacetId(id)) {
    return undefined
  }

  return id.slice(BRAND_FACET_PREFIX.length) || undefined
}

export const isIngredientFacetId = (id: string): boolean =>
  id.startsWith(INGREDIENT_FACET_PREFIX)

export const extractIngredientHandleFromFacetId = (
  id: string,
): string | undefined => {
  if (!isIngredientFacetId(id)) {
    return undefined
  }

  return id.slice(INGREDIENT_FACET_PREFIX.length) || undefined
}
