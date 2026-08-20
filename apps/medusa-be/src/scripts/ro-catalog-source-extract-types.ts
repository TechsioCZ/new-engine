export const RO_SOURCE_SCHEMA_VERSION = 1 as const
export const RO_SOURCE_ORIGIN = "https://www.herbatica.ro" as const

export type RoSourceText = Readonly<{
  html: string
  sha256: string
  text: string
}>

export type RoSourceCategoryBreadcrumb = Readonly<{
  name: string
  slug: string
  url: string
}>

export type RoSourceWarning = Readonly<{
  code:
    | "duplicate"
    | "missing-field"
    | "non-ron-price"
    | "placeholder"
    | "possible-sk-cz"
  field?: string
  message: string
  sample?: string
}>

export type RoSourceProductCandidate = Readonly<{
  approvalStatus: "unapproved"
  candidateSha256: string
  canonicalSlug: string
  categoryBreadcrumbs: readonly RoSourceCategoryBreadcrumb[]
  descriptions: Readonly<{
    long: RoSourceText
    short: RoSourceText
  }>
  ean: null | string
  price: Readonly<{
    amount: null | number
    currency: null | string
  }>
  sku: null | string
  source: Readonly<{
    htmlSha256: string
    retrievedAt: string
    url: string
  }>
  title: string
  warnings: readonly RoSourceWarning[]
}>

export type RoSourceDuplicateGroup = Readonly<{
  field: "content" | "ean" | "sku" | "slug" | "url"
  value: string
  urls: readonly string[]
}>

export type RoSourceCandidateManifest = Readonly<{
  approval: Readonly<{
    blocked: boolean
    blockingIssues: readonly string[]
    reason: string
    status: "unapproved"
  }>
  coverage: Readonly<{
    classifiedProductPages: number
    complete: boolean
    entries: readonly RoSourceCoverageEntry[]
    expectedProductPages: number
  }>
  generatedAt: string
  locale: "ro-RO"
  market: "ro"
  products: readonly RoSourceProductCandidate[]
  quality: Readonly<{
    duplicateGroups: readonly RoSourceDuplicateGroup[]
    productsWithWarnings: number
    warnings: number
  }>
  schemaVersion: typeof RO_SOURCE_SCHEMA_VERSION
  source: Readonly<{
    robotsSha256: string
    sitemapSha256: string
    sitemapUrl: string
  }>
}>

export type RoSourceSitemapEntry = Readonly<{
  productHint: boolean
  url: string
}>

export type RoSourceSitemapInventoryEntry = Readonly<{
  crawlable: boolean
  normalizedUrl?: string
  productHint: boolean
  skipReason?: string
  url: string
}>

export type RoSourceCoverageEntry = Readonly<{
  message?: string
  productHint: boolean
  source: "category-discovery" | "sitemap"
  status: "category" | "error" | "other" | "pending" | "product" | "skipped"
  url: string
}>

export type RoSourcePageParseResult =
  | Readonly<{
      kind: "category"
      productUrls: readonly string[]
    }>
  | Readonly<{
      candidate: Omit<
        RoSourceProductCandidate,
        "approvalStatus" | "candidateSha256" | "source" | "warnings"
      >
      kind: "product"
      warnings: readonly RoSourceWarning[]
    }>
  | Readonly<{ kind: "other" }>

export type RoSourceCacheRecord = Readonly<{
  body: string
  contentSha256: string
  contentType: string
  retrievedAt: string
  schemaVersion: 1
  url: string
}>

export type RoSourceCheckpoint = Readonly<{
  candidates: readonly RoSourceProductCandidate[]
  completedUrls: readonly string[]
  coverage: readonly RoSourceCoverageEntry[]
  createdAt: string
  pendingUrls: readonly string[]
  schemaVersion: 1
  sitemapSha256: string
  sitemapUrl: string
  updatedAt: string
}>

export type RoSourceExtractOptions = Readonly<{
  cacheDir: string
  checkpointPath: string
  concurrency: number
  delayMs: number
  maxBodyBytes: number
  maxPages: number
  outputPath: string
  refresh: boolean
  requestTimeoutMs: number
  sitemapUrl: string
  userAgent: string
}>

export type RoSourceExtractDependencies = Readonly<{
  fetch: typeof fetch
  now: () => Date
  sleep: (milliseconds: number) => Promise<void>
}>
