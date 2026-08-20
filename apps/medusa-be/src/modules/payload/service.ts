import { createHash } from "node:crypto"
import { zodValidator } from "@medusajs/framework"
import type { ICachingModuleService, Logger } from "@medusajs/framework/types"
import { MedusaError, MedusaService, Modules } from "@medusajs/framework/utils"
import type { z } from "@medusajs/framework/zod"
import qs from "qs"
import { safeResolve } from "../../utils/safe-resolve"
import { toCmsStoreArticle } from "./article-store-dto"
import { toCmsStoreFooterNavigation } from "./footer-navigation-store-dto"
import {
  ArticleCategoriesWithArticlesSchema,
  CmsArticlesBulkResultSchema,
  CmsFooterNavigationGlobalSchema,
  CmsHeroCarouselsBulkResultSchema,
  CmsPagesBulkResultSchema,
  PageCategoriesWithPagesSchema,
} from "./schemas"
import type {
  CmsArticleCategoryDTO,
  CmsArticleDTO,
  CmsCategoryListOptions,
  CmsFooterNavigationGlobalDTO,
  CmsHeroCarouselDTO,
  CmsListOptions,
  CmsPageCategoryDTO,
  CmsPageDTO,
  CmsStoreArticleDTO,
  CmsStoreFooterNavigationDTO,
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
const ARTICLE_AUTHORS = "article-authors"
const PAGE_CATEGORY_GROUPS = "page-categories-with-pages"
const ARTICLE_CATEGORY_GROUPS = "article-categories-with-articles"
const FOOTER_NAVIGATION = "footer-navigation"
const RETURN_HTML_HEADER = "X-Payload-Return-Html"
const TRAILING_SLASH_REGEX = /\/$/
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

type InjectedDependencies = {
  logger: Logger
  [Modules.CACHING]?: ICachingModuleService
  [key: string]: unknown
}

const CACHE_TAGS = {
  ALL: CMS,
  PAGES: `${CMS}:${PAGES}`,
  ARTICLES: `${CMS}:${ARTICLES}`,
  PAGE_CATEGORIES: `${CMS}:${PAGE_CATEGORIES}`,
  ARTICLE_CATEGORIES: `${CMS}:${ARTICLE_CATEGORIES}`,
  HERO_CAROUSELS: `${CMS}:${HERO_CAROUSELS}`,
  FOOTER_NAVIGATION: `${CMS}:${FOOTER_NAVIGATION}`,
} as const

const DEFAULT_TTLS = {
  CONTENT: 3600,
  LIST: 600,
} as const
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000
const ARTICLE_STORE_CACHE_VERSION = "v6"
const RO_HERO_CAROUSEL_CACHE_VERSION = "exact-locale-v1"
const ARTICLE_STORE_SELECT = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  content: true,
  contentHTML: true,
  featuredImage: true,
  sidebar: true,
  category: true,
  categories: true,
  primaryCategory: true,
  articleAuthor: true,
  meta: true,
  publishedDate: true,
  readingTime: true,
  tags: true,
  relatedArticles: true,
} as const
const RELATED_ARTICLE_POPULATE = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  featuredImage: true,
  primaryCategory: true,
  status: true,
  publishedDate: true,
  readingTime: true,
} as const

/**
 * Medusa module service for reading Payload CMS content with caching support.
 */
export default class PayloadModuleService extends MedusaService({}) {
  protected options_: PayloadModuleOptions
  protected baseUrl_: string
  protected headers_: Record<string, string>
  protected cacheService_: ICachingModuleService | null
  protected logger_: Logger
  protected contentCacheTtl_: number
  protected listCacheTtl_: number
  protected requestTimeoutMs_: number

  constructor(container: InjectedDependencies, options: PayloadModuleOptions) {
    super(container, options)
    this.options_ = options
    this.validateOptions()
    this.baseUrl_ = `${options.serverUrl.replace(TRAILING_SLASH_REGEX, "")}/api`
    this.headers_ = {
      "Content-Type": "application/json",
      Authorization: `users API-Key ${options.apiKey}`,
    }
    this.logger_ = container.logger
    this.cacheService_ = safeResolve<ICachingModuleService>(
      container,
      Modules.CACHING
    )

    this.contentCacheTtl_ = options.contentCacheTtl ?? DEFAULT_TTLS.CONTENT
    this.listCacheTtl_ = options.listCacheTtl ?? DEFAULT_TTLS.LIST
    this.requestTimeoutMs_ =
      options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS
  }

  /**
   * Validate required module options and throw on missing values.
   */
  private validateOptions(): void {
    if (!this.options_.serverUrl) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Payload serverUrl is required"
      )
    }
    if (!this.options_.apiKey) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Payload apiKey is required"
      )
    }
  }

  /**
   * Perform a JSON request against the Payload REST API.
   */
  private async makeRequest<T>(
    method: string,
    endpoint: string,
    data?: unknown,
    options?: {
      schema?: z.ZodType
      headers?: Record<string, string>
    }
  ): Promise<T> {
    const url = `${this.baseUrl_}${endpoint}`
    const controller = new AbortController()
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.requestTimeoutMs_
    )
    const headers = { ...this.headers_, ...(options?.headers ?? {}) }

    let response: Response
    try {
      response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal,
      })
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Payload request timed out after ${this.requestTimeoutMs_}ms: ${url}`
        )
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }

    const result = (await response.json()) as unknown

    if (!response.ok) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        this.getPayloadErrorMessage(result, response.status)
      )
    }

    if (options?.schema) {
      try {
        return (await zodValidator(options.schema, result)) as T
      } catch (error) {
        if (error instanceof MedusaError) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Payload response validation failed for ${method} ${endpoint}: ${error.message}`
          )
        }
        throw error
      }
    }

    return result as T
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null
  }

  /**
   * Payload relationship fields can include expanded auth users. Strip private
   * auth fields before responses are cached or returned by public Store APIs.
   */
  private redactPrivatePayloadFields<T>(value: T): T {
    if (Array.isArray(value)) {
      return value.map((entry) => this.redactPrivatePayloadFields(entry)) as T
    }

    if (!this.isRecord(value) || value instanceof Date) {
      return value
    }

    const shouldRedactEmail = Object.keys(value).some((key) =>
      PRIVATE_PAYLOAD_FIELD_NAMES.has(key)
    )

    return Object.fromEntries(
      Object.entries(value)
        .filter(
          ([key]) =>
            !(
              PRIVATE_PAYLOAD_FIELD_NAMES.has(key) ||
              (shouldRedactEmail && key === "email")
            )
        )
        .map(([key, entryValue]) => [
          key,
          this.redactPrivatePayloadFields(entryValue),
        ])
    ) as T
  }

  private getPayloadErrorMessage(result: unknown, status: number): string {
    if (this.isRecord(result) && typeof result.message === "string") {
      return result.message
    }
    return `Payload API error: ${status}`
  }

  /**
   * Build a query string from Payload list/query options.
   */
  private buildQuery(options?: PayloadQueryOptions): string {
    if (!options) {
      return ""
    }
    return `?${qs.stringify(options, { encodeValuesOnly: true })}`
  }

  /**
   * Build a query string from raw params while skipping null/undefined values.
   */
  private buildParamsQuery(params?: Record<string, unknown>): string {
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
   * Fetch data with optional caching keyed by TTL and tags.
   */
  private async getCached<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number,
    tags: string[]
  ): Promise<T> {
    if (this.cacheService_) {
      const cached = (await this.cacheService_.get({ key })) as T | null
      if (cached !== null) {
        return this.redactPrivatePayloadFields(cached)
      }
    }

    const data = await fetcher()
    const redactedData = this.redactPrivatePayloadFields(data)

    if (this.cacheService_ && redactedData !== null) {
      await this.cacheService_.set({
        key,
        data: redactedData as object,
        ttl,
        tags,
      })
    }

    return redactedData
  }

  /**
   * Create a cache key for list queries using locale and pagination options.
   */
  private buildListCacheKey(prefix: string, options?: CmsListOptions): string {
    const locale = options?.locale ?? DEFAULT_LOCALE

    if (!options) {
      return `${prefix}:${locale}:default`
    }

    const { locale: _ignoredLocale, ...rest } = options
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
  private buildCategoryListCacheKey(
    prefix: string,
    options?: CmsCategoryListOptions
  ): string {
    const locale = options?.locale ?? DEFAULT_LOCALE
    const slug = options?.categorySlug ?? "all"
    return `${prefix}:${locale}:${slug}`
  }

  /**
   * Build a locale-specific cache tag.
   */
  private buildLocaleTag(tag: string, locale?: string): string {
    return `${tag}:locale:${locale ?? DEFAULT_LOCALE}`
  }

  /**
   * Normalize locale query values that might be stringified null/undefined.
   */
  private normalizeLocale(locale?: string): string | undefined {
    if (!locale || locale === "null" || locale === "undefined") {
      return
    }
    return locale
  }

  private buildArticleStorePopulate(): Record<string, Record<string, boolean>> {
    return {
      articles: RELATED_ARTICLE_POPULATE,
      media: {
        id: true,
        alt: true,
        url: true,
        filename: true,
        width: true,
        height: true,
      },
      "article-categories": {
        id: true,
        title: true,
        slug: true,
      },
      [ARTICLE_AUTHORS]: {
        id: true,
        displayName: true,
        role: true,
        bio: true,
        portrait: true,
      },
    }
  }

  private buildArticleCacheKey(slug: string, locale: string) {
    return `${CMS}:${ARTICLES}:${ARTICLE_STORE_CACHE_VERSION}:${slug}:${locale}`
  }

  /**
   * Fetch a published page by slug and optional locale.
   */
  async getPublishedPage(
    slug: string,
    locale: string
  ): Promise<CmsPageDTO | null> {
    const cacheKey = `${CMS}:${PAGES}:${slug}:${locale}`
    return this.getCached(
      cacheKey,
      async () => {
        const queryString = this.buildQuery({
          where: {
            and: [
              { slug: { equals: slug } },
              { title: { exists: true } },
              { status: { equals: STATUS_PUBLISHED } },
              { visibility: { equals: "public" } },
            ],
          },
          limit: 1,
          locale,
          "fallback-locale": "false",
        })
        const result = await this.makeRequest<PayloadBulkResult<CmsPageDTO>>(
          "GET",
          `/${PAGES}${queryString}`,
          undefined,
          {
            schema: CmsPagesBulkResultSchema,
            headers: {
              [RETURN_HTML_HEADER]: "true",
            },
          }
        )

        const page = result.docs[0] || null
        if (!page) {
          return null
        }

        return page
      },
      this.contentCacheTtl_,
      [CACHE_TAGS.ALL, CACHE_TAGS.PAGES]
    )
  }

  /** Fetch a published page by stable Payload document ID and locale. */
  async getPublishedPageById(
    id: string,
    locale: string
  ): Promise<CmsPageDTO | null> {
    const cacheKey = `${CMS}:${PAGES}:id:${id}:${locale}`
    return this.getCached(
      cacheKey,
      async () => {
        const queryString = this.buildQuery({
          where: {
            and: [
              { id: { equals: id } },
              { title: { exists: true } },
              { status: { equals: STATUS_PUBLISHED } },
              { visibility: { equals: "public" } },
            ],
          },
          limit: 1,
          locale,
          "fallback-locale": "false",
        })
        const result = await this.makeRequest<PayloadBulkResult<CmsPageDTO>>(
          "GET",
          `/${PAGES}${queryString}`,
          undefined,
          {
            schema: CmsPagesBulkResultSchema,
            headers: { [RETURN_HTML_HEADER]: "true" },
          }
        )
        return result.docs[0] || null
      },
      this.contentCacheTtl_,
      [CACHE_TAGS.ALL, CACHE_TAGS.PAGES]
    )
  }

  /**
   * List published public pages for search indexing.
   */
  async listPublishedPages(options: {
    limit?: number
    locale: string
    page?: number
  }): Promise<PayloadBulkResult<CmsPageDTO>> {
    const queryString = this.buildQuery({
      where: {
        and: [
          { title: { exists: true } },
          { status: { equals: STATUS_PUBLISHED } },
          { visibility: { equals: "public" } },
        ],
      },
      limit: options.limit ?? 100,
      page: options.page ?? 1,
      locale: options.locale,
      "fallback-locale": "false",
    })

    return this.makeRequest<PayloadBulkResult<CmsPageDTO>>(
      "GET",
      `/${PAGES}${queryString}`,
      undefined,
      {
        schema: CmsPagesBulkResultSchema,
        headers: {
          [RETURN_HTML_HEADER]: "true",
        },
      }
    )
  }

  /**
   * List page categories and their pages, optionally filtered by locale/slug.
   */
  async listPageCategoriesWithPages(
    options?: CmsCategoryListOptions
  ): Promise<CmsPageCategoryDTO[]> {
    const cacheKey = this.buildCategoryListCacheKey(
      CACHE_TAGS.PAGE_CATEGORIES,
      options
    )
    const localeTag = this.buildLocaleTag(
      CACHE_TAGS.PAGE_CATEGORIES,
      options?.locale
    )
    return this.getCached(
      cacheKey,
      async () => {
        const queryString = this.buildParamsQuery({
          locale: options?.locale,
          categorySlug: options?.categorySlug,
        })
        const result = await this.makeRequest<{
          categories: CmsPageCategoryDTO[]
        }>("GET", `/${PAGE_CATEGORY_GROUPS}${queryString}`, undefined, {
          schema: PageCategoriesWithPagesSchema,
        })
        return result.categories ?? []
      },
      this.listCacheTtl_,
      [CACHE_TAGS.ALL, CACHE_TAGS.PAGE_CATEGORIES, localeTag]
    )
  }

  /**
   * Fetch a published article by slug and optional locale.
   */
  async getPublishedArticle(
    slug: string,
    locale: string
  ): Promise<CmsStoreArticleDTO | null> {
    const cacheKey = this.buildArticleCacheKey(slug, locale)
    return this.getCached<CmsStoreArticleDTO | null>(
      cacheKey,
      async () => {
        const queryString = this.buildQuery({
          where: {
            and: [
              { slug: { equals: slug } },
              { title: { exists: true } },
              { status: { equals: STATUS_PUBLISHED } },
            ],
          },
          limit: 1,
          locale,
          "fallback-locale": "false",
          depth: 2,
          select: ARTICLE_STORE_SELECT,
          populate: this.buildArticleStorePopulate(),
        })
        const result = await this.makeRequest<PayloadBulkResult<CmsArticleDTO>>(
          "GET",
          `/${ARTICLES}${queryString}`,
          undefined,
          {
            schema: CmsArticlesBulkResultSchema,
          }
        )

        const post = result.docs[0]
        return post ? toCmsStoreArticle(post) : null
      },
      this.contentCacheTtl_,
      [CACHE_TAGS.ALL, CACHE_TAGS.ARTICLES]
    )
  }

  /** Fetch a published article by stable Payload document ID and locale. */
  async getPublishedArticleById(
    id: string,
    locale: string
  ): Promise<CmsStoreArticleDTO | null> {
    const cacheKey = `${CMS}:${ARTICLES}:id:${id}:${locale}`
    return this.getCached(
      cacheKey,
      async () => {
        const queryString = this.buildQuery({
          where: {
            and: [
              { id: { equals: id } },
              { title: { exists: true } },
              { status: { equals: STATUS_PUBLISHED } },
            ],
          },
          limit: 1,
          locale,
          "fallback-locale": "false",
          depth: 2,
          select: ARTICLE_STORE_SELECT,
          populate: this.buildArticleStorePopulate(),
        })
        const result = await this.makeRequest<PayloadBulkResult<CmsArticleDTO>>(
          "GET",
          `/${ARTICLES}${queryString}`,
          undefined,
          { schema: CmsArticlesBulkResultSchema }
        )
        const article = result.docs[0]
        return article ? toCmsStoreArticle(article) : null
      },
      this.contentCacheTtl_,
      [CACHE_TAGS.ALL, CACHE_TAGS.ARTICLES]
    )
  }

  /**
   * List published articles for search indexing.
   */
  async listPublishedArticles(options: {
    limit?: number
    locale: string
    page?: number
  }): Promise<PayloadBulkResult<CmsArticleDTO>> {
    const queryString = this.buildQuery({
      where: {
        and: [
          { slug: { exists: true } },
          { title: { exists: true } },
          { status: { equals: STATUS_PUBLISHED } },
        ],
      },
      limit: options.limit ?? 100,
      page: options.page ?? 1,
      locale: options.locale,
      "fallback-locale": "false",
    })

    return this.makeRequest<PayloadBulkResult<CmsArticleDTO>>(
      "GET",
      `/${ARTICLES}${queryString}`,
      undefined,
      {
        schema: CmsArticlesBulkResultSchema,
        headers: {
          [RETURN_HTML_HEADER]: "true",
        },
      }
    )
  }

  /**
   * List article categories and their articles, optionally filtered by locale/slug.
   */
  async listArticleCategoriesWithArticles(
    options?: CmsCategoryListOptions
  ): Promise<CmsArticleCategoryDTO[]> {
    const cacheKey = this.buildCategoryListCacheKey(
      CACHE_TAGS.ARTICLE_CATEGORIES,
      options
    )
    const localeTag = this.buildLocaleTag(
      CACHE_TAGS.ARTICLE_CATEGORIES,
      options?.locale
    )

    return this.getCached(
      cacheKey,
      async () => {
        const queryString = this.buildParamsQuery({
          locale: options?.locale,
          "fallback-locale": "false",
          categorySlug: options?.categorySlug,
        })
        const result = await this.makeRequest<{
          categories: CmsArticleCategoryDTO[]
        }>("GET", `/${ARTICLE_CATEGORY_GROUPS}${queryString}`, undefined, {
          schema: ArticleCategoriesWithArticlesSchema,
        })
        return result.categories ?? []
      },
      this.listCacheTtl_,
      [CACHE_TAGS.ALL, CACHE_TAGS.ARTICLE_CATEGORIES, localeTag]
    )
  }

  /**
   * List hero carousels with pagination/sort options and caching.
   */
  async listHeroCarousels(
    options?: CmsListOptions
  ): Promise<CmsHeroCarouselDTO[]> {
    const locale = this.normalizeLocale(options?.locale)
    const baseCacheKey = this.buildListCacheKey(
      CACHE_TAGS.HERO_CAROUSELS,
      options
    )
    const cacheKey =
      locale === "ro"
        ? `${baseCacheKey}:${RO_HERO_CAROUSEL_CACHE_VERSION}`
        : baseCacheKey
    const localeTag = this.buildLocaleTag(CACHE_TAGS.HERO_CAROUSELS, locale)
    const carousels = await this.getCached(
      cacheKey,
      async () => {
        const queryString = this.buildQuery({
          ...(locale === "ro"
            ? {
                where: {
                  and: [
                    { heading: { exists: true } },
                    { subheading: { exists: true } },
                  ],
                },
              }
            : {}),
          limit: options?.limit,
          page: options?.page,
          sort: options?.sort,
          locale,
          ...(locale ? { "fallback-locale": "false" as const } : {}),
        })
        const result = await this.makeRequest<
          PayloadBulkResult<CmsHeroCarouselDTO>
        >("GET", `/${HERO_CAROUSELS}${queryString}`, undefined, {
          schema: CmsHeroCarouselsBulkResultSchema,
        })
        return result.docs
      },
      this.listCacheTtl_,
      [CACHE_TAGS.ALL, CACHE_TAGS.HERO_CAROUSELS, localeTag]
    )

    if (locale !== "ro") {
      return carousels
    }

    return carousels.filter(({ heading, subheading }) =>
      [heading, subheading].every(
        (value) => typeof value === "string" && value.trim().length > 0
      )
    )
  }

  /** Fetch the localized footer navigation configured in Payload. */
  async getFooterNavigation(
    locale?: string
  ): Promise<CmsStoreFooterNavigationDTO> {
    const normalizedLocale = this.normalizeLocale(locale)
    const cacheKey = `${CACHE_TAGS.FOOTER_NAVIGATION}:${normalizedLocale ?? DEFAULT_LOCALE}`
    const footerLocaleTag = this.buildLocaleTag(
      CACHE_TAGS.FOOTER_NAVIGATION,
      normalizedLocale
    )

    return this.getCached(
      cacheKey,
      async () => {
        const queryString = this.buildQuery({
          locale: normalizedLocale,
          "fallback-locale": "none",
          depth: 1,
          select: { columns: true },
          populate: {
            pages: {
              id: true,
              slug: true,
              title: true,
              status: true,
              visibility: true,
            },
          },
        })
        const result = await this.makeRequest<CmsFooterNavigationGlobalDTO>(
          "GET",
          `/globals/${FOOTER_NAVIGATION}${queryString}`,
          undefined,
          { schema: CmsFooterNavigationGlobalSchema }
        )

        return toCmsStoreFooterNavigation(result, normalizedLocale)
      },
      this.listCacheTtl_,
      [
        CACHE_TAGS.ALL,
        CACHE_TAGS.FOOTER_NAVIGATION,
        CACHE_TAGS.PAGES,
        footerLocaleTag,
      ]
    )
  }

  /**
   * Invalidate cached CMS content for a collection and optional slug/locale.
   */
  async invalidateCache(
    collection: string,
    slug?: string,
    locale?: string
  ): Promise<void> {
    if (!this.cacheService_) {
      return
    }

    const normalizedLocale = this.normalizeLocale(locale)
    const clearAllLocales = !normalizedLocale
    if (slug && !clearAllLocales) {
      const key =
        collection === ARTICLES
          ? this.buildArticleCacheKey(slug, normalizedLocale)
          : `${CMS}:${collection}:${slug}:${normalizedLocale ?? DEFAULT_LOCALE}`
      this.logger_.info(`CMS: Clearing cache key ${key}`)
      await this.cacheService_.clear({ key })
    }

    const tags: string[] = []
    const addTags = (allTags: string[], localeTag: string) => {
      if (clearAllLocales) {
        tags.push(...allTags)
      } else {
        tags.push(this.buildLocaleTag(localeTag, normalizedLocale))
      }
    }

    switch (collection) {
      case PAGES:
        tags.push(CACHE_TAGS.FOOTER_NAVIGATION)
        addTags(
          [CACHE_TAGS.PAGES, CACHE_TAGS.PAGE_CATEGORIES],
          CACHE_TAGS.PAGE_CATEGORIES
        )
        break
      case ARTICLES:
        addTags(
          [CACHE_TAGS.ARTICLES, CACHE_TAGS.ARTICLE_CATEGORIES],
          CACHE_TAGS.ARTICLE_CATEGORIES
        )
        break
      case PAGE_CATEGORIES:
        addTags([CACHE_TAGS.PAGE_CATEGORIES], CACHE_TAGS.PAGE_CATEGORIES)
        break
      case ARTICLE_CATEGORIES:
        addTags([CACHE_TAGS.ARTICLE_CATEGORIES], CACHE_TAGS.ARTICLE_CATEGORIES)
        break
      case HERO_CAROUSELS:
        addTags([CACHE_TAGS.HERO_CAROUSELS], CACHE_TAGS.HERO_CAROUSELS)
        break
      case FOOTER_NAVIGATION:
        addTags([CACHE_TAGS.FOOTER_NAVIGATION], CACHE_TAGS.FOOTER_NAVIGATION)
        break
      case MEDIA:
        tags.push(CACHE_TAGS.ALL)
        break
      default:
        break
    }

    if (tags.length === 0) {
      this.logger_.info(`CMS: No cache tags to clear for ${collection}`)
      return
    }
    this.logger_.info(`CMS: Clearing cache tags ${tags.join(", ")}`)
    await this.cacheService_.clear({ tags })
    this.logger_.info(`CMS: Invalidated cache for ${collection}`)
  }
}
