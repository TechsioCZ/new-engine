import { getRecordValue, isRecord } from "@techsio/std/object"

import { cleanSearchText, normalizeSearchIdentifier } from "./documents"

export interface RankedProductHit {
  _rankingScore?: number
  brand?: unknown
  id?: string | number
  search_product_id?: unknown
  search_variant_id?: unknown
  search_identifiers_normalized?: unknown
  search_variant_title?: unknown
  search_variant_titles?: unknown
  title?: unknown
}

export interface RankedProductMatch {
  productId: string
  variantId?: string
}

interface SearchResultProduct {
  id?: unknown
  variants?: unknown
}

interface SearchResultVariant {
  barcode?: unknown
  ean?: unknown
  id?: unknown
  sku?: unknown
  title?: unknown
  upc?: unknown
}

const isUnknownArray = (value: unknown): value is unknown[] =>
  Array.isArray(value)

const isRankedProductHit = (value: unknown): value is RankedProductHit =>
  isRecord(value)

const getStringId = (value: unknown): string | undefined => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  return undefined
}

const getProductMatch = (
  hit: RankedProductHit,
): RankedProductMatch | undefined => {
  const productId = getStringId(hit.search_product_id) ?? getStringId(hit.id)

  if (productId === undefined || productId.length === 0) {
    return undefined
  }

  const variantId = getStringId(hit.search_variant_id)

  return variantId === undefined || variantId.length === 0
    ? { productId }
    : { productId, variantId }
}

const hasExactIdentifier = (
  hit: RankedProductHit,
  normalizedQuery: string,
): boolean =>
  Array.isArray(hit.search_identifiers_normalized) &&
  hit.search_identifiers_normalized.some(
    (value) => typeof value === "string" && value === normalizedQuery,
  )

const getSearchTokens = (value: string): string[] =>
  cleanSearchText(value)
    .normalize("NFKD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase()
    .split(/[^\p{Letter}\p{Number}]+/u)
    .filter(Boolean)

const getNormalizedSearchIdentifiers = (hit: RankedProductHit): string[] => {
  if (!Array.isArray(hit.search_identifiers_normalized)) {
    return []
  }

  return hit.search_identifiers_normalized.filter(
    (value): value is string => typeof value === "string" && Boolean(value),
  )
}

const hasPartialIdentifierMatch = (
  hit: RankedProductHit,
  normalizedQuery: string,
): boolean =>
  normalizedQuery.length > 0 &&
  getNormalizedSearchIdentifiers(hit).some(
    (identifier) =>
      identifier !== normalizedQuery && identifier.includes(normalizedQuery),
  )

const isIdentifierLikeQuery = (query: string): boolean => {
  const normalizedQuery = normalizeSearchIdentifier(query)

  return (
    /^[\p{Letter}\p{Number}_-]+$/u.test(normalizedQuery) &&
    /[\p{Number}_-]/u.test(normalizedQuery)
  )
}

const getBrandTitles = (value: unknown): unknown[] => {
  if (Array.isArray(value)) {
    return value.flatMap(getBrandTitles)
  }

  if (isRecord(value)) {
    return [getRecordValue(value, "title")]
  }

  return []
}

const hasSearchTextPrefix = (
  hit: RankedProductHit,
  query: string,
  includeBrand: boolean,
): boolean => {
  const queryTokens = getSearchTokens(query)
  const values = [
    hit.title,
    hit.search_variant_title,
    ...(isUnknownArray(hit.search_variant_titles)
      ? hit.search_variant_titles
      : []),
    ...(includeBrand ? getBrandTitles(hit.brand) : []),
  ]
  const searchableTokens = values.flatMap((value) =>
    typeof value === "string" ? getSearchTokens(value) : [],
  )

  return (
    queryTokens.length > 0 &&
    queryTokens.every((queryToken) =>
      searchableTokens.some((searchableToken) =>
        searchableToken.startsWith(queryToken),
      ),
    )
  )
}

export const isAcceptedProductHit = (
  rawHit: unknown,
  query: string,
  minimumRankingScore: number,
  strict: boolean,
): boolean => {
  if (!isRankedProductHit(rawHit)) {
    return false
  }

  const hit = rawHit
  const rankingScore = hit._rankingScore

  if (
    strict &&
    (typeof rankingScore !== "number" ||
      !Number.isFinite(rankingScore) ||
      rankingScore < minimumRankingScore)
  ) {
    return false
  }

  const normalizedQuery = normalizeSearchIdentifier(cleanSearchText(query))

  if (hasExactIdentifier(hit, normalizedQuery)) {
    return true
  }

  if (hasSearchTextPrefix(hit, query, !strict)) {
    return true
  }

  if (hasPartialIdentifierMatch(hit, normalizedQuery)) {
    return false
  }

  if (isIdentifierLikeQuery(query)) {
    return false
  }

  return (
    rankingScore === undefined ||
    (Number.isFinite(rankingScore) && rankingScore >= minimumRankingScore)
  )
}

export const selectRankedProductIds = (
  rawHits: unknown,
  query: string,
  minimumRankingScore: number,
  strict: boolean,
): {
  exactIdentifierMatch: boolean
  ids: string[]
  matches: RankedProductMatch[]
  selectedHits: RankedProductHit[]
} => {
  const hits = isUnknownArray(rawHits) ? rawHits.filter(isRankedProductHit) : []
  const cleanedQuery = cleanSearchText(query)
  const normalizedQuery = normalizeSearchIdentifier(cleanedQuery)
  const scoreFiltered =
    cleanedQuery.length > 0
      ? hits.filter((hit) =>
          isAcceptedProductHit(hit, cleanedQuery, minimumRankingScore, strict),
        )
      : hits
  const exactHits =
    normalizedQuery.length > 0
      ? scoreFiltered.filter((hit) => hasExactIdentifier(hit, normalizedQuery))
      : []
  const selectedHits = exactHits.length > 0 ? exactHits : scoreFiltered
  const matches = selectedHits
    .map(getProductMatch)
    .filter((match): match is RankedProductMatch => match !== undefined)

  return {
    exactIdentifierMatch: exactHits.length > 0,
    ids: matches.map((match) => match.productId),
    matches,
    selectedHits,
  }
}

export const buildProductResultFilter = (
  separateVariantResults: boolean,
  query: string,
): string =>
  separateVariantResults && cleanSearchText(query).length > 0
    ? '(search_result_kind = "variant" OR (search_result_kind = "product" AND search_has_variants = false))'
    : 'search_result_kind = "product"'

const getProductRecordId = (product: SearchResultProduct): string | undefined =>
  getStringId(product.id)

const getVariantTitle = (
  variant: SearchResultVariant,
  variantId: string,
): string => {
  for (const field of ["title", "sku", "ean", "upc", "barcode"]) {
    const value = getRecordValue(variant, field)

    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim()
    }
  }

  return variantId
}

export const expandProductsBySearchMatches = <
  Product extends SearchResultProduct,
>(
  products: Product[],
  matches: RankedProductMatch[],
) => {
  const productsById = new Map(
    products.map((product) => [getProductRecordId(product), product]),
  )

  return matches.flatMap((match) => {
    const product = productsById.get(match.productId)

    if (product === undefined) {
      return []
    }

    if (
      match.variantId === undefined ||
      match.variantId.length === 0 ||
      !isUnknownArray(product.variants)
    ) {
      return [product]
    }

    const variants = product.variants.filter(isRecord)
    const matchedVariant = variants.find(
      (variant) =>
        getStringId(getRecordValue(variant, "id")) === match.variantId,
    )

    if (matchedVariant === undefined) {
      return [product]
    }

    return [
      {
        ...product,

        search_result: {
          variant_id: match.variantId,
          variant_title: getVariantTitle(matchedVariant, match.variantId),
        },

        variants: [
          matchedVariant,
          ...variants.filter(
            (variant) =>
              getStringId(getRecordValue(variant, "id")) !== match.variantId,
          ),
        ],
      },
    ]
  })
}

export const getSalesChannelIds = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string")
  }

  if (typeof value === "string") {
    return [value]
  }

  if (isRecord(value)) {
    const inValue = getRecordValue(value, "$in")

    if (Array.isArray(inValue)) {
      return inValue.filter((item): item is string => typeof item === "string")
    }
  }

  return []
}
