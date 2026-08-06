import { buildAlternates, buildCanonical } from "@/lib/url/builder"
import type { Market, UrlKind, UrlRecord } from "@/lib/url/types"

export type SeoPageMetadata = {
  title?: string
  description?: string
  robots: string
  canonical?: string
  hreflang?: Array<{ hrefLang: string; href: string }>
  openGraph?: {
    url?: string
    title?: string
    description?: string
    type?: string
  }
}

export type EntityPageMetadataInput = {
  market: Market
  kind: UrlKind
  record: UrlRecord
  alternates: UrlRecord[]
  title?: string
  description?: string
  query?: Record<string, string | string[] | undefined>
}

export type IndexPageMetadataInput = {
  market: Market
  kind: UrlKind
  title?: string
  description?: string
  page?: number
}

export type NoindexMetadataInput = {
  market: Market
  title?: string
  description?: string
}

const INDEXABLE_ROBOTS = "index, follow"
const NOINDEX_ROBOTS = "noindex, follow"

const countQueryValues = (
  query: EntityPageMetadataInput["query"],
  key: string
): number => {
  const value = query?.[key]
  if (value === undefined) {
    return 0
  }
  return Array.isArray(value) ? value.length : 1
}

const hasQueryKey = (
  query: EntityPageMetadataInput["query"],
  key: string
): boolean => query?.[key] !== undefined

const pageCopy = (input: { title?: string; description?: string }) => ({
  ...(input.title === undefined ? {} : { title: input.title }),
  ...(input.description === undefined
    ? {}
    : { description: input.description }),
})

const buildOpenGraph = (
  input: { title?: string; description?: string },
  canonical?: string
): SeoPageMetadata["openGraph"] => {
  if (
    canonical === undefined &&
    input.title === undefined &&
    input.description === undefined
  ) {
    return
  }
  return {
    ...(canonical === undefined ? {} : { url: canonical }),
    ...(input.title === undefined ? {} : { title: input.title }),
    ...(input.description === undefined
      ? {}
      : { description: input.description }),
  }
}

const alternatesIncludingSelf = (
  record: UrlRecord,
  records: UrlRecord[]
): SeoPageMetadata["hreflang"] => {
  const candidates = records.some((candidate) => candidate.id === record.id)
    ? records
    : [record, ...records]
  const result = buildAlternates(candidates)
  return result.length === 0 ? undefined : result
}

/** Compose a serializable SEO model for a registry-backed public entity. */
export function buildEntityPageMetadata(
  input: EntityPageMetadataInput
): SeoPageMetadata {
  if (
    input.record.market !== input.market ||
    input.record.kind !== input.kind
  ) {
    throw new Error("Metadata record must match the requested market and kind")
  }

  const filterCount =
    countQueryValues(input.query, "znacka") +
    countQueryValues(input.query, "kategorie")
  const hasSort = hasQueryKey(input.query, "razeni")
  const hasVariant = hasQueryKey(input.query, "varianta")
  const noindex =
    input.record.status !== "current" ||
    !input.record.indexable ||
    filterCount >= 2 ||
    hasSort ||
    hasVariant

  if (noindex) {
    return {
      ...pageCopy(input),
      robots: NOINDEX_ROBOTS,
      openGraph: buildOpenGraph(input),
    }
  }

  const canonical = buildCanonical({
    market: input.market,
    kind: input.kind,
    slug: input.record.slug,
    searchParams: input.query,
  })

  return {
    ...pageCopy(input),
    robots: INDEXABLE_ROBOTS,
    canonical,
    hreflang: alternatesIncludingSelf(input.record, input.alternates),
    openGraph: buildOpenGraph(input, canonical),
  }
}

/** Compose a serializable SEO model for an index and page >= 2 route. */
export function buildIndexPageMetadata(
  input: IndexPageMetadataInput
): SeoPageMetadata {
  const page =
    input.page !== undefined && Number.isInteger(input.page) && input.page >= 2
      ? input.page
      : undefined
  const canonical = buildCanonical({
    market: input.market,
    kind: input.kind,
    searchParams: page === undefined ? undefined : { strana: String(page) },
  })

  return {
    ...pageCopy(input),
    robots: INDEXABLE_ROBOTS,
    canonical,
    openGraph: buildOpenGraph(input, canonical),
  }
}

/** Compose metadata for private, search, or otherwise non-indexable surfaces. */
export function buildNoindexMetadata(
  input: NoindexMetadataInput
): SeoPageMetadata {
  return {
    ...pageCopy(input),
    robots: NOINDEX_ROBOTS,
    openGraph: buildOpenGraph(input),
  }
}
