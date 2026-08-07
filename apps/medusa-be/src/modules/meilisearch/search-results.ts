import { cleanSearchText, normalizeSearchIdentifier } from './documents'

export type RankedProductHit = {
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

export type RankedProductMatch = {
	productId: string
	variantId?: string
}

const getStringId = (value: unknown): string | undefined => {
	if (typeof value === 'string' && value.trim()) {
		return value
	}

	if (typeof value === 'number' && Number.isFinite(value)) {
		return String(value)
	}

	return
}

const getProductMatch = (hit: RankedProductHit): RankedProductMatch | undefined => {
	const productId = getStringId(hit.search_product_id) ?? getStringId(hit.id)

	if (!productId) {
		return
	}

	const variantId = getStringId(hit.search_variant_id)

	return variantId ? { productId: productId, variantId: variantId } : { productId: productId }
}

const hasExactIdentifier = (hit: RankedProductHit, normalizedQuery: string): boolean => Array.isArray(hit.search_identifiers_normalized) && hit.search_identifiers_normalized.some((value) => typeof value === 'string' && value === normalizedQuery)

const getSearchTokens = (value: string): string[] => cleanSearchText(value).normalize('NFKD').replaceAll(/\p{Diacritic}/gu, '').toLocaleLowerCase().split(/[^\p{Letter}\p{Number}]+/u).filter(Boolean)

const getNormalizedSearchIdentifiers = (hit: RankedProductHit): string[] => {
	if (!Array.isArray(hit.search_identifiers_normalized)) {
		return []
	}

	return hit.search_identifiers_normalized.filter((value): value is string => typeof value === 'string' && Boolean(value))
}

const hasPartialIdentifierMatch = (hit: RankedProductHit, normalizedQuery: string): boolean => Boolean(normalizedQuery) && getNormalizedSearchIdentifiers(hit).some((identifier) => identifier !== normalizedQuery && identifier.includes(normalizedQuery))

const isIdentifierLikeQuery = (query: string): boolean => {
	const normalizedQuery = normalizeSearchIdentifier(query)

	return /^[\p{Letter}\p{Number}_-]+$/u.test(normalizedQuery) && /[\p{Number}_-]/u.test(normalizedQuery)
}

const getBrandTitles = (value: unknown): unknown[] => {
	if (Array.isArray(value)) {
		return value.flatMap(getBrandTitles)
	}

	if (value && typeof value === 'object') {
		return [(value as { title?: unknown }).title]
	}

	return []
}

const hasSearchTextPrefix = (hit: RankedProductHit, query: string, includeBrand: boolean): boolean => {
	const queryTokens = getSearchTokens(query)
	const values = [hit.title, hit.search_variant_title, ...(Array.isArray(hit.search_variant_titles) ? hit.search_variant_titles : []), ...(includeBrand ? getBrandTitles(hit.brand) : [])]
	const searchableTokens = values.flatMap((value) => typeof value === 'string' ? getSearchTokens(value) : [])

	return queryTokens.length > 0 && queryTokens.every((queryToken) => searchableTokens.some((searchableToken) => searchableToken.startsWith(queryToken)))
}

export const isAcceptedProductHit = (rawHit: unknown, query: string, minimumRankingScore: number, strict: boolean): boolean => {
	if (!rawHit || typeof rawHit !== 'object' || Array.isArray(rawHit)) {
		return false
	}

	const hit = rawHit as RankedProductHit
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

	return typeof hit._rankingScore !== 'number' || hit._rankingScore >= minimumRankingScore
}

export const selectRankedProductIds = (
	rawHits: unknown,
	query: string,
	minimumRankingScore: number,
	strict: boolean
): {
	exactIdentifierMatch: boolean
	ids: string[]
	matches: RankedProductMatch[]
	selectedHits: RankedProductHit[]
} => {
	const hits = Array.isArray(rawHits) ? rawHits.filter((hit): hit is RankedProductHit => Boolean(hit && typeof hit === 'object' && !Array.isArray(hit))) : []
	const cleanedQuery = cleanSearchText(query)
	const normalizedQuery = normalizeSearchIdentifier(cleanedQuery)
	const scoreFiltered = cleanedQuery ? hits.filter((hit) => isAcceptedProductHit(hit, cleanedQuery, minimumRankingScore, strict)) : hits
	const exactHits = normalizedQuery ? hits.filter((hit) => hasExactIdentifier(hit, normalizedQuery)) : []
	const selectedHits = exactHits.length > 0 ? exactHits : scoreFiltered
	const matches = selectedHits.map(getProductMatch).filter((match): match is RankedProductMatch => match !== undefined)

	return { exactIdentifierMatch: exactHits.length > 0, ids: matches.map((match) => match.productId), matches: matches, selectedHits: selectedHits }
}

export const buildProductResultFilter = (separateVariantResults: boolean, query: string): string => separateVariantResults && Boolean(cleanSearchText(query)) ? '(search_result_kind = "variant" OR (search_result_kind = "product" AND search_has_variants = false))' : 'search_result_kind = "product"'

const getProductRecordId = (product: Record<string, unknown>): string | undefined => getStringId(product.id)

const getVariantTitle = (variant: Record<string, unknown>, variantId: string): string => {
	for (const field of ['title', 'sku', 'ean', 'upc', 'barcode']) {
		const value = variant[field]

		if (typeof value === 'string' && value.trim()) {
			return value.trim()
		}
	}

	return variantId
}

export const expandProductsBySearchMatches = (products: Record<string, unknown>[], matches: RankedProductMatch[]): Record<string, unknown>[] => {
	const productsById = new Map(products.map((product) => [getProductRecordId(product), product]))

	return matches.flatMap((match) => {
		const product = productsById.get(match.productId)

		if (!product) {
			return []
		}

		if (!match.variantId || !Array.isArray(product.variants)) {
			return [product]
		}

		const variants = product.variants.filter((variant): variant is Record<string, unknown> => Boolean(variant && typeof variant === 'object' && !Array.isArray(variant)))
		const matchedVariant = variants.find((variant) => getStringId(variant.id) === match.variantId)

		if (!matchedVariant) {
			return [product]
		}

		return [{
			...product,

			search_result: {
				variant_id: match.variantId,
				variant_title: getVariantTitle(matchedVariant, match.variantId)
			},

			variants: [matchedVariant, ...variants.filter((variant) => getStringId(variant.id) !== match.variantId)]
		}]
	})
}

export const getSalesChannelIds = (value: unknown): string[] => {
	if (Array.isArray(value)) {
		return value.filter((item): item is string => typeof item === 'string')
	}

	if (typeof value === 'string') {
		return [value]
	}

	if (value && typeof value === 'object' && !Array.isArray(value)) {
		const inValue = (value as Record<string, unknown>).$in

		if (Array.isArray(inValue)) {
			return inValue.filter((item): item is string => typeof item === 'string')
		}
	}

	return []
}
