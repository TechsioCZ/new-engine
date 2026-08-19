import { randomUUID } from "node:crypto"
import type { Logger } from "@medusajs/framework/types"
import { readCanonicalPublicHref, readContentSourceId } from "./documents"

export type UrlRegistryProjectionMarket = "sk" | "cz" | "hu" | "ro"
export type UrlRegistryContentSourceType = "article" | "page"

export type UrlRegistryContentProjectionInput = Readonly<{
  sourceId: string
  sourceType: UrlRegistryContentSourceType
}>

type UrlRegistryContentProjectionConfig = Readonly<{
  token: string
  url: URL
}>

type ProjectionFetch = typeof globalThis.fetch

const CONTENT_PROJECTION_PATH = "/api/internal/url-registry/content-projections"
const MAX_BATCH_SIZE = 100
const MAX_RESOLUTION_SIZE = 500
const MAX_RESPONSE_BYTES = 128 * 1024
const REQUEST_TIMEOUT_MILLISECONDS = 2000
const REQUEST_ATTEMPTS = 2
const TOKEN_PATTERN = /^[\x21-\x7e]{32,512}$/
const UNSIGNED_INTEGER_PATTERN = /^\d+$/u

export class UrlRegistryContentProjectionError extends Error {
  readonly retryable: boolean

  constructor(message: string, retryable: boolean) {
    super(message)
    this.name = "UrlRegistryContentProjectionError"
    this.retryable = retryable
  }
}

export const contentProjectionKey = (
  sourceType: UrlRegistryContentSourceType,
  sourceId: string
) => `${sourceType}\u0000${sourceId}`

export const marketFromContentLocale = (
  locale: string
): UrlRegistryProjectionMarket | null => {
  const normalized = locale.trim().toLowerCase().replaceAll("_", "-")
  if (normalized === "sk" || normalized === "sk-sk") {
    return "sk"
  }
  if (normalized === "cs" || normalized === "cs-cz" || normalized === "cz") {
    return "cz"
  }
  if (normalized === "hu" || normalized === "hu-hu") {
    return "hu"
  }
  if (normalized === "ro" || normalized === "ro-ro") {
    return "ro"
  }
  return null
}

const isSafeInternalOrigin = (url: URL) =>
  (url.protocol === "http:" || url.protocol === "https:") &&
  !url.username &&
  !url.password &&
  url.pathname === "/" &&
  !url.search &&
  !url.hash

const isSafeEndpoint = (url: URL, internalOrigin: URL) =>
  url.origin === internalOrigin.origin &&
  url.pathname === CONTENT_PROJECTION_PATH &&
  !url.username &&
  !url.password &&
  !url.search &&
  !url.hash

export const readUrlRegistryContentProjectionConfig = (
  environment: NodeJS.ProcessEnv = process.env
): UrlRegistryContentProjectionConfig | null => {
  if (environment.URL_REGISTRY_CONTENT_PROJECTION_ENABLED !== "1") {
    return null
  }

  const rawUrl = environment.URL_REGISTRY_CONTENT_PROJECTION_URL?.trim()
  const rawInternalOrigin =
    environment.URL_REGISTRY_HERBATIKA_INTERNAL_ORIGIN?.trim()
  const token = environment.URL_REGISTRY_CONTENT_PROJECTION_TOKEN
  if (!(rawUrl && rawInternalOrigin && token && TOKEN_PATTERN.test(token))) {
    throw new UrlRegistryContentProjectionError(
      "URL registry content projection is enabled but misconfigured",
      false
    )
  }

  let internalOrigin: URL
  let url: URL
  try {
    internalOrigin = new URL(rawInternalOrigin)
    url = new URL(rawUrl)
  } catch {
    throw new UrlRegistryContentProjectionError(
      "URL registry content projection URL is invalid",
      false
    )
  }
  if (
    !(
      isSafeInternalOrigin(internalOrigin) &&
      isSafeEndpoint(url, internalOrigin)
    )
  ) {
    throw new UrlRegistryContentProjectionError(
      "URL registry content projection URL is not an approved endpoint",
      false
    )
  }

  return { token, url }
}

const validateInputs = (
  entries: readonly UrlRegistryContentProjectionInput[],
  maximumSize = MAX_BATCH_SIZE
) => {
  if (entries.length < 1 || entries.length > maximumSize) {
    throw new UrlRegistryContentProjectionError(
      `URL registry content projection batches require 1 to ${maximumSize} entries`,
      false
    )
  }
  const identities = new Set<string>()
  for (const entry of entries) {
    const sourceId = readContentSourceId(entry.sourceId)
    if (!sourceId || sourceId !== entry.sourceId || sourceId.length > 255) {
      throw new UrlRegistryContentProjectionError(
        "URL registry content projection source ID is invalid",
        false
      )
    }
    const key = contentProjectionKey(entry.sourceType, entry.sourceId)
    if (identities.has(key)) {
      throw new UrlRegistryContentProjectionError(
        "URL registry content projection request contains a duplicate identity",
        false
      )
    }
    identities.add(key)
  }
  return identities
}

const parseResponse = (
  value: unknown,
  market: UrlRegistryProjectionMarket,
  expectedIdentities: ReadonlySet<string>,
  requestId: string
): ReadonlyMap<string, string> => {
  if (!(value && typeof value === "object" && !Array.isArray(value))) {
    throw new UrlRegistryContentProjectionError(
      "URL registry content projection response is invalid",
      false
    )
  }
  const record = value as Record<string, unknown>
  if (
    record.schemaVersion !== 1 ||
    record.market !== market ||
    record.requestId !== requestId ||
    !Array.isArray(record.projections) ||
    record.projections.length > expectedIdentities.size
  ) {
    throw new UrlRegistryContentProjectionError(
      "URL registry content projection response contract does not match the request",
      false
    )
  }

  const projections = new Map<string, string>()
  for (const valueProjection of record.projections) {
    if (
      !(
        valueProjection &&
        typeof valueProjection === "object" &&
        !Array.isArray(valueProjection)
      )
    ) {
      throw new UrlRegistryContentProjectionError(
        "URL registry content projection response entry is invalid",
        false
      )
    }
    const projection = valueProjection as Record<string, unknown>
    if (
      (projection.sourceType !== "article" &&
        projection.sourceType !== "page") ||
      typeof projection.sourceId !== "string" ||
      !Number.isSafeInteger(projection.routeVersion) ||
      Number(projection.routeVersion) < 1
    ) {
      throw new UrlRegistryContentProjectionError(
        "URL registry content projection response entry is stale or invalid",
        false
      )
    }
    const key = contentProjectionKey(projection.sourceType, projection.sourceId)
    const href = readCanonicalPublicHref(projection.href)
    if (!expectedIdentities.has(key) || projections.has(key) || !href) {
      throw new UrlRegistryContentProjectionError(
        "URL registry content projection response contains an unexpected projection",
        false
      )
    }
    projections.set(key, href)
  }
  return projections
}

const parseJsonResponse = async (response: Response): Promise<unknown> => {
  const contentLength = response.headers.get("content-length")
  if (
    contentLength &&
    UNSIGNED_INTEGER_PATTERN.test(contentLength) &&
    Number(contentLength) > MAX_RESPONSE_BYTES
  ) {
    throw new UrlRegistryContentProjectionError(
      "URL registry content projection response is too large",
      false
    )
  }
  const body = await response.text()
  if (new TextEncoder().encode(body).byteLength > MAX_RESPONSE_BYTES) {
    throw new UrlRegistryContentProjectionError(
      "URL registry content projection response is too large",
      false
    )
  }
  try {
    return JSON.parse(body)
  } catch {
    throw new UrlRegistryContentProjectionError(
      "URL registry content projection response is not JSON",
      false
    )
  }
}

export class UrlRegistryContentProjectionClient {
  private readonly config: UrlRegistryContentProjectionConfig
  private readonly fetchImplementation: ProjectionFetch

  constructor(
    config: UrlRegistryContentProjectionConfig,
    fetchImplementation: ProjectionFetch = globalThis.fetch
  ) {
    this.config = config
    this.fetchImplementation = fetchImplementation
  }

  private async requestOnce(
    market: UrlRegistryProjectionMarket,
    entries: readonly UrlRegistryContentProjectionInput[],
    expectedIdentities: ReadonlySet<string>,
    requestId: string
  ): Promise<ReadonlyMap<string, string>> {
    const controller = new AbortController()
    const timeout = setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MILLISECONDS
    )
    try {
      const response = await this.fetchImplementation(this.config.url, {
        body: JSON.stringify({ entries, market, requestId, schemaVersion: 1 }),
        headers: {
          authorization: `Bearer ${this.config.token}`,
          "content-type": "application/json",
        },
        method: "POST",
        redirect: "error",
        signal: controller.signal,
      })
      if (!response.ok) {
        throw new UrlRegistryContentProjectionError(
          `URL registry content projection request failed with status ${response.status}`,
          response.status === 429 || response.status >= 500
        )
      }
      const mediaType = response.headers
        .get("content-type")
        ?.split(";", 1)[0]
        ?.trim()
        .toLowerCase()
      if (mediaType !== "application/json") {
        throw new UrlRegistryContentProjectionError(
          "URL registry content projection response has an invalid media type",
          false
        )
      }
      return parseResponse(
        await parseJsonResponse(response),
        market,
        expectedIdentities,
        requestId
      )
    } finally {
      clearTimeout(timeout)
    }
  }

  async resolve(
    market: UrlRegistryProjectionMarket,
    entries: readonly UrlRegistryContentProjectionInput[]
  ): Promise<ReadonlyMap<string, string>> {
    const expectedIdentities = validateInputs(entries)
    const requestId = randomUUID()
    let lastError: unknown

    for (let attempt = 0; attempt < REQUEST_ATTEMPTS; attempt += 1) {
      try {
        return await this.requestOnce(
          market,
          entries,
          expectedIdentities,
          requestId
        )
      } catch (error) {
        lastError = error
        if (
          error instanceof UrlRegistryContentProjectionError &&
          !error.retryable
        ) {
          throw error
        }
      }
      if (attempt + 1 < REQUEST_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 50))
      }
    }

    throw (
      lastError ??
      new UrlRegistryContentProjectionError(
        "URL registry content projection request failed",
        true
      )
    )
  }
}

export const resolveContentProjectionHrefs = async (
  entries: readonly UrlRegistryContentProjectionInput[],
  locale: string,
  logger: Pick<Logger, "warn">,
  environment: NodeJS.ProcessEnv = process.env
): Promise<ReadonlyMap<string, string>> => {
  if (entries.length === 0) {
    return new Map()
  }
  const market = marketFromContentLocale(locale)
  if (!market) {
    logger.warn(
      "Omitting CMS search projections because the search profile locale is not market-scoped"
    )
    return new Map()
  }

  try {
    const config = readUrlRegistryContentProjectionConfig(environment)
    if (!config) {
      return new Map()
    }
    validateInputs(entries, MAX_RESOLUTION_SIZE)

    const client = new UrlRegistryContentProjectionClient(config)
    const projections = new Map<string, string>()
    for (let offset = 0; offset < entries.length; offset += MAX_BATCH_SIZE) {
      const batch = await client.resolve(
        market,
        entries.slice(offset, offset + MAX_BATCH_SIZE)
      )
      for (const [key, href] of batch) {
        if (projections.has(key)) {
          throw new UrlRegistryContentProjectionError(
            "URL registry content projection response contains a duplicate projection",
            false
          )
        }
        projections.set(key, href)
      }
    }
    return projections
  } catch {
    logger.warn(
      "Omitting CMS search projections because the URL registry projection is unavailable or invalid"
    )
    return new Map()
  }
}
