import { createHash } from 'node:crypto'
import { buildProductFacetDocument } from './facets/product-facets'

type UnknownRecord = Record<string, unknown>

const PRODUCT_IDENTIFIER_METADATA_FIELDS = ['user_code', 'source_sku', 'manufacturer_code', 'external_id', 'legacy_id', 'symmy_id'] as const
const PRODUCT_IDENTIFIER_FIELDS = ['id', 'ean', 'upc', 'barcode', 'sku'] as const
const POPULARITY_FIELDS = ['selled', 'sold_count', 'sales_count', 'popularity'] as const
const TRADEMARK_SYMBOLS_REGEX = /[®™]/g
const HTML_TAG_REGEX = /<[^>]*>/g
const MEILISEARCH_DOCUMENT_ID_REGEX = /^[a-zA-Z0-9_-]+$/
const MEILISEARCH_DOCUMENT_ID_MAX_BYTES = 511

const asRecord = (value: unknown): UnknownRecord | undefined => {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return
	}

	return value as UnknownRecord
}

const asRecords = (value: unknown): UnknownRecord[] => Array.isArray(value) ? value.map((entry) => asRecord(entry)).filter((entry): entry is UnknownRecord => Boolean(entry)) : []

const addString = (values: string[], value: unknown) => {
	if (typeof value === 'string' && value.trim()) {
		values.push(value.trim())
	} else if (typeof value === 'number' && Number.isFinite(value)) {
		values.push(String(value))
	}
}

const dedupeStrings = (values: string[]): string[] => Array.from(new Set(values.filter(Boolean)))

const toNumber = (value: unknown): number => {
	if (typeof value === 'number') {
		return value
	}

	if (typeof value === 'string') {
		return Number.parseFloat(value)
	}

	return Number.NaN
}

export const cleanSearchText = (value: string): string => value.replaceAll(TRADEMARK_SYMBOLS_REGEX, ' ').replaceAll(/\s+/g, ' ').trim()

export const normalizeSearchIdentifier = (value: string): string => cleanSearchText(value).normalize('NFKC').toLocaleLowerCase()

const collectMetadataIdentifiers = (metadata: UnknownRecord | undefined, identifiers: string[]) => {
	for (const field of PRODUCT_IDENTIFIER_METADATA_FIELDS) {
		addString(identifiers, metadata?.[field])
	}
}

const collectRecordSearchIdentifiers = (document: UnknownRecord): string[] => {
	const identifiers: string[] = []

	for (const field of PRODUCT_IDENTIFIER_FIELDS) {
		addString(identifiers, document[field])
	}

	collectMetadataIdentifiers(asRecord(document.metadata), identifiers)

	return identifiers
}

export const collectProductSearchIdentifiers = (document: UnknownRecord): string[] => {
	const identifiers = collectRecordSearchIdentifiers(document)

	for (const variant of asRecords(document.variants)) {
		identifiers.push(...collectRecordSearchIdentifiers(variant))
	}

	return dedupeStrings(identifiers)
}

const collectVariantSearchIdentifiers = (document: UnknownRecord, variant: UnknownRecord): string[] => dedupeStrings([
	...collectRecordSearchIdentifiers(document),
	...collectRecordSearchIdentifiers(variant)
])

const getSearchDocumentId = (value: unknown): string => {
	if (typeof value === 'string' || typeof value === 'number') {
		return String(value)
	}

	return ''
}

const readPopularity = (document: UnknownRecord): number => {
	const metadata = asRecord(document.metadata)

	for (const field of POPULARITY_FIELDS) {
		const value = metadata?.[field] ?? document[field]
		const parsed = toNumber(value)

		if (Number.isFinite(parsed)) {
			return Math.max(0, parsed)
		}
	}

	return 0
}

const cleanValue = (value: unknown): unknown => {
	if (typeof value === 'string') {
		return cleanSearchText(value)
	}

	if (Array.isArray(value)) {
		const entries = value
			.map((entry) => cleanValue(entry))
			.filter((entry) => entry !== undefined && entry !== null && entry !== '' && (!Array.isArray(entry) || entry.length > 0))

		return entries.length > 0 ? entries : undefined
	}

	const record = asRecord(value)

	if (record) {
		const entries = Object.entries(record)
			.map(([key, entry]) => [key, cleanValue(entry)] as const)
			.filter(([, entry]) => entry !== undefined && entry !== null && entry !== '')

		return entries.length > 0 ? Object.fromEntries(entries) : undefined
	}

	return value ?? undefined
}

export const cleanSearchDocument = <DocumentType extends UnknownRecord>(document: DocumentType): DocumentType => (cleanValue(document) ?? {}) as DocumentType

export const buildProductSearchDocument = (
	document: UnknownRecord,

	options?: {
		popularity?: number
	}
): UnknownRecord => {
	const variants = asRecords(document.variants)
	const identifiers = collectProductSearchIdentifiers(document)

	const searchDocument = {
		...document,
		...buildProductFacetDocument(document),
		facet_popularity: options?.popularity === undefined ? readPopularity(document) : Math.max(0, options.popularity),
		search_identifiers: identifiers,
		search_identifiers_normalized: identifiers.map(normalizeSearchIdentifier),
		search_has_variants: variants.length > 0,
		search_product_id: document.id,
		search_result_kind: 'product',
		search_variant_titles: variants.map((variant) => variant.title).filter((title): title is string => typeof title === 'string' && Boolean(title.trim()))
	}

	return cleanSearchDocument(searchDocument)
}

const buildVariantDocumentId = (productId: unknown, variantId: unknown): string => {
	const raw = 'variant_' + getSearchDocumentId(productId) + '_' + getSearchDocumentId(variantId)

	if (MEILISEARCH_DOCUMENT_ID_REGEX.test(raw) && Buffer.byteLength(raw) <= MEILISEARCH_DOCUMENT_ID_MAX_BYTES) {
		return raw
	}

	const digest = createHash('sha256').update(raw).digest('hex').slice(0, 16)

	return 'variant_' + digest
}

const buildProductVariantSearchDocument = (document: UnknownRecord, variant: UnknownRecord, popularity: number | undefined): UnknownRecord => {
	const identifiers = collectVariantSearchIdentifiers(document, variant)

	return cleanSearchDocument({
		...document,
		...buildProductFacetDocument({ ...document, variants: [variant] }),
		id: buildVariantDocumentId(document.id, variant.id),
		facet_popularity: popularity === undefined ? readPopularity(document) : Math.max(0, popularity),
		search_identifiers: identifiers,
		search_identifiers_normalized: identifiers.map(normalizeSearchIdentifier),
		search_has_variants: true,
		search_product_id: document.id,
		search_result_kind: 'variant',
		search_variant_id: variant.id,
		search_variant_title: variant.title,
		search_variant_titles: typeof variant.title === 'string' ? [variant.title] : [],
		variants: [variant]
	})
}

export const buildProductSearchDocuments = (document: UnknownRecord, options?: { popularity?: number }): UnknownRecord[] => {
	const variants = asRecords(document.variants)

	return [
		buildProductSearchDocument(document, options),
		...variants.filter((variant) => Boolean(getSearchDocumentId(variant.id))).map((variant) => buildProductVariantSearchDocument(document, variant, options?.popularity))
	]
}

export const buildCategorySearchDocument = (document: UnknownRecord): UnknownRecord =>
	cleanSearchDocument({
		id: document.id,
		name: document.name,
		description: document.description,
		handle: document.handle,
		parent_category_id: document.parent_category_id ?? asRecord(document.parent_category)?.id
	})

export const buildBrandSearchDocument = (document: UnknownRecord): UnknownRecord => cleanSearchDocument({ id: document.id, title: document.title, description: document.description, handle: document.handle })

const extractContentText = (value: unknown): string => {
	if (typeof value === 'string') {
		return cleanSearchText(value.replaceAll(HTML_TAG_REGEX, ' '))
	}

	if (Array.isArray(value)) {
		return cleanSearchText(value.map(extractContentText).join(' '))
	}

	const record = asRecord(value)

	if (!record) {
		return ''
	}

	return cleanSearchText(Object.values(record).map(extractContentText).join(' '))
}

const buildContentDocumentId = (type: 'article' | 'page', sourceId: unknown): string => {
	const raw = String(sourceId)
	const direct = type + '_' + raw

	if (MEILISEARCH_DOCUMENT_ID_REGEX.test(direct) && Buffer.byteLength(direct) <= MEILISEARCH_DOCUMENT_ID_MAX_BYTES) {
		return direct
	}

	const digest = createHash('sha256').update(raw).digest('hex').slice(0, 16)
	const readable = raw.replaceAll(/[^a-zA-Z0-9_-]/g, '_') || 'id'
	const readableBudget = MEILISEARCH_DOCUMENT_ID_MAX_BYTES - Buffer.byteLength(type) - Buffer.byteLength(digest) - 2

	return type + '_' + readable.slice(0, readableBudget) + '_' + digest
}

export const buildContentSearchDocument = (document: UnknownRecord, type: 'article' | 'page', locale: string): UnknownRecord => {
	const slug = typeof document.slug === 'string' ? document.slug : ''
	const href = type === 'article' ? '/blog/' + slug : '/' + slug

	return cleanSearchDocument({
		id: buildContentDocumentId(type, document.id),
		source_id: String(document.id),
		type: type,
		locale: locale,
		title: document.title,
		excerpt: document.excerpt,
		content: extractContentText(document.contentHTML ?? document.content ?? document.excerpt),
		slug: slug,
		href: href
	})
}
