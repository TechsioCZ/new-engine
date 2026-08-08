import { createHash } from "node:crypto"

import { MedusaError } from "@medusajs/framework/utils"
import { isRecord } from "@techsio/std/object"

import { buildProductFacetDocument } from "./facets/product-facets"

type UnknownRecord = Record<string, unknown>

const PRODUCT_IDENTIFIER_METADATA_FIELDS = [
  "user_code",
  "source_sku",
  "manufacturer_code",
  "external_id",
  "legacy_id",
  "symmy_id",
] as const
const PRODUCT_IDENTIFIER_FIELDS = [
  "id",
  "ean",
  "upc",
  "barcode",
  "sku",
] as const
const POPULARITY_FIELDS = [
  "selled",
  "sold_count",
  "sales_count",
  "popularity",
] as const
const TRADEMARK_SYMBOLS_REGEX = /[®™]/gu
const HTML_TAG_REGEX = /<[^>]*>/gu
const MEILISEARCH_DOCUMENT_ID_REGEX = /^[a-zA-Z0-9_-]+$/u
const MEILISEARCH_DOCUMENT_ID_MAX_BYTES = 511

const asRecord = (value: unknown): UnknownRecord | undefined =>
  isRecord(value) ? value : undefined

const asRecords = (value: unknown): UnknownRecord[] => {
  if (!Array.isArray(value)) {
    return []
  }

  const records: UnknownRecord[] = []

  for (const entry of value) {
    if (isRecord(entry)) {
      records.push(entry)
    }
  }

  return records
}

const addString = (values: string[], value: unknown) => {
  if (typeof value === "string" && value.trim()) {
    values.push(value.trim())
  } else if (typeof value === "number" && Number.isFinite(value)) {
    values.push(String(value))
  }
}

const dedupeStrings = (values: string[]): string[] => [
  ...new Set(values.filter(Boolean)),
]

const toNumber = (value: unknown): number => {
  if (typeof value === "number") {
    return value
  }

  if (typeof value === "string") {
    return Number(value)
  }

  return Number.NaN
}

export const cleanSearchText = (value: string): string =>
  value.replaceAll(TRADEMARK_SYMBOLS_REGEX, " ").replaceAll(/\s+/gu, " ").trim()

export const normalizeSearchIdentifier = (value: string): string =>
  cleanSearchText(value).normalize("NFKC").toLocaleLowerCase()

const collectMetadataIdentifiers = (
  metadata: UnknownRecord | undefined,
  identifiers: string[],
) => {
  for (const field of PRODUCT_IDENTIFIER_METADATA_FIELDS) {
    addString(identifiers, metadata?.[field])
  }
}

const collectRecordSearchIdentifiers = (document: UnknownRecord): string[] => {
  const identifiers: string[] = []

  for (const field of PRODUCT_IDENTIFIER_FIELDS) {
    addString(identifiers, document[field])
  }

  collectMetadataIdentifiers(asRecord(document["metadata"]), identifiers)

  return identifiers
}

export const collectProductSearchIdentifiers = (
  document: UnknownRecord,
): string[] => {
  const identifiers = collectRecordSearchIdentifiers(document)

  for (const variant of asRecords(document["variants"])) {
    identifiers.push(...collectRecordSearchIdentifiers(variant))
  }

  return dedupeStrings(identifiers)
}

const collectVariantSearchIdentifiers = (
  document: UnknownRecord,
  variant: UnknownRecord,
): string[] =>
  dedupeStrings([
    ...collectRecordSearchIdentifiers(document),
    ...collectRecordSearchIdentifiers(variant),
  ])

const getSearchDocumentId = (value: unknown): string => {
  if (typeof value === "string" || typeof value === "number") {
    return String(value)
  }

  return ""
}

const readPopularity = (document: UnknownRecord): number => {
  const metadata = asRecord(document["metadata"])

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
  if (typeof value === "string") {
    return cleanSearchText(value)
  }

  if (Array.isArray(value)) {
    const entries: unknown[] = []

    for (const entry of value) {
      const cleaned = cleanValue(entry)
      const isEmptyArray = Array.isArray(cleaned) && cleaned.length === 0

      if (
        cleaned !== undefined &&
        cleaned !== null &&
        cleaned !== "" &&
        !isEmptyArray
      ) {
        entries.push(cleaned)
      }
    }

    return entries.length > 0 ? entries : undefined
  }

  const record = asRecord(value)

  if (record !== undefined) {
    const entries: [string, unknown][] = []

    for (const [key, entry] of Object.entries(record)) {
      const cleaned = cleanValue(entry)

      if (cleaned !== undefined && cleaned !== null && cleaned !== "") {
        entries.push([key, cleaned])
      }
    }

    return entries.length > 0 ? Object.fromEntries(entries) : undefined
  }

  return value ?? undefined
}

export const cleanSearchDocument = (document: UnknownRecord): UnknownRecord => {
  const cleaned = cleanValue(document)

  return isRecord(cleaned) ? cleaned : {}
}

export const buildProductSearchDocument = (
  document: UnknownRecord,

  options?: {
    popularity?: number
  },
): UnknownRecord => {
  const variants = asRecords(document["variants"])
  const identifiers = collectProductSearchIdentifiers(document)

  const searchDocument = {
    ...document,
    ...buildProductFacetDocument(document),
    facet_popularity:
      options?.popularity === undefined
        ? readPopularity(document)
        : Math.max(0, options.popularity),
    search_has_variants: variants.length > 0,
    search_identifiers: identifiers,
    search_identifiers_normalized: identifiers.map(normalizeSearchIdentifier),
    search_product_id: document["id"],
    search_result_kind: "product",
    search_variant_titles: variants
      .map((variant) => variant["title"])
      .filter(
        (title): title is string =>
          typeof title === "string" && Boolean(title.trim()),
      ),
  }

  return cleanSearchDocument(searchDocument)
}

const buildVariantDocumentId = (
  productId: unknown,
  variantId: unknown,
): string => {
  const raw = `variant_${getSearchDocumentId(productId)}_${getSearchDocumentId(
    variantId,
  )}`

  if (
    MEILISEARCH_DOCUMENT_ID_REGEX.test(raw) &&
    Buffer.byteLength(raw) <= MEILISEARCH_DOCUMENT_ID_MAX_BYTES
  ) {
    return raw
  }

  const digest = createHash("sha256").update(raw).digest("hex").slice(0, 16)

  return `variant_${digest}`
}

const buildProductVariantSearchDocument = (
  document: UnknownRecord,
  variant: UnknownRecord,
  popularity: number | undefined,
): UnknownRecord => {
  const identifiers = collectVariantSearchIdentifiers(document, variant)

  return cleanSearchDocument({
    ...document,
    ...buildProductFacetDocument({ ...document, variants: [variant] }),
    facet_popularity:
      popularity === undefined
        ? readPopularity(document)
        : Math.max(0, popularity),
    id: buildVariantDocumentId(document["id"], variant["id"]),
    search_has_variants: true,
    search_identifiers: identifiers,
    search_identifiers_normalized: identifiers.map(normalizeSearchIdentifier),
    search_product_id: document["id"],
    search_result_kind: "variant",
    search_variant_id: variant["id"],
    search_variant_title: variant["title"],
    search_variant_titles:
      typeof variant["title"] === "string" ? [variant["title"]] : [],
    variants: [variant],
  })
}

export const buildProductSearchDocuments = (
  document: UnknownRecord,
  options?: { popularity?: number },
): UnknownRecord[] => {
  const variants = asRecords(document["variants"])

  const searchDocuments = [buildProductSearchDocument(document, options)]

  for (const variant of variants) {
    if (getSearchDocumentId(variant["id"]).length > 0) {
      searchDocuments.push(
        buildProductVariantSearchDocument(
          document,
          variant,
          options?.popularity,
        ),
      )
    }
  }

  return searchDocuments
}

export const buildCategorySearchDocument = (
  document: UnknownRecord,
): UnknownRecord =>
  cleanSearchDocument({
    description: document["description"],
    handle: document["handle"],
    id: document["id"],
    name: document["name"],
    parent_category_id:
      document["parent_category_id"] ??
      asRecord(document["parent_category"])?.["id"],
  })

export const buildBrandSearchDocument = (
  document: UnknownRecord,
): UnknownRecord =>
  cleanSearchDocument({
    description: document["description"],
    handle: document["handle"],
    id: document["id"],
    title: document["title"],
  })

const extractContentText = (value: unknown): string => {
  if (typeof value === "string") {
    return cleanSearchText(value.replaceAll(HTML_TAG_REGEX, " "))
  }

  if (Array.isArray(value)) {
    return cleanSearchText(value.map(extractContentText).join(" "))
  }

  const record = asRecord(value)

  if (!record) {
    return ""
  }

  return cleanSearchText(
    Object.values(record).map(extractContentText).join(" "),
  )
}

export const buildContentDocumentId = (
  type: "article" | "page",
  sourceId: unknown,
): string => {
  const raw = String(sourceId)
  const direct = `${type}_${raw}`

  if (
    MEILISEARCH_DOCUMENT_ID_REGEX.test(direct) &&
    Buffer.byteLength(direct) <= MEILISEARCH_DOCUMENT_ID_MAX_BYTES
  ) {
    return direct
  }

  const digest = createHash("sha256").update(raw).digest("hex").slice(0, 16)
  const readable = raw.replaceAll(/[^a-zA-Z0-9_-]/gu, "_") || "id"
  const readableBudget =
    MEILISEARCH_DOCUMENT_ID_MAX_BYTES -
    Buffer.byteLength(type) -
    Buffer.byteLength(digest) -
    2

  return `${type}_${readable.slice(0, readableBudget)}_${digest}`
}

export const buildContentSearchDocument = (
  document: UnknownRecord,
  type: "article" | "page",
  locale: string,
): UnknownRecord => {
  const rawSlug = document["slug"]
  const slug = typeof rawSlug === "string" ? rawSlug.trim() : ""
  if (!/^[\p{L}\p{N}_-]+(?:\/[\p{L}\p{N}_-]+)*$/u.test(slug)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `CMS ${type} ${String(document["id"])} has an invalid search slug`,
    )
  }
  const href = type === "article" ? `/blog/${slug}` : `/${slug}`

  return cleanSearchDocument({
    content: extractContentText(
      document["contentHTML"] ?? document["content"] ?? document["excerpt"],
    ),
    excerpt: document["excerpt"],
    href,
    id: buildContentDocumentId(type, document["id"]),
    locale,
    slug,
    source_id: String(document["id"]),
    title: document["title"],
    type,
  })
}
