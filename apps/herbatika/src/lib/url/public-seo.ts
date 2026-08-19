import type { NormalizedQueryValues, QueryRouteKind } from "./query-normalizer"

export type PublicSeoClassification = Readonly<{
  alternateEligible: boolean
  canonicalRawQuery: string | null
  indexable: boolean
  sitemapEligible: boolean
}>

export type PublicSeoSchemaType = "Article" | "CollectionPage" | "WebPage"

export const buildPublicSeoJsonLd = (
  input: Readonly<{
    canonical?: string
    description?: string
    schemaType?: PublicSeoSchemaType
    title?: string
  }>
): Readonly<Record<string, string>> | null =>
  input.canonical
    ? {
        "@context": "https://schema.org",
        "@id": input.canonical,
        "@type": input.schemaType ?? "WebPage",
        url: input.canonical,
        ...(input.title ? { name: input.title } : {}),
        ...(input.description ? { description: input.description } : {}),
      }
    : null

export const serializePublicSeoJsonLd = (
  value: Readonly<Record<string, string>>
) => JSON.stringify(value).replaceAll("<", "\\u003c")

const PAGINATED_LISTINGS = new Set<QueryRouteKind>([
  "advice-index",
  "brand-detail",
  "campaign-detail",
  "category-detail",
  "collection-detail",
  "product-index",
])

const NEVER_INDEX = new Set<QueryRouteKind>(["account-orders", "search"])

const keys = (values: NormalizedQueryValues) => Object.keys(values)

export const classifySeo = (
  input: Readonly<{
    canonicalRawQuery: string
    routeKind: QueryRouteKind
    values: NormalizedQueryValues
  }>
): PublicSeoClassification => {
  if (NEVER_INDEX.has(input.routeKind)) {
    return {
      alternateEligible: false,
      canonicalRawQuery: null,
      indexable: false,
      sitemapEligible: false,
    }
  }

  if (input.routeKind === "product-detail") {
    return {
      alternateEligible: true,
      canonicalRawQuery: "",
      indexable: true,
      sitemapEligible: true,
    }
  }

  const valueKeys = keys(input.values)
  if (PAGINATED_LISTINGS.has(input.routeKind)) {
    if (valueKeys.length === 0) {
      return {
        alternateEligible: true,
        canonicalRawQuery: "",
        indexable: true,
        sitemapEligible: true,
      }
    }
    if (valueKeys.length === 1 && valueKeys[0] === "page") {
      return {
        alternateEligible: false,
        canonicalRawQuery: input.canonicalRawQuery,
        indexable: true,
        sitemapEligible: false,
      }
    }
    return {
      alternateEligible: false,
      canonicalRawQuery: null,
      indexable: false,
      sitemapEligible: false,
    }
  }

  const indexable = valueKeys.length === 0
  return {
    alternateEligible: indexable,
    canonicalRawQuery: indexable ? "" : null,
    indexable,
    sitemapEligible: indexable,
  }
}
