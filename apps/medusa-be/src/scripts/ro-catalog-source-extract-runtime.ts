import { randomUUID } from "node:crypto"
import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import {
  candidateHash,
  findRoSourceDuplicates,
  parseRoSourcePage,
  parseRoSourceSitemapInventory,
  sha256,
  toOfficialPublicUrl,
} from "./ro-catalog-source-extract-parser"
import {
  RO_SOURCE_SCHEMA_VERSION,
  type RoSourceCacheRecord,
  type RoSourceCandidateManifest,
  type RoSourceCheckpoint,
  type RoSourceCoverageEntry,
  type RoSourceExtractDependencies,
  type RoSourceExtractOptions,
  type RoSourceProductCandidate,
  type RoSourceWarning,
} from "./ro-catalog-source-extract-types"

type RobotsRule = Readonly<{ allow: boolean; pattern: string }>
type RobotsGroup = Readonly<{
  agents: readonly string[]
  crawlDelaySeconds?: number
  rules: readonly RobotsRule[]
}>

export type RobotsPolicy = Readonly<{
  crawlDelaySeconds?: number
  groups: readonly RobotsGroup[]
  sitemaps: readonly string[]
}>

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504])
const DEFAULT_RETRY_DELAY_MS = 2000
const LINE_PATTERN = /\r?\n/
const COMMENT_PATTERN = /\s+#.*$/

const defaultDependencies: RoSourceExtractDependencies = {
  fetch: globalThis.fetch,
  now: () => new Date(),
  sleep: (milliseconds) =>
    new Promise((resolveSleep) => setTimeout(resolveSleep, milliseconds)),
}

const readJson = async <T>(path: string): Promise<T | undefined> => {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return
    }
    throw new Error(`Cannot read JSON file ${path}`, { cause: error })
  }
}

const writeJsonAtomic = async (path: string, value: unknown) => {
  const absolute = resolve(path)
  await mkdir(dirname(absolute), { recursive: true })
  const temporary = `${absolute}.tmp-${process.pid}-${randomUUID()}`
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8")
  await rename(temporary, absolute)
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: robots.txt is a small line-oriented state machine with explicit directive handling.
export const parseRobotsTxt = (text: string): RobotsPolicy => {
  const groups: {
    agents: string[]
    crawlDelaySeconds?: number
    rules: RobotsRule[]
  }[] = []
  const sitemaps: string[] = []
  let current: (typeof groups)[number] | undefined
  let hasRules = false

  for (const rawLine of text.split(LINE_PATTERN)) {
    const line = rawLine.replace(COMMENT_PATTERN, "").trim()
    if (!line) {
      current = undefined
      hasRules = false
      continue
    }
    const separator = line.indexOf(":")
    if (separator < 0) {
      continue
    }
    const directive = line.slice(0, separator).trim().toLowerCase()
    const value = line.slice(separator + 1).trim()
    if (directive === "sitemap") {
      if (value) {
        sitemaps.push(value)
      }
      continue
    }
    if (directive === "user-agent") {
      if (!current || hasRules) {
        current = { agents: [], rules: [] }
        groups.push(current)
        hasRules = false
      }
      if (value) {
        current.agents.push(value.toLowerCase())
      }
      continue
    }
    if (!current) {
      continue
    }
    if (directive === "allow" || directive === "disallow") {
      hasRules = true
      if (value) {
        current.rules.push({ allow: directive === "allow", pattern: value })
      }
    } else if (directive === "crawl-delay") {
      hasRules = true
      const seconds = Number(value)
      if (Number.isFinite(seconds) && seconds >= 0) {
        current.crawlDelaySeconds = seconds
      }
    }
  }
  return { groups, sitemaps }
}

const robotsPattern = (pattern: string) => {
  const anchored = pattern.endsWith("$")
  const source = (anchored ? pattern.slice(0, -1) : pattern)
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replaceAll("*", ".*")
  return new RegExp(`^${source}${anchored ? "$" : ""}`)
}

const applicableGroups = (policy: RobotsPolicy, userAgent: string) => {
  const normalizedAgent = userAgent.toLowerCase()
  const matches = policy.groups.flatMap((group) =>
    group.agents
      .filter((agent) => agent === "*" || normalizedAgent.includes(agent))
      .map((agent) => ({
        group,
        specificity: agent === "*" ? 0 : agent.length,
      }))
  )
  const maxSpecificity = Math.max(
    -1,
    ...matches.map((match) => match.specificity)
  )
  return matches
    .filter((match) => match.specificity === maxSpecificity)
    .map((match) => match.group)
}

export const robotsAllows = (
  policy: RobotsPolicy,
  userAgent: string,
  rawUrl: string
) => {
  const url = new URL(toOfficialPublicUrl(rawUrl))
  const path = `${url.pathname}${url.search}`
  const matchingRules = applicableGroups(policy, userAgent)
    .flatMap((group) => group.rules)
    .filter((rule) => robotsPattern(rule.pattern).test(path))
    .sort(
      (left, right) =>
        right.pattern.replaceAll("*", "").length -
          left.pattern.replaceAll("*", "").length ||
        Number(right.allow) - Number(left.allow)
    )
  return matchingRules[0]?.allow ?? true
}

const effectiveCrawlDelayMs = (
  policy: RobotsPolicy,
  userAgent: string,
  configuredDelayMs: number
) => {
  const policyDelay = Math.max(
    0,
    ...applicableGroups(policy, userAgent).map(
      (group) => (group.crawlDelaySeconds ?? 0) * 1000
    )
  )
  return Math.max(configuredDelayMs, policyDelay)
}

class RequestGate {
  private readonly delayMs: number
  private readonly now: () => Date
  private readonly sleep: (milliseconds: number) => Promise<void>
  private nextStartAt = 0
  private pending: Promise<void> = Promise.resolve()

  constructor(
    delayMs: number,
    now: () => Date,
    sleep: (milliseconds: number) => Promise<void>
  ) {
    this.delayMs = delayMs
    this.now = now
    this.sleep = sleep
  }

  waitTurn() {
    const turn = this.pending.then(async () => {
      const remaining = this.nextStartAt - this.now().getTime()
      if (remaining > 0) {
        await this.sleep(remaining)
      }
      this.nextStartAt = this.now().getTime() + this.delayMs
    })
    this.pending = turn.catch(() => this.sleep(0))
    return turn
  }
}

const responseBody = async (response: Response, maxBodyBytes: number) => {
  const declaredLength = Number(response.headers.get("content-length"))
  if (Number.isFinite(declaredLength) && declaredLength > maxBodyBytes) {
    throw new Error(
      `Response from ${response.url} exceeds ${maxBodyBytes} bytes`
    )
  }
  const body = await response.text()
  if (Buffer.byteLength(body, "utf8") > maxBodyBytes) {
    throw new Error(
      `Response from ${response.url} exceeds ${maxBodyBytes} bytes`
    )
  }
  return body
}

const retryDelayMs = (response: Response, attempt: number) => {
  const retryAfter = response.headers.get("retry-after")
  if (retryAfter) {
    const seconds = Number(retryAfter)
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.min(seconds * 1000, 30_000)
    }
  }
  return DEFAULT_RETRY_DELAY_MS * 2 ** attempt
}

const fetchPublicText = async (
  rawUrl: string,
  options: RoSourceExtractOptions,
  dependencies: RoSourceExtractDependencies,
  gate: RequestGate
) => {
  const url = toOfficialPublicUrl(rawUrl)
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await gate.waitTurn()
    let response: Response
    try {
      response = await dependencies.fetch(url, {
        headers: {
          accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8",
          "user-agent": options.userAgent,
        },
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(options.requestTimeoutMs),
      })
    } catch (networkError) {
      if (attempt === 2) {
        throw networkError
      }
      await dependencies.sleep(DEFAULT_RETRY_DELAY_MS * 2 ** attempt)
      continue
    }
    if (response.url) {
      toOfficialPublicUrl(response.url)
    }
    if (response.ok) {
      return {
        body: await responseBody(response, options.maxBodyBytes),
        contentType: response.headers.get("content-type") ?? "",
        url,
      }
    }
    const error = new Error(
      `GET ${url} failed: ${response.status} ${response.statusText}`
    )
    if (!RETRYABLE_STATUS.has(response.status) || attempt === 2) {
      throw error
    }
    await dependencies.sleep(retryDelayMs(response, attempt))
  }
  throw new Error(`GET ${url} exhausted retries`)
}

const cachePathForUrl = (cacheDir: string, url: string) =>
  join(resolve(cacheDir), `${sha256(url)}.json`)

const validCacheRecord = (
  value: RoSourceCacheRecord | undefined,
  url: string
): value is RoSourceCacheRecord =>
  value?.schemaVersion === 1 &&
  value.url === url &&
  value.contentSha256 === sha256(value.body)

type CachedFetchContext = Readonly<{
  dependencies: RoSourceExtractDependencies
  gate: RequestGate
  options: RoSourceExtractOptions
  robots?: RobotsPolicy
}>

const cachedFetch = async (rawUrl: string, context: CachedFetchContext) => {
  const { dependencies, gate, options, robots } = context
  const url = toOfficialPublicUrl(rawUrl)
  if (robots && !robotsAllows(robots, options.userAgent, url)) {
    throw new Error(`robots.txt disallows ${url}`)
  }
  const path = cachePathForUrl(options.cacheDir, url)
  if (!options.refresh) {
    const cached = await readJson<RoSourceCacheRecord>(path)
    if (validCacheRecord(cached, url)) {
      return cached
    }
  }
  const fetched = await fetchPublicText(url, options, dependencies, gate)
  const record: RoSourceCacheRecord = {
    body: fetched.body,
    contentSha256: sha256(fetched.body),
    contentType: fetched.contentType,
    retrievedAt: dependencies.now().toISOString(),
    schemaVersion: 1,
    url,
  }
  await writeJsonAtomic(path, record)
  return record
}

const checkpointFrom = (input: {
  existing: RoSourceCheckpoint | undefined
  initialCoverage: readonly RoSourceCoverageEntry[]
  initialUrls: readonly string[]
  now: string
  sitemapSha256: string
  sitemapUrl: string
}): RoSourceCheckpoint => {
  const {
    existing,
    initialCoverage,
    initialUrls,
    now,
    sitemapSha256,
    sitemapUrl,
  } = input
  if (
    existing?.schemaVersion === 1 &&
    existing.sitemapUrl === sitemapUrl &&
    existing.sitemapSha256 === sitemapSha256 &&
    Array.isArray(existing.coverage)
  ) {
    return existing
  }
  return {
    candidates: [],
    completedUrls: [],
    coverage: initialCoverage,
    createdAt: now,
    pendingUrls: initialUrls,
    schemaVersion: 1,
    sitemapSha256,
    sitemapUrl,
    updatedAt: now,
  }
}

const duplicateWarningsByUrl = (
  products: readonly RoSourceProductCandidate[]
) => {
  const warnings = new Map<string, RoSourceWarning[]>()
  for (const group of findRoSourceDuplicates(products)) {
    for (const url of group.urls) {
      const current = warnings.get(url) ?? []
      current.push({
        code: "duplicate",
        field: group.field,
        message: `${group.field} duplicates ${group.urls.length - 1} other candidate(s)`,
        sample: group.value,
      })
      warnings.set(url, current)
    }
  }
  return warnings
}

const buildManifest = (input: {
  candidates: readonly RoSourceProductCandidate[]
  coverageEntries: readonly RoSourceCoverageEntry[]
  generatedAt: string
  robots: RoSourceCacheRecord
  sitemap: RoSourceCacheRecord
}): RoSourceCandidateManifest => {
  const { candidates, coverageEntries, generatedAt, robots, sitemap } = input
  const products = [...candidates].sort((left, right) =>
    left.source.url.localeCompare(right.source.url)
  )
  const duplicateGroups = findRoSourceDuplicates(products)
  const duplicateWarnings = duplicateWarningsByUrl(products)
  const productsWithDuplicateWarnings = products.map((product) => ({
    ...product,
    warnings: [
      ...product.warnings.filter((warning) => warning.code !== "duplicate"),
      ...(duplicateWarnings.get(product.source.url) ?? []),
    ],
  }))
  const coverage = [...coverageEntries].sort((left, right) =>
    left.url.localeCompare(right.url)
  )
  const sitemapCoverage = coverage.filter((entry) => entry.source === "sitemap")
  const expectedProductPages = sitemapCoverage.filter(
    (entry) => entry.productHint
  ).length
  const classifiedProductPages = sitemapCoverage.filter(
    (entry) => entry.status === "product"
  ).length
  const blockingIssues: string[] = []
  for (const status of ["pending", "error", "other", "skipped"] as const) {
    const affected = coverage.filter((entry) => entry.status === status)
    if (affected.length > 0) {
      blockingIssues.push(
        `${affected.length} coverage URL(s) have blocking status ${status}`
      )
    }
  }
  if (expectedProductPages !== classifiedProductPages) {
    blockingIssues.push(
      `sitemap expected ${expectedProductPages} product page(s), but ${classifiedProductPages} were classified as products`
    )
  }
  return {
    approval: {
      blocked: blockingIssues.length > 0,
      blockingIssues,
      reason:
        "Public-source extraction is evidence only; a Romanian catalog owner must review identity, wording, claims, categories, and RON price before import.",
      status: "unapproved",
    },
    coverage: {
      classifiedProductPages,
      complete: blockingIssues.length === 0,
      entries: coverage,
      expectedProductPages,
    },
    generatedAt,
    locale: "ro-RO",
    market: "ro",
    products: productsWithDuplicateWarnings,
    quality: {
      duplicateGroups,
      productsWithWarnings: productsWithDuplicateWarnings.filter(
        (product) => product.warnings.length > 0
      ).length,
      warnings: productsWithDuplicateWarnings.reduce(
        (total, product) => total + product.warnings.length,
        0
      ),
    },
    schemaVersion: RO_SOURCE_SCHEMA_VERSION,
    source: {
      robotsSha256: robots.contentSha256,
      sitemapSha256: sitemap.contentSha256,
      sitemapUrl: sitemap.url,
    },
  }
}

export const runRoCatalogSourceExtract = async (
  options: RoSourceExtractOptions,
  dependencyOverrides: Partial<RoSourceExtractDependencies> = {}
) => {
  const dependencies = { ...defaultDependencies, ...dependencyOverrides }
  const bootstrapGate = new RequestGate(
    options.delayMs,
    dependencies.now,
    dependencies.sleep
  )
  const robotsUrl = `${new URL(options.sitemapUrl).origin}/robots.txt`
  const robotsRecord = await cachedFetch(robotsUrl, {
    dependencies,
    gate: bootstrapGate,
    options,
  })
  const robots = parseRobotsTxt(robotsRecord.body)
  if (!robotsAllows(robots, options.userAgent, options.sitemapUrl)) {
    throw new Error(`robots.txt disallows sitemap ${options.sitemapUrl}`)
  }
  const gate = new RequestGate(
    effectiveCrawlDelayMs(robots, options.userAgent, options.delayMs),
    dependencies.now,
    dependencies.sleep
  )
  const sitemapRecord = await cachedFetch(options.sitemapUrl, {
    dependencies,
    gate,
    options,
    robots,
  })
  const sitemapInventory = parseRoSourceSitemapInventory(sitemapRecord.body)
  const sitemapEntries = new Map(
    sitemapInventory
      .filter(
        (entry): entry is typeof entry & { normalizedUrl: string } =>
          entry.crawlable && Boolean(entry.normalizedUrl)
      )
      .map((entry) => [
        entry.normalizedUrl,
        { productHint: entry.productHint, url: entry.normalizedUrl },
      ])
  )
  const sortedSitemapEntries = [...sitemapEntries.values()].sort(
    (left, right) =>
      Number(right.productHint) - Number(left.productHint) ||
      left.url.localeCompare(right.url)
  )
  const initialCoverage: RoSourceCoverageEntry[] = sitemapInventory.map(
    (entry) => ({
      ...(entry.skipReason ? { message: entry.skipReason } : {}),
      productHint: entry.productHint,
      source: "sitemap",
      status: entry.crawlable ? "pending" : "skipped",
      url: entry.normalizedUrl ?? entry.url,
    })
  )
  const now = dependencies.now().toISOString()
  const existingCheckpoint = await readJson<RoSourceCheckpoint>(
    options.checkpointPath
  )
  const checkpoint = checkpointFrom({
    existing: existingCheckpoint,
    initialCoverage,
    initialUrls: sortedSitemapEntries.map((entry) => entry.url),
    now,
    sitemapSha256: sitemapRecord.contentSha256,
    sitemapUrl: options.sitemapUrl,
  })
  const queue = [...checkpoint.pendingUrls]
  const queued = new Set(queue)
  const completed = new Set(checkpoint.completedUrls)
  const candidates = new Map(
    checkpoint.candidates.map((candidate) => [candidate.source.url, candidate])
  )
  let coverage = [...checkpoint.coverage]
  let cursor = 0
  let claimed = 0
  let checkpointWrite = Promise.resolve()

  const updateCoverage = (
    url: string,
    status: RoSourceCoverageEntry["status"],
    message?: string
  ) => {
    let matched = false
    coverage = coverage.map((entry) => {
      if (entry.url !== url) {
        return entry
      }
      matched = true
      return { ...entry, ...(message ? { message } : {}), status }
    })
    if (!matched) {
      coverage.push({
        ...(message ? { message } : {}),
        productHint: true,
        source: "category-discovery",
        status,
        url,
      })
    }
  }

  const saveCheckpoint = () => {
    const value: RoSourceCheckpoint = {
      candidates: [...candidates.values()].sort((left, right) =>
        left.source.url.localeCompare(right.source.url)
      ),
      completedUrls: [...completed].sort(),
      coverage: [...coverage].sort((left, right) =>
        left.url.localeCompare(right.url)
      ),
      createdAt: checkpoint.createdAt,
      pendingUrls: queue.filter((url) => !completed.has(url)),
      schemaVersion: 1,
      sitemapSha256: sitemapRecord.contentSha256,
      sitemapUrl: options.sitemapUrl,
      updatedAt: dependencies.now().toISOString(),
    }
    checkpointWrite = checkpointWrite.then(() =>
      writeJsonAtomic(options.checkpointPath, value)
    )
    return checkpointWrite
  }

  const takeNext = () => {
    while (cursor < queue.length && completed.has(queue[cursor] ?? "")) {
      cursor += 1
    }
    if (claimed >= options.maxPages || cursor >= queue.length) {
      return
    }
    const url = queue[cursor]
    cursor += 1
    claimed += 1
    return url
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: One worker owns the bounded fetch/parse/checkpoint state transition.
  const worker = async () => {
    for (let url = takeNext(); url; url = takeNext()) {
      if (!robotsAllows(robots, options.userAgent, url)) {
        updateCoverage(url, "skipped", "robots.txt disallows this URL")
        completed.add(url)
        await saveCheckpoint()
        continue
      }
      let record: RoSourceCacheRecord
      let parsed: ReturnType<typeof parseRoSourcePage>
      try {
        record = await cachedFetch(url, {
          dependencies,
          gate,
          options,
          robots,
        })
        parsed = parseRoSourcePage(record.body, record.url)
      } catch (error) {
        updateCoverage(
          url,
          "error",
          error instanceof Error ? error.message : String(error)
        )
        await saveCheckpoint()
        continue
      }
      if (parsed.kind === "product") {
        const withoutHash = {
          ...parsed.candidate,
          approvalStatus: "unapproved" as const,
          source: {
            htmlSha256: record.contentSha256,
            retrievedAt: record.retrievedAt,
            url: record.url,
          },
        }
        const candidate: RoSourceProductCandidate = {
          ...withoutHash,
          candidateSha256: candidateHash(withoutHash),
          warnings: parsed.warnings,
        }
        candidates.set(record.url, candidate)
        updateCoverage(url, "product")
      } else if (parsed.kind === "category") {
        updateCoverage(url, "category")
        for (const productUrl of parsed.productUrls) {
          if (!(queued.has(productUrl) || completed.has(productUrl))) {
            queued.add(productUrl)
            queue.push(productUrl)
            updateCoverage(productUrl, "pending")
          }
        }
      } else {
        updateCoverage(
          url,
          "other",
          "HTML did not match a supported product or category contract"
        )
      }
      completed.add(url)
      await saveCheckpoint()
    }
  }

  await Promise.all(Array.from({ length: options.concurrency }, () => worker()))
  await saveCheckpoint()
  const manifest = buildManifest({
    candidates: [...candidates.values()],
    coverageEntries: coverage,
    generatedAt: dependencies.now().toISOString(),
    robots: robotsRecord,
    sitemap: sitemapRecord,
  })
  await writeJsonAtomic(options.outputPath, manifest)
  return {
    completedPages: claimed,
    manifest,
    pendingPages: queue.filter((url) => !completed.has(url)).length,
  }
}
