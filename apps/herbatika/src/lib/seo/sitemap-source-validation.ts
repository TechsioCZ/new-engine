import { getAboutPageData } from "@/components/about/about-page.data"
import { getFaqPageData } from "@/components/faq/faq-page.data"
import type { MarketRuntimeBinding } from "@/lib/market/market-runtime"
import type { CmsArticle, CmsPage } from "@/lib/storefront/cms"
import type { HerbatikaLocale } from "@/lib/storefront/market-context"
import { getRoDemoStaticPage } from "@/lib/storefront/ro-demo-static-pages"
import type { StaticRootPageKey } from "@/lib/url/types"
import type { SourceReadResult } from "@/lib/url-registry/reads"
import type {
  SitemapEntitySourceCandidate,
  SitemapSourceValidation,
  SitemapStaticSourceCandidate,
} from "./sitemap-contract"

export type CatalogSitemapKind = "brand" | "category" | "collection"

type CatalogBinding = Pick<MarketRuntimeBinding, "market" | "salesChannelId">

type CatalogAssignment = Readonly<{
  entityId: string
  publicSlug: string
}>

export type CatalogSitemapSourceDependencies = Readonly<{
  readAssignments(input: {
    binding: CatalogBinding
    kind: CatalogSitemapKind
    sources: readonly SitemapEntitySourceCandidate[]
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
  readProducts(input: {
    market: MarketRuntimeBinding["market"]
    sources: readonly SitemapEntitySourceCandidate[]
  }): Promise<unknown>
}>

const CATALOG_SOURCE_BATCH_LIMIT = 100
const SOURCE_VALIDATION_CONCURRENCY = 12
const PUBLIC_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const PRODUCT_SOURCE_BATCH_LIMIT = 100
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

const hasCodeOwnedStaticPage = (
  pageKey: StaticRootPageKey,
  locale: HerbatikaLocale
) => {
  if (pageKey === "about") {
    return Boolean(getAboutPageData(locale))
  }
  return pageKey === "faq" ? Boolean(getFaqPageData(locale)) : null
}

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

const parseAssignmentBatch = (
  value: unknown,
  binding: CatalogBinding,
  kind: CatalogSitemapKind,
  sources: readonly SitemapEntitySourceCandidate[]
): readonly CatalogAssignment[] | null => {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    value.marketCode !== binding.market ||
    value.entityKind !== kind ||
    !Array.isArray(value.assignments) ||
    value.assignments.length > sources.length
  ) {
    return null
  }
  const requestedIds = new Set(sources.map((source) => source.sourceId))
  const assignments = value.assignments.map((item) =>
    parseAssignment(item, binding)
  )
  return assignments.some(
    (assignment) =>
      assignment === null || !requestedIds.has(assignment.entityId)
  ) ||
    new Set(
      assignments.map(
        (assignment) => (assignment as CatalogAssignment).entityId
      )
    ).size !== assignments.length
    ? null
    : (assignments as CatalogAssignment[])
}

const validateCandidateIdentities = (
  sources: readonly SitemapEntitySourceCandidate[]
) =>
  new Set(sources.map((source) => source.routeId)).size === sources.length &&
  new Set(sources.map((source) => source.sourceId)).size === sources.length &&
  new Set(sources.map((source) => source.publicSlug)).size === sources.length

export const validateCatalogSitemapSources = async (
  input: Readonly<{
    binding: CatalogBinding
    kind: CatalogSitemapKind
    sources: readonly SitemapEntitySourceCandidate[]
  }>,
  dependencies: CatalogSitemapSourceDependencies
): Promise<SourceReadResult<readonly SitemapSourceValidation[]>> => {
  if (
    !validateCandidateIdentities(input.sources) ||
    input.sources.length > CATALOG_SOURCE_BATCH_LIMIT
  ) {
    return {
      causeCode: "INVALID_SITEMAP_SOURCE_CANDIDATES",
      kind: "invalid-response",
    }
  }
  if (input.sources.length === 0) {
    return { kind: "found", value: [] }
  }

  try {
    const assignments = parseAssignmentBatch(
      await dependencies.readAssignments({
        binding: input.binding,
        kind: input.kind,
        sources: input.sources,
      }),
      input.binding,
      input.kind,
      input.sources
    )
    if (!assignments) {
      return {
        causeCode: "INVALID_SITEMAP_ASSIGNMENT_BATCH_RESPONSE",
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
    binding: Pick<MarketRuntimeBinding, "locale" | "market" | "salesChannelId">
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
  try {
    for (const batch of chunks(input.sources, PRODUCT_SOURCE_BATCH_LIMIT)) {
      const payload = await dependencies.readProducts({
        market: input.binding.market,
        sources: batch,
      })
      if (
        !isRecord(payload) ||
        payload.schemaVersion !== 1 ||
        payload.marketCode !== input.binding.market ||
        !Array.isArray(payload.sources) ||
        payload.sources.length !== batch.length ||
        Object.keys(payload).some(
          (key) => !["marketCode", "schemaVersion", "sources"].includes(key)
        )
      ) {
        return {
          causeCode: "INVALID_PRODUCT_SITEMAP_BATCH_RESPONSE",
          kind: "invalid-response",
        }
      }
      for (const [index, value] of payload.sources.entries()) {
        const source = batch[index]
        if (
          !(source && isRecord(value)) ||
          value.entityId !== source.sourceId ||
          value.marketCode !== input.binding.market ||
          value.publicSlug !== source.publicSlug ||
          value.salesChannelId !== input.binding.salesChannelId ||
          typeof value.sourceVersion !== "string" ||
          !Number.isFinite(Date.parse(value.sourceVersion)) ||
          !isRecord(value.translation) ||
          value.translation.localeCode !== input.binding.locale ||
          value.translation.reference !== "product" ||
          typeof value.translation.translationId !== "string" ||
          value.translation.translationId.length === 0 ||
          Object.keys(value).some(
            (key) =>
              ![
                "entityId",
                "marketCode",
                "publicSlug",
                "salesChannelId",
                "sourceVersion",
                "translation",
              ].includes(key)
          ) ||
          Object.keys(value.translation).some(
            (key) => !["localeCode", "reference", "translationId"].includes(key)
          )
        ) {
          return {
            causeCode: "INVALID_PRODUCT_SITEMAP_BATCH_RESPONSE",
            kind: "invalid-response",
          }
        }
        validations.push({
          routeId: source.routeId,
          updatedAt: value.sourceVersion,
        })
      }
    }
    return { kind: "found", value: validations }
  } catch (error) {
    const status = statusOf(error)
    if (status === 404) {
      return {
        causeCode: "ACTIVE_PRODUCT_SOURCE_MISSING",
        kind: "invalid-response",
      }
    }
    return mapCatalogError(error)
  }
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

const hasNoindexDemoFallback = (
  source: SitemapStaticSourceCandidate,
  locale: HerbatikaLocale
) =>
  Boolean(
    getRoDemoStaticPage(source.staticRouteKey as StaticRootPageKey, locale)
  )

type StaticSourcePartition = Readonly<{
  cmsSources: readonly SitemapStaticSourceCandidate[]
  validations: readonly SitemapSourceValidation[]
}>

const partitionStaticSources = (
  sources: readonly SitemapStaticSourceCandidate[],
  locale: HerbatikaLocale
): SourceReadResult<StaticSourcePartition> => {
  const cmsSources: SitemapStaticSourceCandidate[] = []
  const validations: SitemapSourceValidation[] = []
  for (const source of sources) {
    if (!isStaticRootPageKey(source.staticRouteKey)) {
      continue
    }
    const codeOwned = hasCodeOwnedStaticPage(source.staticRouteKey, locale)
    if (codeOwned === null) {
      cmsSources.push(source)
    } else if (codeOwned) {
      validations.push({ routeId: source.routeId })
    } else {
      return {
        causeCode: "MISSING_CODE_OWNED_STATIC_PAGE_SOURCE",
        kind: "invalid-response",
      }
    }
  }
  return { kind: "found", value: { cmsSources, validations } }
}

const collectStaticCmsBatchValidations = (
  batch: readonly SitemapStaticSourceCandidate[],
  results: readonly CmsReadResult<CmsPage>[],
  locale: HerbatikaLocale
): SourceReadResult<readonly SitemapSourceValidation[]> => {
  const validations: SitemapSourceValidation[] = []
  for (const [index, result] of results.entries()) {
    const source = batch[index]
    if (!source) {
      return {
        causeCode: "INVALID_STATIC_CMS_VALIDATION_BATCH",
        kind: "invalid-response",
      }
    }
    if (
      result.kind === "missing" ||
      (result.kind !== "found" && hasNoindexDemoFallback(source, locale))
    ) {
      // Demo fallbacks are deliberately noindex and stay out of sitemaps.
      continue
    }
    if (result.kind !== "found") {
      return result
    }
    validations.push({
      routeId: source.routeId,
      updatedAt: contentUpdatedAt(result.value),
    })
  }
  return { kind: "found", value: validations }
}

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
  const partition = partitionStaticSources(input.sources, input.locale)
  if (partition.kind !== "found") {
    return partition
  }
  const validations = [...partition.value.validations]
  for (const batch of chunks(
    partition.value.cmsSources,
    SOURCE_VALIDATION_CONCURRENCY
  )) {
    const results = await Promise.all(
      batch.map((source) =>
        dependencies.readStaticPage(
          source.staticRouteKey as StaticRootPageKey,
          input.locale
        )
      )
    )
    const batchValidation = collectStaticCmsBatchValidations(
      batch,
      results,
      input.locale
    )
    if (batchValidation.kind !== "found") {
      return batchValidation
    }
    validations.push(...batchValidation.value)
  }
  return { kind: "found", value: validations }
}
