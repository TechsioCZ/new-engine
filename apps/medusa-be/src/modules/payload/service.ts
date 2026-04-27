import type {
  ICachingModuleService,
  Logger,
} from "@medusajs/framework/types"
import { zodValidator } from "@medusajs/framework"
import { MedusaError, MedusaService, Modules } from "@medusajs/framework/utils"
import { createHash } from "crypto"
import qs from "qs"
import type { ZodEffects, ZodObject } from "zod"
import type {
  PayloadModuleOptions,
  PayloadBulkResult,
  PayloadQueryOptions,
  CmsCategoryListOptions,
  CmsArticleCategoryDTO,
  CmsPageCategoryDTO,
  CmsListOptions,
  CmsHeroCarouselDTO,
  CmsPageDTO,
  CmsArticleDTO,
} from "./types"
import {
  ArticleCategoriesWithArticlesSchema,
  CmsArticlesBulkResultSchema,
  CmsHeroCarouselsBulkResultSchema,
  CmsPagesBulkResultSchema,
  PageCategoriesWithPagesSchema,
} from "./schemas"

const CMS = "cms"
const DEFAULT_LOCALE = "default"
const STATUS_PUBLISHED = "published"
const PAGES = "pages"
const ARTICLES = "articles"
const HERO_CAROUSELS = "hero-carousels"
const PAGE_CATEGORIES = "page-categories"
const ARTICLE_CATEGORIES = "article-categories"
const PAGE_CATEGORY_GROUPS = "page-categories-with-pages"
const ARTICLE_CATEGORY_GROUPS = "article-categories-with-articles"
const RETURN_HTML_HEADER = "X-Payload-Return-Html"

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
} as const

const DEFAULT_TTLS = {
  CONTENT: 3600,
  LIST: 600,
} as const
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000

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
    this.baseUrl_ = `${options.serverUrl.replace(/\/$/, "")}/api`
    this.headers_ = {
      "Content-Type": "application/json",
      Authorization: `users API-Key ${options.apiKey}`,
    }
    this.logger_ = container.logger
    this.cacheService_ = this.safeResolve<ICachingModuleService>(
      container,
      Modules.CACHING
    )

    this.contentCacheTtl_ =
      options.contentCacheTtl ?? DEFAULT_TTLS.CONTENT
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
   * Resolve a dependency from the container, returning null if unavailable.
   */
  private safeResolve<T>(
    container: InjectedDependencies,
    key: string
  ): T | null {
    try {
      return ((container as Record<string, unknown>)[key] as T) ?? null
    } catch {
      return null
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
      schema?: ZodObject<any, any> | ZodEffects<any, any>
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
    const query = qs.stringify(params, { encodeValuesOnly: true, skipNulls: true })
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
        return cached
      }
    }

    const data = await fetcher()

    if (this.cacheService_ && data !== null) {
      await this.cacheService_.set({ key, data: data as object, ttl, tags })
    }

    return data
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
      return undefined
    }
    return locale
  }
  
  /**
   * Fetch a published page by slug and optional locale.
   */
  async getPublishedPage(
    slug: string,
    locale?: string,
  ): Promise<CmsPageDTO | null> {
    const cacheKey = `${CMS}:${PAGES}:${slug}:${locale ?? DEFAULT_LOCALE}`
    return this.getCached(
      cacheKey,
      async () => {
        const queryString = this.buildQuery({
          where: {
            slug: { equals: slug },
            status: { equals: STATUS_PUBLISHED },
          },
          limit: 1,
          locale,
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
      [
        CACHE_TAGS.ALL,
        CACHE_TAGS.PAGE_CATEGORIES,
        localeTag,
      ]
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
    return this.getCached(
      cacheKey,
      async () => {
        const queryString = this.buildQuery({
          where: {
            slug: { equals: slug },
            status: { equals: STATUS_PUBLISHED },
          },
          limit: 1,
          locale,
        })
        const result = await this.makeRequest<PayloadBulkResult<CmsArticleDTO>>(
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

        const post = result.docs[0] || null
        if (!post) {
          return null
        }
        return post
      },
      this.contentCacheTtl_,
      [CACHE_TAGS.ALL, CACHE_TAGS.ARTICLES]
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
      [
        CACHE_TAGS.ALL,
        CACHE_TAGS.ARTICLE_CATEGORIES,
        localeTag,
      ]
    )
  }

  /**
   * List hero carousels with pagination/sort options and caching.
   */
  async listHeroCarousels(options?: CmsListOptions): Promise<CmsHeroCarouselDTO[]> {
    const cacheKey = this.buildListCacheKey(
      CACHE_TAGS.HERO_CAROUSELS,
      options
    )
    const localeTag = this.buildLocaleTag(
      CACHE_TAGS.HERO_CAROUSELS,
      options?.locale
    )
    return this.getCached(
      cacheKey,
      async () => {
        const queryString = this.buildQuery({
          limit: options?.limit,
          page: options?.page,
          sort: options?.sort,
          locale: options?.locale,
        })
        const result = await this.makeRequest<PayloadBulkResult<CmsHeroCarouselDTO>>(
          "GET",
          `/${HERO_CAROUSELS}${queryString}`,
          undefined,
          {
            schema: CmsHeroCarouselsBulkResultSchema,
          }
        )
        return result.docs
      },
      this.listCacheTtl_,
      [
        CACHE_TAGS.ALL,
        CACHE_TAGS.HERO_CAROUSELS,
        localeTag,
      ]
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
    if (!this.cacheService_) {
      return
    }

    const normalizedLocale = this.normalizeLocale(locale)
    const clearAllLocales = !normalizedLocale
    if (slug && !clearAllLocales) {
      const key = `${CMS}:${collection}:${slug}:${normalizedLocale ?? DEFAULT_LOCALE}`
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
