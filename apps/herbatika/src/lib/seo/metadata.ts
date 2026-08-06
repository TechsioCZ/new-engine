import type { Metadata } from "next"
import { buildAlternates, buildCanonical } from "@/lib/url/builder"
import type { Market, UrlKind, UrlRecord } from "@/lib/url/types"

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
  query?: Record<string, string | string[] | undefined>
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
  canonical: string
): Metadata["openGraph"] => ({
  url: canonical,
  ...(input.title === undefined ? {} : { title: input.title }),
  ...(input.description === undefined
    ? {}
    : { description: input.description }),
})

const buildLanguageAlternates = (
  record: UrlRecord,
  records: UrlRecord[]
): NonNullable<Metadata["alternates"]>["languages"] => {
  const candidates = records.some((candidate) => candidate.id === record.id)
    ? records
    : [record, ...records]
  const alternates = buildAlternates(candidates)
  if (alternates.length === 0) {
    return
  }
  return Object.fromEntries(
    alternates.map(({ hrefLang, href }) => [hrefLang, href])
  )
}

/** Compose native App Router metadata for a registry-backed public entity. */
export function buildEntityPageMetadata(
  input: EntityPageMetadataInput
): Metadata {
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
  const recordNoindex =
    input.record.status !== "current" || !input.record.indexable
  const queryNoindex = filterCount >= 2 || hasSort || hasVariant

  if (recordNoindex) {
    return {
      ...pageCopy(input),
      robots: NOINDEX_ROBOTS,
    }
  }

  if (queryNoindex) {
    const canonical = buildCanonical({
      market: input.market,
      kind: input.kind,
      slug: input.record.slug,
    })
    return {
      ...pageCopy(input),
      robots: NOINDEX_ROBOTS,
      alternates: { canonical },
    }
  }

  const canonical = buildCanonical({
    market: input.market,
    kind: input.kind,
    slug: input.record.slug,
    searchParams: input.query,
  })
  const languages = buildLanguageAlternates(input.record, input.alternates)

  return {
    ...pageCopy(input),
    robots: INDEXABLE_ROBOTS,
    alternates: {
      canonical,
      ...(languages === undefined ? {} : { languages }),
    },
    openGraph: buildOpenGraph(input, canonical),
  }
}

/** Compose native App Router metadata for an index or page >= 2 route. */
export function buildIndexPageMetadata(
  input: IndexPageMetadataInput
): Metadata {
  const page =
    input.page !== undefined && Number.isInteger(input.page) && input.page >= 2
      ? input.page
      : undefined
  const query = {
    ...input.query,
    ...(page === undefined ? {} : { strana: String(page) }),
  }
  const filterCount =
    countQueryValues(query, "znacka") + countQueryValues(query, "kategorie")
  const queryNoindex = filterCount >= 2 || hasQueryKey(query, "razeni")
  const canonical = buildCanonical({
    market: input.market,
    kind: input.kind,
    searchParams: queryNoindex ? undefined : query,
  })

  if (queryNoindex) {
    return {
      ...pageCopy(input),
      robots: NOINDEX_ROBOTS,
      alternates: { canonical },
    }
  }

  const hasLocalizedFilter = filterCount > 0
  const languages = hasLocalizedFilter
    ? undefined
    : Object.fromEntries(
        (["sk", "cz", "hu", "ro"] as const).map((market) => [
          ({ sk: "sk-SK", cz: "cs-CZ", hu: "hu-HU", ro: "ro-RO" } as const)[
            market
          ],
          buildCanonical({
            market,
            kind: input.kind,
            searchParams:
              page === undefined ? undefined : { strana: String(page) },
          }),
        ])
      )

  return {
    ...pageCopy(input),
    robots: INDEXABLE_ROBOTS,
    alternates: {
      canonical,
      ...(languages === undefined ? {} : { languages }),
    },
    openGraph: buildOpenGraph(input, canonical),
  }
}

/** Compose native App Router metadata without URL or social sharing signals. */
export function buildNoindexMetadata(input: NoindexMetadataInput): Metadata {
  return {
    ...pageCopy(input),
    robots: NOINDEX_ROBOTS,
  }
}
