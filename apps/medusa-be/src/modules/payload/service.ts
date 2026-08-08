import { createHash } from "node:crypto"

import { zodValidator } from "@medusajs/framework"
import type { ICachingModuleService, Logger } from "@medusajs/framework/types"
import { MedusaError, MedusaService, Modules } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { isRecord, omitKeys } from "@techsio/std/object"
import qs from "qs"

import { safeResolve } from "../../utils/safe-resolve"
import {
  ArticleCategoriesWithArticlesSchema,
  CmsArticleCategorySchema,
  CmsArticleSchema,
  CmsArticlesBulkResultSchema,
  CmsHeroCarouselSchema,
  CmsHeroCarouselsBulkResultSchema,
  CmsPageCategorySchema,
  CmsPageSchema,
  CmsPagesBulkResultSchema,
  PageCategoriesWithPagesSchema,
} from "./schemas"
import type {
  CmsArticleCategoryDTO,
  CmsArticleDTO,
  CmsCategoryListOptions,
  CmsHeroCarouselDTO,
  CmsListOptions,
  CmsPageCategoryDTO,
  CmsPageDTO,
  PayloadBulkResult,
  PayloadModuleOptions,
  PayloadQueryOptions,
} from "./types"

const CMS = "cms"
const DEFAULT_LOCALE = "default"
const STATUS_PUBLISHED = "published"
const PAGES = "pages"
const ARTICLES = "articles"
const MEDIA = "media"
const HERO_CAROUSELS = "hero-carousels"
const PAGE_CATEGORIES = "page-categories"
const ARTICLE_CATEGORIES = "article-categories"
const PAGE_CATEGORY_GROUPS = "page-categories-with-pages"
const ARTICLE_CATEGORY_GROUPS = "article-categories-with-articles"
const RETURN_HTML_HEADER = "X-Payload-Return-Html"
const TRAILING_SLASH_REGEX = /\/$/u
const PRIVATE_PAYLOAD_FIELD_NAMES = new Set([
  "apiKey",
  "apiKeyIndex",
  "enableAPIKey",
  "hash",
  "internalTitle",
  "loginAttempts",
  "lockUntil",
  "password",
  "resetPasswordExpiration",
  "resetPasswordToken",
  "salt",
  "sessions",
])

type CachingDependency = Pick<ICachingModuleService, "clear" | "get" | "set">

const isCachingDependency = (value: unknown): value is CachingDependency =>
  isRecord(value) &&
  typeof value["clear"] === "function" &&
  typeof value["get"] === "function" &&
  typeof value["set"] === "function"

interface InjectedDependencies {
  logger: Logger
  [Modules.CACHING]?: CachingDependency
  [key: string]: unknown
}

const CACHE_TAGS = {
  ALL: CMS,
  ARTICLES: `${CMS}:${ARTICLES}`,
  ARTICLE_CATEGORIES: `${CMS}:${ARTICLE_CATEGORIES}`,
  HERO_CAROUSELS: `${CMS}:${HERO_CAROUSELS}`,
  PAGES: `${CMS}:${PAGES}`,
  PAGE_CATEGORIES: `${CMS}:${PAGE_CATEGORIES}`,
} as const

const DEFAULT_TTLS = {
  CONTENT: 3600,
  LIST: 600,
} as const
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000

/**
 * Build a query string from Payload list/query options.
 */
const buildQuery = (options?: PayloadQueryOptions): string => {
  if (!options) {
    return ""
  }
  return `?${qs.stringify(options, { encodeValuesOnly: true })}`
}

/**
 * Build a query string from raw params while skipping null/undefined values.
 */
const buildParamsQuery = (params?: Record<string, unknown>): string => {
  if (!params) {
    return ""
  }
  const query = qs.stringify(params, {
    encodeValuesOnly: true,
    skipNulls: true,
  })
  return query ? `?${query}` : ""
}

/**
 * Create a cache key for list queries using locale and pagination options.
 */
const buildListCacheKey = (
  prefix: string,
  options?: CmsListOptions,
): string => {
  const locale = options?.locale ?? DEFAULT_LOCALE

  if (!options) {
    return `${prefix}:${locale}:default`
  }

  const rest = omitKeys(options, ["locale"])
  const hasOptions =
    rest.limit !== undefined ||
    rest.page !== undefined ||
    rest.sort !== undefined
  const hash = hasOptions
    ? createHash("sha256").update(JSON.stringify(rest)).digest("hex")
    : "default"

  return `${prefix}:${locale}:${hash}`
}

/**
 * Create a cache key for category list queries by locale and slug filter.
 */
const buildCategoryListCacheKey = (
  prefix: string,
  options?: CmsCategoryListOptions,
): string => {
  const locale = options?.locale ?? DEFAULT_LOCALE
  const slug = options?.categorySlug ?? "all"
  return `${prefix}:${locale}:${slug}`
}

/**
 * Build a locale-specific cache tag.
 */
const buildLocaleTag = (tag: string, locale?: string): string =>
  `${tag}:locale:${locale ?? DEFAULT_LOCALE}`

/**
 * Normalize locale query values that might be stringified null/undefined.
 */
const normalizeLocale = (locale?: string): string | undefined => {
  if (
    locale === undefined ||
    locale === "" ||
    locale === "null" ||
    locale === "undefined"
  ) {
    return undefined
  }
  return locale
}

/**
 * Extract a human-readable error message from a Payload API error response.
 */
const getPayloadErrorMessage = (result: unknown, status: number): string => {
  if (isRecord(result) && typeof result["message"] === "string") {
    return result["message"]
  }
  return `Payload API error: ${status}`
}

/**
 * Payload relationship fields can include expanded auth users. Strip private
 * auth fields before responses are cached or returned by public Store APIs.
 */
const redactValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => redactValue(entry))
  }

  if (!isRecord(value) || value instanceof Date) {
    return value
  }

  const shouldRedactEmail = Object.keys(value).some((key) =>
    PRIVATE_PAYLOAD_FIELD_NAMES.has(key),
  )

  const entries: [string, unknown][] = []
  for (const [key, entryValue] of Object.entries(value)) {
    if (
      PRIVATE_PAYLOAD_FIELD_NAMES.has(key) ||
      (shouldRedactEmail && key === "email")
    ) {
      continue
    }
    entries.push([key, redactValue(entryValue)])
  }

  return Object.fromEntries(entries)
}

/**
 * Build a type predicate from a zod schema for safely narrowing `unknown`
 * values (e.g. validated API responses) without a type cast.
 */
const isValidatedBy =
  <T>(schema: z.ZodType<T>) =>
  (value: unknown): value is T =>
    schema.safeParse(value).success

/**
 * Cache storage is an external boundary. Re-validate every cached value after
 * redaction before exposing it as a CMS DTO.
 */
const isCachedPage = (value: unknown): value is CmsPageDTO | null =>
  value === null || CmsPageSchema.safeParse(value).success

const isCachedArticle = (value: unknown): value is CmsArticleDTO | null =>
  value === null || CmsArticleSchema.safeParse(value).success

const isCachedPageCategoryList = (
  value: unknown,
): value is CmsPageCategoryDTO[] =>
  z.array(CmsPageCategorySchema).safeParse(value).success

const isCachedArticleCategoryList = (
  value: unknown,
): value is CmsArticleCategoryDTO[] =>
  z.array(CmsArticleCategorySchema).safeParse(value).success

const isCachedHeroCarouselList = (
  value: unknown,
): value is CmsHeroCarouselDTO[] =>
  z.array(CmsHeroCarouselSchema).safeParse(value).success

/**
 * Medusa module service for reading Payload CMS content with caching support.
 */
export default class PayloadModuleService extends MedusaService({}) {
  protected _options: PayloadModuleOptions
  protected _baseUrl: string
  protected _headers: Record<string, string>
  protected _cacheService: CachingDependency | null
  protected _logger: Logger
  protected _contentCacheTtl: number
  protected _listCacheTtl: number
  protected _requestTimeoutMs: number
  private readonly buildQuery = buildQuery
  private readonly buildParamsQuery = buildParamsQuery

  constructor(container: InjectedDependencies, options: PayloadModuleOptions) {
    super(container, options)
    this._options = options
    this.validateOptions()
    this._baseUrl = `${options.serverUrl.replace(TRAILING_SLASH_REGEX, "")}/api`
    this._headers = {
      Authorization: `users API-Key ${options.apiKey}`,
      "Content-Type": "application/json",
    }
    this._logger = container.logger
    this._cacheService = safeResolve(
      container,
      Modules.CACHING,
      isCachingDependency,
    )

    this._contentCacheTtl = options.contentCacheTtl ?? DEFAULT_TTLS.CONTENT
    this._listCacheTtl = options.listCacheTtl ?? DEFAULT_TTLS.LIST
    this._requestTimeoutMs =
      options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS
  }

  /**
   * Validate required module options and throw on missing values.
   */
  private validateOptions(): void {
    if (!this._options.serverUrl) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Payload serverUrl is required",
      )
    }
    if (!this._options.apiKey) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Payload apiKey is required",
      )
    }
  }

  /**
   * Perform a JSON request against the Payload REST API.
   */
  private async makeRequest<T>(
    method: string,
    endpoint: string,
    data: unknown,
    options: {
      schema: z.ZodType<T>
      headers?: Record<string, string>
    },
  ): Promise<T> {
    const url = `${this._baseUrl}${endpoint}`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, this._requestTimeoutMs)
    const headers = { ...this._headers, ...options?.headers }

    let response: Response
    try {
      const request: RequestInit = {
        headers,
        method,
        signal: controller.signal,
      }
      if (data !== undefined) {
        request.body = JSON.stringify(data)
      }
      response = await fetch(url, request)
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Payload request timed out after ${this._requestTimeoutMs}ms: ${url}`,
        )
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }

    const result: unknown = await response.json()

    if (!response.ok) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        getPayloadErrorMessage(result, response.status),
      )
    }

    let validated: unknown
    try {
      validated = await zodValidator(options.schema, result)
    } catch (error) {
      if (error instanceof MedusaError) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Payload response validation failed for ${method} ${endpoint}: ${error.message}`,
        )
      }
      throw error
    }

    const isValidResult = isValidatedBy(options.schema)
    if (!isValidResult(validated)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Payload response validation failed for ${method} ${endpoint}: unexpected shape after validation`,
      )
    }

    return validated
  }

  /**
   * Fetch data with optional caching keyed by TTL and tags. `isCached` is a
   * type predicate used to safely narrow both cache reads and post-redaction
   * data without an unsafe type assertion.
   */
  private async getCached<T extends object | null>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number,
    tags: string[],
    isCached: (value: unknown) => value is T,
  ): Promise<T> {
    if (this._cacheService) {
      const cached: unknown = await this._cacheService.get({ key })
      if (cached !== null) {
        const redactedCached = redactValue(cached)
        if (isCached(redactedCached)) {
          return redactedCached
        }
      }
    }

    const data = await fetcher()
    const redactedData = redactValue(data)

    if (!isCached(redactedData)) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Payload: redacted value for cache key "${key}" no longer matches the expected shape`,
      )
    }

    if (this._cacheService && redactedData !== null) {
      await this._cacheService.set({
        data: redactedData,
        key,
        tags,
        ttl,
      })
    }

    return redactedData
  }

  /**
   * Fetch a published page by slug and optional locale.
   */
  async getPublishedPage(
    slug: string,
    locale?: string,
  ): Promise<CmsPageDTO | null> {
    const cacheKey = `${CMS}:${PAGES}:${slug}:${locale ?? DEFAULT_LOCALE}`
    return await this.getCached(
      cacheKey,
      async () => {
        const queryString = this.buildQuery({
          limit: 1,
          where: {
            slug: { equals: slug },
            status: { equals: STATUS_PUBLISHED },
          },
          ...(locale === undefined ? {} : { locale }),
        })
        const result = await this.makeRequest<PayloadBulkResult<CmsPageDTO>>(
          "GET",
          `/${PAGES}${queryString}`,
          undefined,
          {
            headers: {
              [RETURN_HTML_HEADER]: "true",
            },
            schema: CmsPagesBulkResultSchema,
          },
        )

        const page = result.docs[0] ?? null
        if (!page) {
          return null
        }

        return page
      },
      this._contentCacheTtl,
      [CACHE_TAGS.ALL, CACHE_TAGS.PAGES],
      isCachedPage,
    )
  }

  /**
   * List published public pages for search indexing.
   */
  async listPublishedPages(options?: {
    limit?: number
    locale?: string
    page?: number
  }): Promise<PayloadBulkResult<CmsPageDTO>> {
    const queryString = this.buildQuery({
      limit: options?.limit ?? 100,
      ...(options?.locale === undefined ? {} : { locale: options.locale }),
      page: options?.page ?? 1,
      where: {
        status: { equals: STATUS_PUBLISHED },
        visibility: { equals: "public" },
      },
    })

    const result = await this.makeRequest<PayloadBulkResult<CmsPageDTO>>(
      "GET",
      `/${PAGES}${queryString}`,
      undefined,
      {
        headers: {
          [RETURN_HTML_HEADER]: "true",
        },
        schema: CmsPagesBulkResultSchema,
      },
    )
    return result
  }

  /**
   * Fetch one published search document by id for a specific locale.
   */
  async getPublishedSearchDocument(
    collection: "articles" | "pages",
    id: string,
    locale: string,
  ): Promise<CmsArticleDTO | CmsPageDTO | null> {
    const where: Record<string, unknown> = {
      id: { equals: id },
      status: { equals: STATUS_PUBLISHED },
      ...(collection === PAGES ? { visibility: { equals: "public" } } : {}),
    }
    const queryString = this.buildQuery({ limit: 1, locale, where })

    if (collection === PAGES) {
      const result = await this.makeRequest<PayloadBulkResult<CmsPageDTO>>(
        "GET",
        `/${PAGES}${queryString}`,
        undefined,
        {
          headers: { [RETURN_HTML_HEADER]: "true" },
          schema: CmsPagesBulkResultSchema,
        },
      )
      return result.docs[0] ?? null
    }

    const result = await this.makeRequest<PayloadBulkResult<CmsArticleDTO>>(
      "GET",
      `/${ARTICLES}${queryString}`,
      undefined,
      {
        headers: { [RETURN_HTML_HEADER]: "true" },
        schema: CmsArticlesBulkResultSchema,
      },
    )
    return result.docs[0] ?? null
  }

  /**
   * List page categories and their pages, optionally filtered by locale/slug.
   */
  async listPageCategoriesWithPages(
    options?: CmsCategoryListOptions,
  ): Promise<CmsPageCategoryDTO[]> {
    const cacheKey = buildCategoryListCacheKey(
      CACHE_TAGS.PAGE_CATEGORIES,
      options,
    )
    const localeTag = buildLocaleTag(
      CACHE_TAGS.PAGE_CATEGORIES,
      options?.locale,
    )
    return await this.getCached(
      cacheKey,
      async () => {
        const queryString = this.buildParamsQuery({
          categorySlug: options?.categorySlug,
          locale: options?.locale,
        })
        const result = await this.makeRequest<{
          categories: CmsPageCategoryDTO[]
        }>("GET", `/${PAGE_CATEGORY_GROUPS}${queryString}`, undefined, {
          schema: PageCategoriesWithPagesSchema,
        })
        return result.categories ?? []
      },
      this._listCacheTtl,
      [CACHE_TAGS.ALL, CACHE_TAGS.PAGE_CATEGORIES, localeTag],
      isCachedPageCategoryList,
    )
  }

  /**
   * Fetch a published article by slug and optional locale.
   */
  async getPublishedArticle(
    slug: string,
    locale?: string,
  ): Promise<CmsArticleDTO | null> {
    const cacheKey = `${CMS}:${ARTICLES}:${slug}:${locale ?? DEFAULT_LOCALE}`
    return await this.getCached(
      cacheKey,
      async () => {
        const queryString = this.buildQuery({
          limit: 1,
          where: {
            slug: { equals: slug },
            status: { equals: STATUS_PUBLISHED },
          },
          ...(locale === undefined ? {} : { locale }),
        })
        const result = await this.makeRequest<PayloadBulkResult<CmsArticleDTO>>(
          "GET",
          `/${ARTICLES}${queryString}`,
          undefined,
          {
            headers: {
              [RETURN_HTML_HEADER]: "true",
            },
            schema: CmsArticlesBulkResultSchema,
          },
        )

        const post = result.docs[0] ?? null
        if (!post) {
          return null
        }
        return post
      },
      this._contentCacheTtl,
      [CACHE_TAGS.ALL, CACHE_TAGS.ARTICLES],
      isCachedArticle,
    )
  }

  /**
   * List published articles for search indexing.
   */
  async listPublishedArticles(options?: {
    limit?: number
    locale?: string
    page?: number
  }): Promise<PayloadBulkResult<CmsArticleDTO>> {
    const queryString = this.buildQuery({
      limit: options?.limit ?? 100,
      ...(options?.locale === undefined ? {} : { locale: options.locale }),
      page: options?.page ?? 1,
      where: {
        status: { equals: STATUS_PUBLISHED },
      },
    })

    const result = await this.makeRequest<PayloadBulkResult<CmsArticleDTO>>(
      "GET",
      `/${ARTICLES}${queryString}`,
      undefined,
      {
        headers: {
          [RETURN_HTML_HEADER]: "true",
        },
        schema: CmsArticlesBulkResultSchema,
      },
    )
    return result
  }

  /**
   * List article categories and their articles, optionally filtered by locale/slug.
   */
  async listArticleCategoriesWithArticles(
    options?: CmsCategoryListOptions,
  ): Promise<CmsArticleCategoryDTO[]> {
    const cacheKey = buildCategoryListCacheKey(
      CACHE_TAGS.ARTICLE_CATEGORIES,
      options,
    )
    const localeTag = buildLocaleTag(
      CACHE_TAGS.ARTICLE_CATEGORIES,
      options?.locale,
    )

    return await this.getCached(
      cacheKey,
      async () => {
        const queryString = this.buildParamsQuery({
          categorySlug: options?.categorySlug,
          locale: options?.locale,
        })
        const result = await this.makeRequest<{
          categories: CmsArticleCategoryDTO[]
        }>("GET", `/${ARTICLE_CATEGORY_GROUPS}${queryString}`, undefined, {
          schema: ArticleCategoriesWithArticlesSchema,
        })
        return result.categories ?? []
      },
      this._listCacheTtl,
      [CACHE_TAGS.ALL, CACHE_TAGS.ARTICLE_CATEGORIES, localeTag],
      isCachedArticleCategoryList,
    )
  }

  /**
   * List hero carousels with pagination/sort options and caching.
   */
  async listHeroCarousels(
    options?: CmsListOptions,
  ): Promise<CmsHeroCarouselDTO[]> {
    const cacheKey = buildListCacheKey(CACHE_TAGS.HERO_CAROUSELS, options)
    const localeTag = buildLocaleTag(CACHE_TAGS.HERO_CAROUSELS, options?.locale)
    return await this.getCached(
      cacheKey,
      async () => {
        const queryString = this.buildQuery({
          ...(options?.limit === undefined ? {} : { limit: options?.limit }),
          ...(options?.page === undefined ? {} : { page: options?.page }),
          ...(options?.sort === undefined ? {} : { sort: options?.sort }),
          ...(options?.locale === undefined ? {} : { locale: options?.locale }),
        })
        const result = await this.makeRequest<
          PayloadBulkResult<CmsHeroCarouselDTO>
        >("GET", `/${HERO_CAROUSELS}${queryString}`, undefined, {
          schema: CmsHeroCarouselsBulkResultSchema,
        })
        return result.docs
      },
      this._listCacheTtl,
      [CACHE_TAGS.ALL, CACHE_TAGS.HERO_CAROUSELS, localeTag],
      isCachedHeroCarouselList,
    )
  }

  /**
   * Invalidate cached CMS content for a collection and optional slug/locale.
   */
  async invalidateCache(
    collection: string,
    slug?: string,
    locale?: string,
  ): Promise<void> {
    if (!this._cacheService) {
      return
    }

    const normalizedLocale = normalizeLocale(locale)
    const clearAllLocales = normalizedLocale === undefined
    if (slug !== undefined && slug !== "" && !clearAllLocales) {
      const key = `${CMS}:${collection}:${slug}:${normalizedLocale ?? DEFAULT_LOCALE}`
      this._logger.info(`CMS: Clearing cache key ${key}`)
      await this._cacheService.clear({ key })
    }

    const tags: string[] = []
    const addTags = (allTags: string[], localeTag: string) => {
      if (clearAllLocales) {
        tags.push(...allTags)
      } else {
        tags.push(buildLocaleTag(localeTag, normalizedLocale))
      }
    }

    switch (collection) {
      case PAGES: {
        addTags(
          [CACHE_TAGS.PAGES, CACHE_TAGS.PAGE_CATEGORIES],
          CACHE_TAGS.PAGE_CATEGORIES,
        )
        break
      }
      case ARTICLES: {
        addTags(
          [CACHE_TAGS.ARTICLES, CACHE_TAGS.ARTICLE_CATEGORIES],
          CACHE_TAGS.ARTICLE_CATEGORIES,
        )
        break
      }
      case PAGE_CATEGORIES: {
        addTags([CACHE_TAGS.PAGE_CATEGORIES], CACHE_TAGS.PAGE_CATEGORIES)
        break
      }
      case ARTICLE_CATEGORIES: {
        addTags([CACHE_TAGS.ARTICLE_CATEGORIES], CACHE_TAGS.ARTICLE_CATEGORIES)
        break
      }
      case HERO_CAROUSELS: {
        addTags([CACHE_TAGS.HERO_CAROUSELS], CACHE_TAGS.HERO_CAROUSELS)
        break
      }
      case MEDIA: {
        tags.push(CACHE_TAGS.ALL)
        break
      }
      default: {
        break
      }
    }

    if (tags.length === 0) {
      this._logger.info(`CMS: No cache tags to clear for ${collection}`)
      return
    }
    this._logger.info(`CMS: Clearing cache tags ${tags.join(", ")}`)
    await this._cacheService.clear({ tags })
    this._logger.info(`CMS: Invalidated cache for ${collection}`)
  }
}
