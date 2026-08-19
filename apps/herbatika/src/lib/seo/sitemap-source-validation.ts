import type { MarketRuntimeBinding } from "@/lib/market/market-runtime"
import type { CmsArticle, CmsPage } from "@/lib/storefront/cms"
import type { HerbatikaLocale } from "@/lib/storefront/market-context"
import type { StaticRootPageKey } from "@/lib/url/types"
import type { SourceReadResult } from "@/lib/url-registry/reads"
import {
  SITEMAP_MAX_URLS,
  type SitemapEntitySourceCandidate,
  type SitemapSourceValidation,
  type SitemapStaticSourceCandidate,
} from "./sitemap-contract"

export type CatalogSitemapKind = "brand" | "category" | "collection"

type CatalogBinding = Pick<MarketRuntimeBinding, "market" | "salesChannelId">

type CatalogAssignment = Readonly<{
  entityId: string
  publicSlug: string
}>

type CatalogAssignmentPage = Readonly<{
  count: number
  items: readonly CatalogAssignment[]
}>

export type CatalogSitemapSourceDependencies = Readonly<{
  listAssignments(input: {
    binding: CatalogBinding
    kind: CatalogSitemapKind
    limit: number
    offset: number
  }): Promise<unknown>
}>

type CmsReadResult<TValue> = SourceReadResult<TValue>

export type CmsSitemapSourceDependencies = Readonly<{
  readArticle(
    sourceId: string,
    locale: HerbatikaLocale
  ): Promise<CmsReadResult<CmsArticle>>
  readPage(
    sourceId: string,
    locale: HerbatikaLocale
  ): Promise<CmsReadResult<CmsPage>>
  readStaticPage(
    pageKey: StaticRootPageKey,
    locale: HerbatikaLocale
  ): Promise<CmsReadResult<CmsPage>>
}>

export type ProductSitemapSourceDependencies = Readonly<{
  readProduct(input: {
    market: MarketRuntimeBinding["market"]
    productId: string
    publicSlug: string
  }): Promise<SourceReadResult<Readonly<{ updatedAt?: string | null }>>>
}>

const ASSIGNMENT_PAGE_SIZE = 100
const SOURCE_VALIDATION_CONCURRENCY = 12
const PUBLIC_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504])
const STATIC_ROOT_PAGE_KEYS = new Set<StaticRootPageKey>([
  "about",
  "contact",
  "faq",
  "shipping",
  "returns",
  "terms",
  "privacy",
  "cookies",
])

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value))

const statusOf = (error: unknown) =>
  isRecord(error) && typeof error.status === "number" ? error.status : null

const mapCatalogError = <Value>(error: unknown): SourceReadResult<Value> => {
  const status = statusOf(error)
  return status !== null && RETRYABLE_STATUSES.has(status)
    ? { kind: "unavailable" }
    : {
        causeCode: "MEDUSA_REJECTED_SITEMAP_ASSIGNMENT_REQUEST",
        kind: "invalid-response",
      }
}

const parseAssignment = (
  value: unknown,
  binding: CatalogBinding
): CatalogAssignment | null => {
  if (!isRecord(value)) {
    return null
  }
  return value.schemaVersion === 1 &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    value.entityId === value.id &&
    value.marketCode === binding.market &&
    value.salesChannelId === binding.salesChannelId &&
    value.publicationStatus === "published" &&
    typeof value.publicSlug === "string" &&
    value.publicSlug.length <= 80 &&
    PUBLIC_SLUG_PATTERN.test(value.publicSlug) &&
    typeof value.sourceVersion === "string" &&
    value.sourceVersion.length > 0
    ? { entityId: value.id, publicSlug: value.publicSlug }
    : null
}

const parseAssignmentPage = (
  value: unknown,
  binding: CatalogBinding,
  expectedOffset: number
): CatalogAssignmentPage | null => {
  if (
    !(isRecord(value) && Number.isSafeInteger(value.count)) ||
    (value.count as number) < 0 ||
    (value.count as number) > SITEMAP_MAX_URLS ||
    value.limit !== ASSIGNMENT_PAGE_SIZE ||
    value.offset !== expectedOffset ||
    !Array.isArray(value.items) ||
    value.items.length > ASSIGNMENT_PAGE_SIZE
  ) {
    return null
  }
  const items = value.items.map((item) => parseAssignment(item, binding))
  return items.some((item) => item === null)
    ? null
    : {
        count: value.count as number,
        items: items as CatalogAssignment[],
      }
}

const validateCandidateIdentities = (
  sources: readonly SitemapEntitySourceCandidate[]
) =>
  new Set(sources.map((source) => source.routeId)).size === sources.length &&
  new Set(sources.map((source) => source.sourceId)).size === sources.length

export const validateCatalogSitemapSources = async (
  input: Readonly<{
    binding: CatalogBinding
    kind: CatalogSitemapKind
    sources: readonly SitemapEntitySourceCandidate[]
  }>,
  dependencies: CatalogSitemapSourceDependencies
): Promise<SourceReadResult<readonly SitemapSourceValidation[]>> => {
  if (!validateCandidateIdentities(input.sources)) {
    return {
      causeCode: "INVALID_SITEMAP_SOURCE_CANDIDATES",
      kind: "invalid-response",
    }
  }
  if (input.sources.length === 0) {
    return { kind: "found", value: [] }
  }

  try {
    const assignments: CatalogAssignment[] = []
    let count = Number.POSITIVE_INFINITY
    let offset = 0
    while (offset < count) {
      const page = parseAssignmentPage(
        await dependencies.listAssignments({
          binding: input.binding,
          kind: input.kind,
          limit: ASSIGNMENT_PAGE_SIZE,
          offset,
        }),
        input.binding,
        offset
      )
      if (!page || (page.items.length === 0 && offset < page.count)) {
        return {
          causeCode: "INVALID_SITEMAP_ASSIGNMENT_LIST_RESPONSE",
          kind: "invalid-response",
        }
      }
      assignments.push(...page.items)
      count = page.count
      offset += page.items.length
    }
    if (
      assignments.length !== count ||
      new Set(assignments.map((assignment) => assignment.entityId)).size !==
        assignments.length
    ) {
      return {
        causeCode: "INVALID_SITEMAP_ASSIGNMENT_LIST_RESPONSE",
        kind: "invalid-response",
      }
    }

    const assignmentBySourceId = new Map(
      assignments.map((assignment) => [assignment.entityId, assignment])
    )
    return {
      kind: "found",
      value: input.sources.flatMap((source) => {
        const assignment = assignmentBySourceId.get(source.sourceId)
        return assignment?.publicSlug === source.publicSlug
          ? [{ routeId: source.routeId }]
          : []
      }),
    }
  } catch (error) {
    return mapCatalogError(error)
  }
}

const chunks = <Value>(values: readonly Value[], size: number): Value[][] => {
  const result: Value[][] = []
  for (let offset = 0; offset < values.length; offset += size) {
    result.push(values.slice(offset, offset + size))
  }
  return result
}

export const validateProductSitemapSources = async (
  input: Readonly<{
    market: MarketRuntimeBinding["market"]
    sources: readonly SitemapEntitySourceCandidate[]
  }>,
  dependencies: ProductSitemapSourceDependencies
): Promise<SourceReadResult<readonly SitemapSourceValidation[]>> => {
  if (!validateCandidateIdentities(input.sources)) {
    return {
      causeCode: "INVALID_SITEMAP_SOURCE_CANDIDATES",
      kind: "invalid-response",
    }
  }
  const validations: SitemapSourceValidation[] = []
  for (const batch of chunks(input.sources, SOURCE_VALIDATION_CONCURRENCY)) {
    const results = await Promise.all(
      batch.map((source) =>
        dependencies.readProduct({
          market: input.market,
          productId: source.sourceId,
          publicSlug: source.publicSlug,
        })
      )
    )
    for (const [index, result] of results.entries()) {
      if (result.kind !== "found") {
        return result.kind === "missing"
          ? {
              causeCode: "ACTIVE_PRODUCT_SOURCE_MISSING",
              kind: "invalid-response",
            }
          : result
      }
      const source = batch[index]
      if (!source) {
        return {
          causeCode: "INVALID_PRODUCT_VALIDATION_BATCH",
          kind: "invalid-response",
        }
      }
      validations.push({
        routeId: source.routeId,
        updatedAt: result.value.updatedAt,
      })
    }
  }
  return { kind: "found", value: validations }
}

const contentUpdatedAt = (value: CmsArticle | CmsPage) =>
  typeof value.publishedDate === "string" ? value.publishedDate : undefined

const collectCmsBatchValidations = (
  batch: readonly SitemapEntitySourceCandidate[],
  results: readonly CmsReadResult<CmsArticle | CmsPage>[]
): SourceReadResult<readonly SitemapSourceValidation[]> => {
  const validations: SitemapSourceValidation[] = []
  for (const [index, result] of results.entries()) {
    if (result.kind === "missing") {
      continue
    }
    if (result.kind !== "found") {
      return result
    }
    const source = batch[index]
    if (!source) {
      return {
        causeCode: "INVALID_CMS_VALIDATION_BATCH",
        kind: "invalid-response",
      }
    }
    if (String(result.value.id) !== source.sourceId) {
      return {
        causeCode: "INVALID_CMS_SOURCE_IDENTITY",
        kind: "invalid-response",
      }
    }
    if (result.value.slug === source.publicSlug) {
      validations.push({
        routeId: source.routeId,
        updatedAt: contentUpdatedAt(result.value),
      })
    }
  }
  return { kind: "found", value: validations }
}

export const validateCmsEntitySitemapSources = async (
  input: Readonly<{
    kind: "article" | "page"
    locale: HerbatikaLocale
    sources: readonly SitemapEntitySourceCandidate[]
  }>,
  dependencies: CmsSitemapSourceDependencies
): Promise<SourceReadResult<readonly SitemapSourceValidation[]>> => {
  if (!validateCandidateIdentities(input.sources)) {
    return {
      causeCode: "INVALID_SITEMAP_SOURCE_CANDIDATES",
      kind: "invalid-response",
    }
  }
  const validations: SitemapSourceValidation[] = []
  for (const batch of chunks(input.sources, SOURCE_VALIDATION_CONCURRENCY)) {
    const results = await Promise.all(
      batch.map((source) =>
        input.kind === "article"
          ? dependencies.readArticle(source.sourceId, input.locale)
          : dependencies.readPage(source.sourceId, input.locale)
      )
    )
    const batchValidation = collectCmsBatchValidations(batch, results)
    if (batchValidation.kind !== "found") {
      return batchValidation
    }
    validations.push(...batchValidation.value)
  }
  return { kind: "found", value: validations }
}

const isStaticRootPageKey = (value: string): value is StaticRootPageKey =>
  STATIC_ROOT_PAGE_KEYS.has(value as StaticRootPageKey)

export const validateCmsStaticSitemapSources = async (
  input: Readonly<{
    locale: HerbatikaLocale
    sources: readonly SitemapStaticSourceCandidate[]
  }>,
  dependencies: Pick<CmsSitemapSourceDependencies, "readStaticPage">
): Promise<SourceReadResult<readonly SitemapSourceValidation[]>> => {
  if (
    new Set(input.sources.map((source) => source.routeId)).size !==
    input.sources.length
  ) {
    return {
      causeCode: "INVALID_STATIC_SITEMAP_SOURCE_CANDIDATES",
      kind: "invalid-response",
    }
  }
  const validations: SitemapSourceValidation[] = []
  const sources = input.sources.filter((source) =>
    isStaticRootPageKey(source.staticRouteKey)
  )
  for (const batch of chunks(sources, SOURCE_VALIDATION_CONCURRENCY)) {
    const results = await Promise.all(
      batch.map((source) =>
        dependencies.readStaticPage(
          source.staticRouteKey as StaticRootPageKey,
          input.locale
        )
      )
    )
    for (const [index, result] of results.entries()) {
      if (result.kind === "missing") {
        continue
      }
      if (result.kind !== "found") {
        return result
      }
      const source = batch[index]
      if (!source) {
        return {
          causeCode: "INVALID_STATIC_CMS_VALIDATION_BATCH",
          kind: "invalid-response",
        }
      }
      validations.push({
        routeId: source.routeId,
        updatedAt: contentUpdatedAt(result.value),
      })
    }
  }
  return { kind: "found", value: validations }
}
