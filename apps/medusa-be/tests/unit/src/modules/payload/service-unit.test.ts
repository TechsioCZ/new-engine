import { createHash } from "node:crypto"

import { logger } from "@medusajs/framework"
import type { ICachingModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import type { Mocked } from "vitest"
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"

import PayloadModuleService from "../../../../../src/modules/payload/service"
import type { PayloadModuleOptions } from "../../../../../src/modules/payload/types"

type PayloadDependencies = ConstructorParameters<typeof PayloadModuleService>[0]
type PayloadCacheService = Pick<ICachingModuleService, "clear" | "get" | "set">

const createCacheService = (): Mocked<PayloadCacheService> => ({
  clear: vi.fn<PayloadCacheService["clear"]>(),
  get: vi.fn<PayloadCacheService["get"]>(),
  set: vi.fn<PayloadCacheService["set"]>(),
})

const createDependencies = (
  cacheService?: PayloadCacheService,
): PayloadDependencies => ({
  logger,
  ...(cacheService ? { [Modules.CACHING]: cacheService } : {}),
})

interface FetchResponseOverrides {
  ok?: boolean
  status?: number
}

const createFetchResponse = (
  payload: unknown,
  overrides: FetchResponseOverrides = {},
) =>
  Response.json(payload, {
    headers: { "Content-Type": "application/json" },
    status: overrides.status ?? (overrides.ok === false ? 500 : 200),
  })

/**
 * Create a valid Payload bulk response with all required pagination fields.
 */
const createBulkResponse = <T>(
  docs: T[],
  options?: { page?: number; limit?: number },
) => ({
  docs,
  hasNextPage: false,
  hasPrevPage: false,
  limit: options?.limit ?? 10,
  nextPage: null,
  page: options?.page ?? 1,
  pagingCounter: 1,
  prevPage: null,
  totalDocs: docs.length,
  totalPages: 1,
})

const defaultOptions: PayloadModuleOptions = {
  apiKey: "test-api-key",
  serverUrl: "https://payload.example.com/",
}

const createServiceWithCache = (options?: Partial<PayloadModuleOptions>) => {
  const cacheService = createCacheService()
  const service = new PayloadModuleService(createDependencies(cacheService), {
    ...defaultOptions,
    ...options,
  })

  return { cacheService, service }
}

const createServiceWithoutCache = (options?: Partial<PayloadModuleOptions>) =>
  new PayloadModuleService(createDependencies(), {
    ...defaultOptions,
    ...options,
  })

const isStringHelper = (
  candidate: unknown,
): candidate is (this: PayloadModuleService, value?: undefined) => unknown =>
  typeof candidate === "function"

const callPrivateStringHelper = (
  service: PayloadModuleService,
  methodName: "buildParamsQuery" | "buildQuery",
): string => {
  const helper: unknown = Reflect.get(service, methodName)
  if (!isStringHelper(helper)) {
    throw new TypeError(`${methodName} is not callable`)
  }

  const result = helper.call(service)
  if (typeof result !== "string") {
    throw new TypeError(`${methodName} did not return a string`)
  }

  return result
}

const getFetchCall = (
  fetchMock: ReturnType<typeof vi.fn<typeof fetch>>,
  index = 0,
): { input: string | URL | Request; options: RequestInit | undefined } => {
  const call = fetchMock.mock.calls[index]
  if (call === undefined) {
    throw new Error(`Expected fetch call at index ${index}`)
  }
  const [input, options] = call
  return { input, options }
}

const toUrl = (input: string | URL | Request): URL => {
  if (input instanceof Request) {
    return new URL(input.url)
  }
  return new URL(input)
}

describe(PayloadModuleService, () => {
  const originalFetch = globalThis.fetch
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>

  beforeEach(() => {
    vi.clearAllMocks()
    fetchMock = vi.fn<typeof fetch>()
    globalThis.fetch = fetchMock
  })

  afterAll(() => {
    globalThis.fetch = originalFetch
  })

  describe("constructor validation", () => {
    it("throws when serverUrl is missing", () => {
      expect(
        () =>
          new PayloadModuleService(createDependencies(), {
            apiKey: "test",
            serverUrl: "",
          }),
      ).toThrow("Payload serverUrl is required")
    })

    it("throws when apiKey is missing", () => {
      expect(
        () =>
          new PayloadModuleService(createDependencies(), {
            apiKey: "",
            serverUrl: "https://payload.example.com",
          }),
      ).toThrow("Payload apiKey is required")
    })

    it("handles cache resolution errors gracefully", () => {
      const container = createDependencies()
      Object.defineProperty(container, Modules.CACHING, {
        get() {
          throw new Error("boom")
        },
      })

      const service = new PayloadModuleService(container, {
        apiKey: "test-api-key",
        serverUrl: "https://payload.example.com",
      })

      expect(service).toBeInstanceOf(PayloadModuleService)
    })
  })

  describe("getPublishedPage", () => {
    it("returns cached page when available", async () => {
      const { service, cacheService } = createServiceWithCache()
      const cachedPage = { id: "page_1", slug: "home", title: "Home" }

      cacheService.get.mockResolvedValue(cachedPage)

      const result = await service.getPublishedPage("home", "en")

      expect(result).toStrictEqual(cachedPage)
      expect(cacheService.get).toHaveBeenCalledWith({
        key: "cms:pages:home:en",
      })
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it("fetches and caches when cache is empty", async () => {
      const { service, cacheService } = createServiceWithCache({
        contentCacheTtl: 123,
      })
      const page = { id: 1, slug: "home", title: "Home" }

      cacheService.get.mockResolvedValue(null)
      fetchMock.mockResolvedValue(
        createFetchResponse(createBulkResponse([page])),
      )

      const result = await service.getPublishedPage("home", "en")

      expect(result).toStrictEqual(page)
      expect(fetchMock).toHaveBeenCalledOnce()

      const { input, options } = getFetchCall(fetchMock)
      const parsedUrl = toUrl(input)

      expect({
        limit: parsedUrl.searchParams.get("limit"),
        locale: parsedUrl.searchParams.get("locale"),
        method: options?.method,
        pathname: parsedUrl.pathname,
        slug: parsedUrl.searchParams.get("where[slug][equals]"),
        status: parsedUrl.searchParams.get("where[status][equals]"),
      }).toStrictEqual({
        limit: "1",
        locale: "en",
        method: "GET",
        pathname: "/api/pages",
        slug: "home",
        status: "published",
      })
      expect(options?.headers).toMatchObject({
        Authorization: "users API-Key test-api-key",
        "Content-Type": "application/json",
      })

      expect(cacheService.set).toHaveBeenCalledWith({
        data: page,
        key: "cms:pages:home:en",
        tags: ["cms", "cms:pages"],
        ttl: 123,
      })
    })

    it("returns null when no published page exists", async () => {
      const { service, cacheService } = createServiceWithCache()

      cacheService.get.mockResolvedValue(null)
      fetchMock.mockResolvedValue(createFetchResponse(createBulkResponse([])))

      const result = await service.getPublishedPage("missing")

      expect(result).toBeNull()
      expect(cacheService.get).toHaveBeenCalledWith({
        key: "cms:pages:missing:default",
      })
      expect(cacheService.set).not.toHaveBeenCalled()
    })
  })

  describe("getPublishedArticle", () => {
    it("fetches article and caches result", async () => {
      const { service, cacheService } = createServiceWithCache()
      const article = { id: 1, slug: "news", title: "News" }

      cacheService.get.mockResolvedValue(null)
      fetchMock.mockResolvedValue(
        createFetchResponse(createBulkResponse([article])),
      )

      const result = await service.getPublishedArticle("news", "en")

      expect(result).toStrictEqual(article)
      expect(cacheService.set).toHaveBeenCalledWith(
        expect.objectContaining({
          key: "cms:articles:news:en",
          tags: ["cms", "cms:articles"],
        }),
      )
    })

    it("redacts private Payload auth fields from expanded relationships", async () => {
      const { service, cacheService } = createServiceWithCache()
      const article = {
        author: {
          apiKey: "secret-api-key",
          apiKeyIndex: "secret-index",
          email: "author@example.com",
          enableAPIKey: true,
          id: 1,
          sessions: [{ id: "session-id" }],
        },
        id: 1,
        slug: "news",
        title: "News",
      }

      cacheService.get.mockResolvedValue(null)
      fetchMock.mockResolvedValue(
        createFetchResponse(createBulkResponse([article])),
      )

      const result = await service.getPublishedArticle("news", "en")

      expect(result).toStrictEqual({
        author: {
          id: 1,
        },
        id: 1,
        slug: "news",
        title: "News",
      })
      expect(cacheService.set).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            author: {
              id: 1,
            },
            id: 1,
            slug: "news",
            title: "News",
          },
        }),
      )
    })

    it("redacts private Payload auth fields from cached values", async () => {
      const { service, cacheService } = createServiceWithCache()

      cacheService.get.mockResolvedValue({
        author: {
          apiKey: "secret-api-key",
          email: "author@example.com",
          id: 1,
          sessions: [{ id: "session-id" }],
        },
        id: 1,
        slug: "news",
        title: "News",
      })

      const result = await service.getPublishedArticle("news", "en")

      expect(result).toStrictEqual({
        author: {
          id: 1,
        },
        id: 1,
        slug: "news",
        title: "News",
      })
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it("returns null when article is missing", async () => {
      const { service, cacheService } = createServiceWithCache()

      cacheService.get.mockResolvedValue(null)
      fetchMock.mockResolvedValue(createFetchResponse(createBulkResponse([])))

      const result = await service.getPublishedArticle("missing")

      expect(result).toBeNull()
      expect(cacheService.set).not.toHaveBeenCalled()
    })
  })

  describe("listHeroCarousels", () => {
    it("builds cache key and caches results", async () => {
      const { service, cacheService } = createServiceWithCache({
        listCacheTtl: 456,
      })
      const carousels = [{ id: 1, image: { url: "img" } }]

      cacheService.get.mockResolvedValue(null)
      fetchMock.mockResolvedValue(
        createFetchResponse(createBulkResponse(carousels)),
      )

      const options = {
        limit: 10,
        locale: "en",
        page: 2,
        sort: "-createdAt",
      }
      const result = await service.listHeroCarousels(options)

      expect(result).toStrictEqual(carousels)

      const expectedHash = createHash("sha256")
        .update(JSON.stringify({ limit: 10, page: 2, sort: "-createdAt" }))
        .digest("hex")
      const expectedKey = `cms:hero-carousels:en:${expectedHash}`

      expect(cacheService.get).toHaveBeenCalledWith({ key: expectedKey })

      const { input } = getFetchCall(fetchMock)
      const parsedUrl = toUrl(input)
      expect({
        limit: parsedUrl.searchParams.get("limit"),
        locale: parsedUrl.searchParams.get("locale"),
        page: parsedUrl.searchParams.get("page"),
        pathname: parsedUrl.pathname,
        sort: parsedUrl.searchParams.get("sort"),
      }).toStrictEqual({
        limit: "10",
        locale: "en",
        page: "2",
        pathname: "/api/hero-carousels",
        sort: "-createdAt",
      })

      const cacheWrite = cacheService.set.mock.calls.at(0)?.[0]
      expect(cacheWrite).toMatchObject({
        data: carousels,
        key: expectedKey,
        tags: ["cms", "cms:hero-carousels", "cms:hero-carousels:locale:en"],
        ttl: 456,
      })
    })

    it("throws when payload API returns an error", async () => {
      const { service, cacheService } = createServiceWithCache()

      cacheService.get.mockResolvedValue(null)
      fetchMock.mockResolvedValue(
        createFetchResponse({ message: "Payload unavailable" }, { ok: false }),
      )

      await expect(service.listHeroCarousels()).rejects.toThrow(
        "Payload unavailable",
      )
    })

    it("uses default cache key when no options are provided", async () => {
      const { service, cacheService } = createServiceWithCache()
      const carousels = [{ id: 2, image: { url: "img" } }]

      cacheService.get.mockResolvedValue(null)
      fetchMock.mockResolvedValue(
        createFetchResponse(createBulkResponse(carousels)),
      )

      const result = await service.listHeroCarousels()

      expect(result).toStrictEqual(carousels)
      expect(cacheService.get).toHaveBeenCalledWith({
        key: "cms:hero-carousels:default:default",
      })
    })

    it("uses default hash when only locale is provided", async () => {
      const { service, cacheService } = createServiceWithCache()
      const carousels = [{ id: 3, image: { url: "img" } }]

      cacheService.get.mockResolvedValue(null)
      fetchMock.mockResolvedValue(
        createFetchResponse(createBulkResponse(carousels)),
      )

      const result = await service.listHeroCarousels({ locale: "en" })

      expect(result).toStrictEqual(carousels)
      expect(cacheService.get).toHaveBeenCalledWith({
        key: "cms:hero-carousels:en:default",
      })
    })

    it("hashes cache key when only page is provided", async () => {
      const { service, cacheService } = createServiceWithCache()
      const carousels = [{ id: 4, image: { url: "img" } }]

      cacheService.get.mockResolvedValue(null)
      fetchMock.mockResolvedValue(
        createFetchResponse(createBulkResponse(carousels)),
      )

      const result = await service.listHeroCarousels({ locale: "en", page: 2 })

      expect(result).toStrictEqual(carousels)

      const expectedHash = createHash("sha256")
        .update(JSON.stringify({ page: 2 }))
        .digest("hex")

      expect(cacheService.get).toHaveBeenCalledWith({
        key: `cms:hero-carousels:en:${expectedHash}`,
      })
    })

    it("hashes cache key when only sort is provided", async () => {
      const { service, cacheService } = createServiceWithCache()
      const carousels = [{ id: 5, image: { url: "img" } }]

      cacheService.get.mockResolvedValue(null)
      fetchMock.mockResolvedValue(
        createFetchResponse(createBulkResponse(carousels)),
      )

      const result = await service.listHeroCarousels({
        locale: "en",
        sort: "-createdAt",
      })

      expect(result).toStrictEqual(carousels)

      const expectedHash = createHash("sha256")
        .update(JSON.stringify({ sort: "-createdAt" }))
        .digest("hex")

      expect(cacheService.get).toHaveBeenCalledWith({
        key: `cms:hero-carousels:en:${expectedHash}`,
      })
    })

    it("hashes cache key when only limit is provided", async () => {
      const { service, cacheService } = createServiceWithCache()
      const carousels = [{ id: 6, image: { url: "img" } }]

      cacheService.get.mockResolvedValue(null)
      fetchMock.mockResolvedValue(
        createFetchResponse(createBulkResponse(carousels)),
      )

      const result = await service.listHeroCarousels({ limit: 5, locale: "en" })

      expect(result).toStrictEqual(carousels)

      const expectedHash = createHash("sha256")
        .update(JSON.stringify({ limit: 5 }))
        .digest("hex")

      expect(cacheService.get).toHaveBeenCalledWith({
        key: `cms:hero-carousels:en:${expectedHash}`,
      })
    })
  })

  describe("listPageCategoriesWithPages", () => {
    it("builds query params and returns empty list when missing", async () => {
      const { service, cacheService } = createServiceWithCache()

      cacheService.get.mockResolvedValue(null)
      fetchMock.mockResolvedValue(createFetchResponse({ categories: [] }))

      const result = await service.listPageCategoriesWithPages({
        categorySlug: "news",
        locale: "en",
      })

      expect(result).toStrictEqual([])
      expect(cacheService.get).toHaveBeenCalledWith({
        key: "cms:page-categories:en:news",
      })

      const { input } = getFetchCall(fetchMock)
      const parsedUrl = toUrl(input)
      expect({
        categorySlug: parsedUrl.searchParams.get("categorySlug"),
        locale: parsedUrl.searchParams.get("locale"),
        pathname: parsedUrl.pathname,
      }).toStrictEqual({
        categorySlug: "news",
        locale: "en",
        pathname: "/api/page-categories-with-pages",
      })

      const cacheWrite = cacheService.set.mock.calls.at(0)?.[0]
      expect(cacheWrite?.tags).toStrictEqual([
        "cms",
        "cms:page-categories",
        "cms:page-categories:locale:en",
      ])
    })

    it("uses default category slug when not provided", async () => {
      const { service, cacheService } = createServiceWithCache()

      cacheService.get.mockResolvedValue(null)
      fetchMock.mockResolvedValue(createFetchResponse({ categories: [] }))

      const result = await service.listPageCategoriesWithPages({ locale: "en" })

      expect(result).toStrictEqual([])
      expect(cacheService.get).toHaveBeenCalledWith({
        key: "cms:page-categories:en:all",
      })
    })

    it("uses default locale and slug when options are missing", async () => {
      const { service, cacheService } = createServiceWithCache()

      cacheService.get.mockResolvedValue(null)
      fetchMock.mockResolvedValue(createFetchResponse({ categories: [] }))

      const result = await service.listPageCategoriesWithPages()

      expect(result).toStrictEqual([])
      expect(cacheService.get).toHaveBeenCalledWith({
        key: "cms:page-categories:default:all",
      })
    })
  })

  describe("private helpers", () => {
    it("returns empty string when buildQuery receives undefined", () => {
      const service = createServiceWithoutCache()

      expect(callPrivateStringHelper(service, "buildQuery")).toBe("")
    })

    it("returns empty string when buildParamsQuery receives undefined", () => {
      const service = createServiceWithoutCache()

      expect(callPrivateStringHelper(service, "buildParamsQuery")).toBe("")
    })
  })

  describe("listArticleCategoriesWithArticles", () => {
    it("builds query params and caches category results", async () => {
      const { service, cacheService } = createServiceWithCache()
      const categories = [
        {
          articles: [{ slug: "article-1", title: "Article 1" }],
          id: 1,
          slug: "news",
          title: "News",
        },
      ]

      cacheService.get.mockResolvedValue(null)
      fetchMock.mockResolvedValue(createFetchResponse({ categories }))

      const result = await service.listArticleCategoriesWithArticles({
        categorySlug: "news",
        locale: "en",
      })

      expect(result).toStrictEqual(categories)
      expect(cacheService.get).toHaveBeenCalledWith({
        key: "cms:article-categories:en:news",
      })

      const { input } = getFetchCall(fetchMock)
      const parsedUrl = toUrl(input)
      expect({
        categorySlug: parsedUrl.searchParams.get("categorySlug"),
        locale: parsedUrl.searchParams.get("locale"),
        pathname: parsedUrl.pathname,
      }).toStrictEqual({
        categorySlug: "news",
        locale: "en",
        pathname: "/api/article-categories-with-articles",
      })

      const cacheWrite = cacheService.set.mock.calls.at(0)?.[0]
      expect(cacheWrite?.tags).toStrictEqual([
        "cms",
        "cms:article-categories",
        "cms:article-categories:locale:en",
      ])
    })

    it("returns empty list when categories are empty", async () => {
      const { service, cacheService } = createServiceWithCache()

      cacheService.get.mockResolvedValue(null)
      fetchMock.mockResolvedValue(createFetchResponse({ categories: [] }))

      const result = await service.listArticleCategoriesWithArticles()

      expect(result).toStrictEqual([])
    })

    it("returns empty list when no categories match filter", async () => {
      const { service, cacheService } = createServiceWithCache()

      cacheService.get.mockResolvedValue(null)
      fetchMock.mockResolvedValue(createFetchResponse({ categories: [] }))

      const result = await service.listArticleCategoriesWithArticles({
        locale: "en",
      })

      expect(result).toStrictEqual([])
    })
  })

  describe("invalidateCache", () => {
    it("no-ops when caching is unavailable", async () => {
      const service = createServiceWithoutCache()

      await expect(
        service.invalidateCache("pages", "home", "en"),
      ).resolves.toBeUndefined()
    })

    it("clears key and locale tag for pages", async () => {
      const { service, cacheService } = createServiceWithCache()

      cacheService.clear.mockResolvedValue()

      await service.invalidateCache("pages", "home", "en")

      expect(cacheService.clear).toHaveBeenNthCalledWith(1, {
        key: "cms:pages:home:en",
      })
      expect(cacheService.clear).toHaveBeenNthCalledWith(2, {
        tags: ["cms:page-categories:locale:en"],
      })
    })

    it("clears all locales when locale is not provided", async () => {
      const { service, cacheService } = createServiceWithCache()

      cacheService.clear.mockResolvedValue()

      await service.invalidateCache("hero-carousels")

      expect(cacheService.clear).toHaveBeenLastCalledWith({
        tags: ["cms:hero-carousels"],
      })
    })

    it("clears article cache key and article-category locale tag", async () => {
      const { service, cacheService } = createServiceWithCache()

      cacheService.clear.mockResolvedValue()

      await service.invalidateCache("articles", "hello-world", "cs")

      expect(cacheService.clear).toHaveBeenNthCalledWith(1, {
        key: "cms:articles:hello-world:cs",
      })
      expect(cacheService.clear).toHaveBeenNthCalledWith(2, {
        tags: ["cms:article-categories:locale:cs"],
      })
    })

    it("clears all CMS cache when media changes", async () => {
      const { service, cacheService } = createServiceWithCache()

      cacheService.clear.mockResolvedValue()

      await service.invalidateCache("media")

      expect(cacheService.clear).toHaveBeenCalledWith({
        tags: ["cms"],
      })
    })

    it("clears page category tags when locale is missing", async () => {
      const { service, cacheService } = createServiceWithCache()

      cacheService.clear.mockResolvedValue()

      await service.invalidateCache("page-categories")

      expect(cacheService.clear).toHaveBeenCalledWith({
        tags: ["cms:page-categories"],
      })
    })

    it("clears article-category locale tag when locale is provided", async () => {
      const { service, cacheService } = createServiceWithCache()

      cacheService.clear.mockResolvedValue()

      await service.invalidateCache("article-categories", undefined, "sk")

      expect(cacheService.clear).toHaveBeenCalledWith({
        tags: ["cms:article-categories:locale:sk"],
      })
    })

    it("handles unknown collections without tags", async () => {
      const { service, cacheService } = createServiceWithCache()

      cacheService.clear.mockResolvedValue()

      await service.invalidateCache("unknown-collection")

      expect(cacheService.clear).not.toHaveBeenCalled()
    })

    it("treats 'null' locale string as missing and clears all locales", async () => {
      const { service, cacheService } = createServiceWithCache()

      cacheService.clear.mockResolvedValue()

      await service.invalidateCache("pages", "home", "null")

      expect(cacheService.clear).toHaveBeenCalledWith({
        tags: ["cms:pages", "cms:page-categories"],
      })
    })
  })
})
