import type { StoreProduct } from "@medusajs/types"
import { allCategories } from "@/data/static/categories"
import type { Category } from "@/data/static/type"
import { PRODUCT_LIST_FIELDS } from "@/lib/constants"
import { buildQueryString } from "@/lib/product-query-params"
import { formatPrice } from "@/utils/format/format-product"
import { getProducts } from "./product-service"

export type ProductSuggestion = {
  id: string
  title: string
  handle: string
  thumbnail: string | null
  price: string
}

export type CategorySuggestion = {
  id: string
  name: string
  displayName: string
  handle: string
}

export type BrandSuggestion = {
  id: string
  title: string
  handle: string
}

export type SearchSuggestions = {
  products: ProductSuggestion[]
  categories: CategorySuggestion[]
  brands: BrandSuggestion[]
}

type SearchSuggestionsOptions = {
  limitPerSection?: number
  signal?: AbortSignal
  regionId?: string
  countryCode?: string
}

type ProductSuggestionsBundle = {
  products: ProductSuggestion[]
  brandsFromProducts: BrandSuggestion[]
}

type StoreRequestContext = {
  baseUrl: string
  headers: HeadersInit
  signal?: AbortSignal
}

type MeiliSearchCategoryHit = {
  id?: string
  handle?: string
  description?: string
}

type MeiliSearchCategoryHitsResponse = {
  hits?: MeiliSearchCategoryHit[]
}

type MeiliSearchProducerHit = {
  id?: string
  title?: string
  handle?: string
}

type MeiliSearchProducerHitsResponse = {
  hits?: MeiliSearchProducerHit[]
}

type ProductProducerRecord = {
  id?: string
  title?: string
  handle?: string
}

type StoreProductWithProducer = StoreProduct & {
  producer?: ProductProducerRecord
}

const DEFAULT_LIMIT_PER_SECTION = 5
const DEFAULT_COUNTRY_CODE = "cz"
const FALLBACK_THUMBNAIL = "/placeholder.jpg"
const EXPECTED_PRODUCER_FALLBACK_ERROR_REGEX =
  /HTTP (404|405|501)|Failed to fetch/i
const ROOT_CATEGORY_HANDLE_PREFIXES = new Set(["panske", "damske", "detske"])
const CATEGORY_HANDLE_SUFFIX_REGEX = /-category-\d+$/i
const SEARCH_TOKEN_SEPARATOR_REGEX = /[^a-z0-9]+/g
const EDGE_DASHES_REGEX = /^-+|-+$/g
const MIN_FUZZY_PREFIX_LENGTH = 4
const BRAND_MIN_QUERY_LENGTH = 3
const BRAND_PRODUCTS_LOOKUP_MULTIPLIER = 3
const MIN_BRAND_PRODUCTS_LOOKUP_LIMIT = 15
const SUGGESTIONS_FETCH_MULTIPLIER = 3
const PRODUCT_BRAND_FIELDS = "producer.id,producer.title,producer.handle"
const PRODUCT_SUGGESTION_FIELDS = `${PRODUCT_LIST_FIELDS}${PRODUCT_BRAND_FIELDS}`
const CATEGORY_BY_ID = new Map(
  allCategories.map((category) => [category.id, category])
)

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function getErrorName(error: unknown): string | null {
  if (error instanceof Error) {
    return error.name
  }

  if (isRecord(error) && typeof error.name === "string") {
    return error.name
  }

  return null
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  if (isRecord(error) && typeof error.message === "string") {
    return error.message
  }

  return ""
}

function isAbortLikeError(error: unknown): boolean {
  return getErrorName(error) === "AbortError"
}

function isExpectedProducerMeiliFallbackError(error: unknown): boolean {
  if (isAbortLikeError(error)) {
    return true
  }

  if (error instanceof TypeError) {
    return true
  }

  const message = getErrorMessage(error)
  return EXPECTED_PRODUCER_FALLBACK_ERROR_REGEX.test(message)
}

function shouldLogWarning(error: unknown): boolean {
  return process.env.NODE_ENV === "development" && !isAbortLikeError(error)
}

function isStringOrUndefined(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string"
}

function isMeiliSearchCategoryHit(
  value: unknown
): value is MeiliSearchCategoryHit {
  if (!isRecord(value)) {
    return false
  }

  return (
    isStringOrUndefined(value.id) &&
    isStringOrUndefined(value.handle) &&
    isStringOrUndefined(value.description)
  )
}

function isMeiliSearchCategoryHitsResponse(
  value: unknown
): value is MeiliSearchCategoryHitsResponse {
  if (!isRecord(value)) {
    return false
  }

  const hits = value.hits
  return (
    hits === undefined ||
    (Array.isArray(hits) && hits.every((hit) => isMeiliSearchCategoryHit(hit)))
  )
}

function isMeiliSearchProducerHit(
  value: unknown
): value is MeiliSearchProducerHit {
  if (!isRecord(value)) {
    return false
  }

  return (
    isStringOrUndefined(value.id) &&
    isStringOrUndefined(value.title) &&
    isStringOrUndefined(value.handle)
  )
}

function isMeiliSearchProducerHitsResponse(
  value: unknown
): value is MeiliSearchProducerHitsResponse {
  if (!isRecord(value)) {
    return false
  }

  const hits = value.hits
  return (
    hits === undefined ||
    (Array.isArray(hits) && hits.every((hit) => isMeiliSearchProducerHit(hit)))
  )
}

function isProductProducerRecord(value: unknown): value is ProductProducerRecord {
  if (!isRecord(value)) {
    return false
  }

  return (
    isStringOrUndefined(value.id) &&
    isStringOrUndefined(value.title) &&
    isStringOrUndefined(value.handle)
  )
}

function getBackendBaseUrl(): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"

  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl
}

function getStoreHeaders(): HeadersInit {
  const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  }

  if (publishableKey) {
    headers["x-publishable-api-key"] = publishableKey
  }

  return headers
}

function createStoreRequestContext(signal?: AbortSignal): StoreRequestContext {
  return {
    baseUrl: getBackendBaseUrl(),
    headers: getStoreHeaders(),
    signal,
  }
}

async function fetchJson<T>(
  url: string,
  context: StoreRequestContext,
  isValidShape: (value: unknown) => value is T
): Promise<T> {
  const response = await fetch(url, {
    headers: context.headers,
    signal: context.signal,
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(
      `HTTP ${response.status}: ${response.statusText}. ${errorBody.slice(0, 280)}`
    )
  }

  const payload: unknown = await response.json()
  if (!isValidShape(payload)) {
    throw new Error(`Invalid response payload shape from ${url}`)
  }

  return payload
}

function toProductSuggestion(product: StoreProduct): ProductSuggestion | null {
  const id = product.id?.trim()
  const title = product.title?.trim()
  const handle = product.handle?.trim()

  if (!(id && title && handle)) {
    return null
  }

  return {
    id,
    title,
    handle,
    thumbnail: product.thumbnail || FALLBACK_THUMBNAIL,
    price: formatPrice({ variants: product.variants }),
  }
}

function toSentenceCaseAfterPrefix(value: string): string {
  const characters = Array.from(value)
  const first = characters[0]
  const second = characters[1]

  if (!first) {
    return value
  }

  if (first === first.toLocaleLowerCase("cs-CZ")) {
    return value
  }

  // Keep all-caps abbreviations unchanged (for example "XC/DH").
  if (second && second !== second.toLocaleLowerCase("cs-CZ")) {
    return value
  }

  characters[0] = first.toLocaleLowerCase("cs-CZ")
  return characters.join("")
}

function resolveRootCategory(category: Category): Category | undefined {
  if (category.root_category_id) {
    return CATEGORY_BY_ID.get(category.root_category_id)
  }

  let current: Category | undefined = category
  let safetyCounter = 0

  while (current?.parent_category_id && safetyCounter < 20) {
    current = CATEGORY_BY_ID.get(current.parent_category_id)
    safetyCounter += 1
  }

  return current
}

function toCategoryDisplayName(
  category: Category | undefined,
  name: string
): string {
  if (!category) {
    return name
  }

  const rootCategory = resolveRootCategory(category)
  if (!rootCategory || rootCategory.id === category.id) {
    return name
  }

  const normalizedRootHandle = normalizeSearchText(rootCategory.handle || "")
  if (!ROOT_CATEGORY_HANDLE_PREFIXES.has(normalizedRootHandle)) {
    return name
  }

  const rootName = rootCategory.name?.trim()
  if (!rootName) {
    return name
  }

  return `${rootName} ${toSentenceCaseAfterPrefix(name)}`
}

function toCategorySuggestion(
  category: Category | undefined,
  fallback: MeiliSearchCategoryHit
): CategorySuggestion | null {
  const id = category?.id?.trim() || fallback.id?.trim()
  const name = category?.name?.trim() || fallback.description?.trim()
  const handle = category?.handle?.trim() || fallback.handle?.trim()

  if (!(id && name && handle)) {
    return null
  }

  return {
    id,
    name,
    displayName: toCategoryDisplayName(category, name),
    handle,
  }
}

type SearchFieldMatchKind = "none" | "fuzzy" | "exact"

function normalizeCategoryHandleForMatching(handle: string): string {
  return normalizeSearchText(handle.replace(CATEGORY_HANDLE_SUFFIX_REGEX, ""))
}

function tokenizeSearchText(value: string): string[] {
  return normalizeSearchText(value)
    .split(SEARCH_TOKEN_SEPARATOR_REGEX)
    .map((token) => token.trim())
    .filter(Boolean)
}

function getSharedPrefixLength(left: string, right: string): number {
  const sharedLength = Math.min(left.length, right.length)
  let index = 0

  while (index < sharedLength && left[index] === right[index]) {
    index += 1
  }

  return index
}

function hasLooseTokenMatch(sourceToken: string, queryToken: string): boolean {
  if (!(sourceToken && queryToken)) {
    return false
  }

  if (sourceToken.includes(queryToken)) {
    return true
  }

  if (
    queryToken.length >= MIN_FUZZY_PREFIX_LENGTH &&
    queryToken.startsWith(sourceToken)
  ) {
    return true
  }

  return (
    getSharedPrefixLength(sourceToken, queryToken) >= MIN_FUZZY_PREFIX_LENGTH
  )
}

function getSearchFieldMatchKind(
  normalizedSource: string,
  normalizedQuery: string,
  queryTokens: string[]
): SearchFieldMatchKind {
  if (!(normalizedSource && normalizedQuery)) {
    return "none"
  }

  if (normalizedSource.includes(normalizedQuery)) {
    return "exact"
  }

  if (queryTokens.length === 0) {
    return "none"
  }

  const sourceTokens = tokenizeSearchText(normalizedSource)

  if (sourceTokens.length === 0) {
    return "none"
  }

  const hasTokenLevelMatch = queryTokens.every((queryToken) =>
    sourceTokens.some((sourceToken) =>
      hasLooseTokenMatch(sourceToken, queryToken)
    )
  )

  return hasTokenLevelMatch ? "fuzzy" : "none"
}

function getCategorySuggestionMatchKind(
  category: CategorySuggestion,
  normalizedQuery: string,
  queryTokens: string[]
): SearchFieldMatchKind {
  const matches = [
    getSearchFieldMatchKind(
      normalizeSearchText(category.displayName),
      normalizedQuery,
      queryTokens
    ),
    getSearchFieldMatchKind(
      normalizeSearchText(category.name),
      normalizedQuery,
      queryTokens
    ),
    getSearchFieldMatchKind(
      normalizeCategoryHandleForMatching(category.handle),
      normalizedQuery,
      queryTokens
    ),
  ]

  if (matches.includes("exact")) {
    return "exact"
  }

  if (matches.includes("fuzzy")) {
    return "fuzzy"
  }

  return "none"
}

type CategoryMatchScore = {
  score: number
  hasPrimaryMatch: boolean
}

function getCategoryMatchScore(
  category: Category,
  suggestion: CategorySuggestion,
  normalizedQuery: string,
  queryTokens: string[]
): CategoryMatchScore {
  const suggestionMatch = getCategorySuggestionMatchKind(
    suggestion,
    normalizedQuery,
    queryTokens
  )

  const descriptionMatch = getSearchFieldMatchKind(
    normalizeSearchText(category.description || ""),
    normalizedQuery,
    queryTokens
  )

  const rootCategory = resolveRootCategory(category)
  const rootHandle = normalizeSearchText(rootCategory?.handle || "")
  const rootBoost = ROOT_CATEGORY_HANDLE_PREFIXES.has(rootHandle) ? 8 : 0

  const suggestionScore = getMatchKindScore(suggestionMatch, 300, 180)
  const descriptionScore = getMatchKindScore(descriptionMatch, 60, 30)
  const score = suggestionScore + descriptionScore + rootBoost

  return {
    score,
    hasPrimaryMatch: suggestionMatch !== "none",
  }
}

function getMatchKindScore(
  matchKind: SearchFieldMatchKind,
  exactScore: number,
  fuzzyScore: number
): number {
  if (matchKind === "exact") {
    return exactScore
  }

  if (matchKind === "fuzzy") {
    return fuzzyScore
  }

  return 0
}

function dedupeByKey<T>(items: T[], getKey: (item: T) => string): T[] {
  const seen = new Set<string>()
  const deduped: T[] = []

  for (const item of items) {
    const key = getKey(item)

    if (!key || seen.has(key)) {
      continue
    }

    seen.add(key)
    deduped.push(item)
  }

  return deduped
}

function dedupeProducts(items: ProductSuggestion[]): ProductSuggestion[] {
  return dedupeByKey(items, (item) => normalizeSearchText(item.title))
}

function dedupeCategories(items: CategorySuggestion[]): CategorySuggestion[] {
  return dedupeByKey(items, (item) => item.id || item.handle)
}

function buildBrandHandleFallback(title: string, id: string): string {
  const normalizedTitle = normalizeSearchText(title)
  const slug = normalizedTitle
    .replace(SEARCH_TOKEN_SEPARATOR_REGEX, "-")
    .replace(EDGE_DASHES_REGEX, "")

  return slug || id
}

function dedupeBrands(items: BrandSuggestion[]): BrandSuggestion[] {
  return dedupeByKey(items, (item) => item.id || normalizeSearchText(item.handle))
}

function getProductSuggestionsLookupLimit(limitPerSection: number): number {
  return Math.max(
    limitPerSection * SUGGESTIONS_FETCH_MULTIPLIER,
    limitPerSection
  )
}

function getBrandSuggestionsLookupLimit(limitPerSection: number): number {
  return Math.max(
    limitPerSection * BRAND_PRODUCTS_LOOKUP_MULTIPLIER,
    MIN_BRAND_PRODUCTS_LOOKUP_LIMIT
  )
}

async function fetchProductAndBrandSuggestionsFromProducts(
  query: string,
  limitPerSection: number,
  countryCode: string,
  regionId: string,
  signal?: AbortSignal
): Promise<ProductSuggestionsBundle> {
  const requestedLimit = Math.max(
    getProductSuggestionsLookupLimit(limitPerSection),
    getBrandSuggestionsLookupLimit(limitPerSection)
  )
  const { products } = await getProducts(
    {
      q: query,
      limit: requestedLimit,
      offset: 0,
      fields: PRODUCT_SUGGESTION_FIELDS,
      country_code: countryCode,
      region_id: regionId,
    },
    signal
  )

  const mapped = products
    .map((product) => toProductSuggestion(product))
    .filter((suggestion): suggestion is ProductSuggestion =>
      Boolean(suggestion)
    )

  return {
    products: dedupeProducts(mapped).slice(0, limitPerSection),
    brandsFromProducts: mapBrandsFromProducts(products, limitPerSection),
  }
}

async function fetchCategorySuggestionsFromMeili(
  query: string,
  limitPerSection: number,
  context: StoreRequestContext
): Promise<CategorySuggestion[]> {
  const normalizedQuery = normalizeSearchText(query)
  const queryTokens = tokenizeSearchText(normalizedQuery)

  if (!normalizedQuery || queryTokens.length === 0) {
    return []
  }

  const requestedLimit = Math.max(
    limitPerSection * SUGGESTIONS_FETCH_MULTIPLIER,
    limitPerSection
  )
  const hitsQueryString = buildQueryString({
    query,
    limit: requestedLimit,
    offset: 0,
  })

  const response = await fetchJson<MeiliSearchCategoryHitsResponse>(
    `${context.baseUrl}/store/meilisearch/categories-hits?${hitsQueryString}`,
    context,
    isMeiliSearchCategoryHitsResponse
  )

  const mapped = (response.hits || [])
    .map((hit) => toCategorySuggestion(CATEGORY_BY_ID.get(hit.id || ""), hit))
    .filter((category): category is CategorySuggestion => Boolean(category))

  const filtered = dedupeCategories(mapped).filter(
    (category) =>
      getCategorySuggestionMatchKind(category, normalizedQuery, queryTokens) !==
      "none"
  )

  return filtered.slice(0, limitPerSection)
}

function fetchCategorySuggestionsFromStaticData(
  query: string,
  limitPerSection: number
): CategorySuggestion[] {
  const normalizedQuery = normalizeSearchText(query)
  const queryTokens = tokenizeSearchText(normalizedQuery)

  if (!normalizedQuery || queryTokens.length === 0) {
    return []
  }

  const scoredSuggestions = allCategories
    .map((category) => {
      const suggestion = toCategorySuggestion(category, {
        id: category.id,
        handle: category.handle,
        description: category.description,
      })

      if (!suggestion) {
        return null
      }

      const match = getCategoryMatchScore(
        category,
        suggestion,
        normalizedQuery,
        queryTokens
      )

      if (match.score <= 0) {
        return null
      }

      return {
        score: match.score,
        hasPrimaryMatch: match.hasPrimaryMatch,
        suggestion,
      }
    })
    .filter(
      (
        category
      ): category is {
        hasPrimaryMatch: boolean
        score: number
        suggestion: CategorySuggestion
      } => Boolean(category)
    )
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score
      }

      return left.suggestion.displayName.localeCompare(
        right.suggestion.displayName,
        "cs-CZ"
      )
    })

  const primarySuggestions = dedupeCategories(
    scoredSuggestions
      .filter((category) => category.hasPrimaryMatch)
      .map((category) => category.suggestion)
  )

  if (primarySuggestions.length > 0) {
    return primarySuggestions.slice(0, limitPerSection)
  }

  return dedupeCategories(
    scoredSuggestions.map((category) => category.suggestion)
  ).slice(0, limitPerSection)
}

async function fetchCategorySuggestions(
  query: string,
  limitPerSection: number,
  context: StoreRequestContext
): Promise<CategorySuggestion[]> {
  let categoriesFromMeili: CategorySuggestion[] = []

  try {
    categoriesFromMeili = await fetchCategorySuggestionsFromMeili(
      query,
      limitPerSection,
      context
    )
  } catch (error) {
    if (shouldLogWarning(error)) {
      console.warn(
        "[SearchSuggestions] categories-hits endpoint failed:",
        error
      )
    }
  }

  if (categoriesFromMeili.length >= limitPerSection) {
    return categoriesFromMeili.slice(0, limitPerSection)
  }

  const categoriesFromStatic = fetchCategorySuggestionsFromStaticData(
    query,
    Math.max(limitPerSection * SUGGESTIONS_FETCH_MULTIPLIER, limitPerSection)
  )

  return dedupeCategories([
    ...categoriesFromMeili,
    ...categoriesFromStatic,
  ]).slice(0, limitPerSection)
}

function toBrandSuggestionFromProduct(
  product: StoreProduct
): BrandSuggestion | null {
  const producer = (product as StoreProductWithProducer).producer

  if (!isProductProducerRecord(producer)) {
    return null
  }

  const id = producer.id?.trim()
  const title = producer.title?.trim()

  if (!(id && title)) {
    return null
  }

  return {
    id,
    title,
    handle: producer.handle?.trim() || buildBrandHandleFallback(title, id),
  }
}

function mapBrandsFromProducts(
  products: StoreProduct[],
  limitPerSection: number
): BrandSuggestion[] {
  const byBrandId = new Map<
    string,
    {
      brand: BrandSuggestion
      count: number
      firstIndex: number
    }
  >()

  products.forEach((product, index) => {
    const brand = toBrandSuggestionFromProduct(product)

    if (!brand) {
      return
    }

    const existing = byBrandId.get(brand.id)
    if (existing) {
      existing.count += 1
      return
    }

    byBrandId.set(brand.id, {
      brand,
      count: 1,
      firstIndex: index,
    })
  })

  return Array.from(byBrandId.values())
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count
      }

      if (left.firstIndex !== right.firstIndex) {
        return left.firstIndex - right.firstIndex
      }

      return left.brand.title.localeCompare(right.brand.title, "cs-CZ")
    })
    .map((entry) => entry.brand)
    .slice(0, limitPerSection)
}

function mapProducerHits(
  hits: MeiliSearchProducerHit[] | undefined,
  query: string,
  limitPerSection: number
): BrandSuggestion[] {
  const normalizedQuery = normalizeSearchText(query)

  const mapped = (hits || [])
    .map((producer) => {
      const id = producer.id?.trim()
      const title = producer.title?.trim()
      const handle = producer.handle?.trim()

      if (!(id && title && handle)) {
        return null
      }

      if (!normalizeSearchText(title).includes(normalizedQuery)) {
        return null
      }

      return {
        id,
        title,
        handle,
      }
    })
    .filter((producer): producer is BrandSuggestion => Boolean(producer))

  return dedupeBrands(mapped).slice(0, limitPerSection)
}

async function fetchBrandSuggestionsFromMeili(
  query: string,
  limitPerSection: number,
  context: StoreRequestContext
): Promise<BrandSuggestion[]> {
  const hitsQueryString = buildQueryString({
    query,
    limit: limitPerSection,
    offset: 0,
  })

  const response = await fetchJson<MeiliSearchProducerHitsResponse>(
    `${context.baseUrl}/store/meilisearch/producers-hits?${hitsQueryString}`,
    context,
    isMeiliSearchProducerHitsResponse
  )

  return mapProducerHits(response.hits, query, limitPerSection)
}

function mergeBrandSuggestions(
  brandsFromProducts: BrandSuggestion[],
  brandsFromMeili: BrandSuggestion[],
  limitPerSection: number
): BrandSuggestion[] {
  if (brandsFromProducts.length >= limitPerSection) {
    return brandsFromProducts.slice(0, limitPerSection)
  }

  return dedupeBrands([...brandsFromMeili, ...brandsFromProducts]).slice(
    0,
    limitPerSection
  )
}

export async function getSearchSuggestions(
  query: string,
  options?: SearchSuggestionsOptions
): Promise<SearchSuggestions> {
  const trimmedQuery = query.trim()
  const limitPerSection = options?.limitPerSection || DEFAULT_LIMIT_PER_SECTION
  const countryCode = options?.countryCode || DEFAULT_COUNTRY_CODE
  const regionId = options?.regionId?.trim()

  if (!trimmedQuery) {
    return {
      products: [],
      categories: [],
      brands: [],
    }
  }

  if (!regionId) {
    return {
      products: [],
      categories: [],
      brands: [],
    }
  }

  const context = createStoreRequestContext(options?.signal)
  const shouldFetchBrands =
    normalizeSearchText(trimmedQuery).length >= BRAND_MIN_QUERY_LENGTH

  const [productBundle, categories, brandsFromMeili] = await Promise.all([
    fetchProductAndBrandSuggestionsFromProducts(
      trimmedQuery,
      limitPerSection,
      countryCode,
      regionId,
      options?.signal
    ).catch((error) => {
      if (shouldLogWarning(error)) {
        console.warn("[SearchSuggestions] products failed:", error)
      }

      return {
        products: [],
        brandsFromProducts: [],
      } satisfies ProductSuggestionsBundle
    }),
    fetchCategorySuggestions(trimmedQuery, limitPerSection, context).catch(
      (error) => {
        if (shouldLogWarning(error)) {
          console.warn("[SearchSuggestions] categories failed:", error)
        }
        return []
      }
    ),
    shouldFetchBrands
      ? fetchBrandSuggestionsFromMeili(
          trimmedQuery,
          limitPerSection,
          context
        ).catch((error) => {
          if (
            shouldLogWarning(error) &&
            !isExpectedProducerMeiliFallbackError(error)
          ) {
            console.warn(
              "[SearchSuggestions] producers-hits endpoint failed:",
              error
            )
          }

          return []
        })
      : Promise.resolve<BrandSuggestion[]>([]),
  ])

  const brands = shouldFetchBrands
    ? mergeBrandSuggestions(
        productBundle.brandsFromProducts,
        brandsFromMeili,
        limitPerSection
      )
    : []

  return {
    products: productBundle.products,
    categories,
    brands,
  }
}
