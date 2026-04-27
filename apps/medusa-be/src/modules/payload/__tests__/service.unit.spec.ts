import { Modules } from "@medusajs/framework/utils"
import { createHash } from "crypto"
import PayloadModuleService from "../service"
import type { PayloadModuleOptions } from "../types"

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}

const createCacheService = () => ({
  get: jest.fn(),
  set: jest.fn(),
  clear: jest.fn(),
})

type FetchResponseOverrides = { ok?: boolean; status?: number }

const createFetchResponse = (
  payload: unknown,
  overrides: FetchResponseOverrides = {}
) => ({
  ok: overrides.ok ?? true,
  status: overrides.status ?? 200,
  json: jest.fn().mockResolvedValue(payload),
})

/**
 * Create a valid Payload bulk response with all required pagination fields.
 */
const createBulkResponse = <T>(docs: T[], options?: { page?: number; limit?: number }) => ({
  docs,
  totalDocs: docs.length,
  limit: options?.limit ?? 10,
  page: options?.page ?? 1,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false,
  nextPage: null,
  prevPage: null,
  pagingCounter: 1,
})

const defaultOptions: PayloadModuleOptions = {
  serverUrl: "https://payload.example.com/",
  apiKey: "test-api-key",
}

const createServiceWithCache = (options?: Partial<PayloadModuleOptions>) => {
  const cacheService = createCacheService()
  const service = new PayloadModuleService(
    {
      logger: mockLogger,
      [Modules.CACHING]: cacheService,
    } as any,
    { ...defaultOptions, ...options }
  )

  return { service, cacheService }
}

const createServiceWithoutCache = (options?: Partial<PayloadModuleOptions>) =>
  new PayloadModuleService({ logger: mockLogger } as any, {
    ...defaultOptions,
    ...options,
  })

describe("PayloadModuleService", () => {
  const originalFetch = globalThis.fetch
  let fetchMock: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    fetchMock = jest.fn()
    globalThis.fetch = fetchMock as unknown as typeof fetch
  })

  afterAll(() => {
    globalThis.fetch = originalFetch
  })

  describe("constructor validation", () => {
    it("throws when serverUrl is missing", () => {
      expect(
        () =>
          new PayloadModuleService({ logger: mockLogger } as any, {
            serverUrl: "",
            apiKey: "test",
          })
      ).toThrow("Payload serverUrl is required")
    })

    it("throws when apiKey is missing", () => {
      expect(
        () =>
          new PayloadModuleService({ logger: mockLogger } as any, {
            serverUrl: "https://payload.example.com",
            apiKey: "",
          })
      ).toThrow("Payload apiKey is required")
    })

    it("handles cache resolution errors gracefully", () => {
      const container: Record<string, unknown> = { logger: mockLogger }
      Object.defineProperty(container, Modules.CACHING, {
        get() {
          throw new Error("boom")
        },
      })

      const service = new PayloadModuleService(container as any, {
        serverUrl: "https://payload.example.com",
        apiKey: "test-api-key",
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

      expect(result).toEqual(cachedPage)
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
      fetchMock.mockResolvedValue(createFetchResponse(createBulkResponse([page])))

      const result = await service.getPublishedPage("home", "en")

      expect(result).toEqual(page)
      expect(fetchMock).toHaveBeenCalledTimes(1)

      const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
      const parsedUrl = new URL(url)

      expect(parsedUrl.pathname).toBe("/api/pages")
      expect(parsedUrl.searchParams.get("where[slug][equals]")).toBe("home")
      expect(parsedUrl.searchParams.get("where[status][equals]")).toBe(
        "published"
      )
      expect(parsedUrl.searchParams.get("limit")).toBe("1")
      expect(parsedUrl.searchParams.get("locale")).toBe("en")

      expect(options?.method).toBe("GET")
      expect(options?.headers).toMatchObject({
        "Content-Type": "application/json",
        Authorization: "users API-Key test-api-key",
      })

      expect(cacheService.set).toHaveBeenCalledWith({
        key: "cms:pages:home:en",
        data: page,
        ttl: 123,
        tags: ["cms", "cms:pages"],
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
      fetchMock.mockResolvedValue(createFetchResponse(createBulkResponse([article])))

      const result = await service.getPublishedArticle("news", "en")

      expect(result).toEqual(article)
      expect(cacheService.set).toHaveBeenCalledWith(
        expect.objectContaining({
          key: "cms:articles:news:en",
          tags: ["cms", "cms:articles"],
        })
      )
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
      fetchMock.mockResolvedValue(createFetchResponse(createBulkResponse(carousels)))

      const options = {
        limit: 10,
        page: 2,
        sort: "-createdAt",
        locale: "en",
      }
      const result = await service.listHeroCarousels(options)

      expect(result).toEqual(carousels)

      const expectedHash = createHash("sha256")
        .update(JSON.stringify({ limit: 10, page: 2, sort: "-createdAt" }))
        .digest("hex")
      const expectedKey = `cms:hero-carousels:en:${expectedHash}`

      expect(cacheService.get).toHaveBeenCalledWith({ key: expectedKey })

      const [url] = fetchMock.mock.calls[0] as [string]
      const parsedUrl = new URL(url)
      expect(parsedUrl.pathname).toBe("/api/hero-carousels")
      expect(parsedUrl.searchParams.get("limit")).toBe("10")
      expect(parsedUrl.searchParams.get("page")).toBe("2")
      expect(parsedUrl.searchParams.get("sort")).toBe("-createdAt")
      expect(parsedUrl.searchParams.get("locale")).toBe("en")

      expect(cacheService.set).toHaveBeenCalledWith(
        expect.objectContaining({
          key: expectedKey,
          data: carousels,
          ttl: 456,
          tags: expect.arrayContaining([
            "cms",
            "cms:hero-carousels",
            "cms:hero-carousels:locale:en",
          ]),
        })
      )
    })

    it("throws when payload API returns an error", async () => {
      const { service, cacheService } = createServiceWithCache()

      cacheService.get.mockResolvedValue(null)
      fetchMock.mockResolvedValue(
        createFetchResponse({ message: "Payload unavailable" }, { ok: false })
      )

      await expect(service.listHeroCarousels()).rejects.toThrow(
        "Payload unavailable"
      )
    })

    it("uses default cache key when no options are provided", async () => {
      const { service, cacheService } = createServiceWithCache()
      const carousels = [{ id: 2, image: { url: "img" } }]

      cacheService.get.mockResolvedValue(null)
      fetchMock.mockResolvedValue(createFetchResponse(createBulkResponse(carousels)))

      const result = await service.listHeroCarousels()

      expect(result).toEqual(carousels)
      expect(cacheService.get).toHaveBeenCalledWith({
        key: "cms:hero-carousels:default:default",
      })
    })

    it("uses default hash when only locale is provided", async () => {
      const { service, cacheService } = createServiceWithCache()
      const carousels = [{ id: 3, image: { url: "img" } }]

      cacheService.get.mockResolvedValue(null)
      fetchMock.mockResolvedValue(createFetchResponse(createBulkResponse(carousels)))

      const result = await service.listHeroCarousels({ locale: "en" })

      expect(result).toEqual(carousels)
      expect(cacheService.get).toHaveBeenCalledWith({
        key: "cms:hero-carousels:en:default",
      })
    })

    it("hashes cache key when only page is provided", async () => {
      const { service, cacheService } = createServiceWithCache()
      const carousels = [{ id: 4, image: { url: "img" } }]

      cacheService.get.mockResolvedValue(null)
      fetchMock.mockResolvedValue(createFetchResponse(createBulkResponse(carousels)))

      const result = await service.listHeroCarousels({ page: 2, locale: "en" })

      expect(result).toEqual(carousels)

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
      fetchMock.mockResolvedValue(createFetchResponse(createBulkResponse(carousels)))

      const result = await service.listHeroCarousels({
        sort: "-createdAt",
        locale: "en",
      })

      expect(result).toEqual(carousels)

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
      fetchMock.mockResolvedValue(createFetchResponse(createBulkResponse(carousels)))

      const result = await service.listHeroCarousels({ limit: 5, locale: "en" })

      expect(result).toEqual(carousels)

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
        locale: "en",
        categorySlug: "news",
      })

      expect(result).toEqual([])
      expect(cacheService.get).toHaveBeenCalledWith({
        key: "cms:page-categories:en:news",
      })

      const [url] = fetchMock.mock.calls[0] as [string]
      const parsedUrl = new URL(url)
      expect(parsedUrl.pathname).toBe("/api/page-categories-with-pages")
      expect(parsedUrl.searchParams.get("locale")).toBe("en")
      expect(parsedUrl.searchParams.get("categorySlug")).toBe("news")

      expect(cacheService.set).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: expect.arrayContaining([
            "cms",
            "cms:page-categories",
            "cms:page-categories:locale:en",
          ]),
        })
      )
    })

    it("uses default category slug when not provided", async () => {
      const { service, cacheService } = createServiceWithCache()

      cacheService.get.mockResolvedValue(null)
      fetchMock.mockResolvedValue(createFetchResponse({ categories: [] }))

      const result = await service.listPageCategoriesWithPages({ locale: "en" })

      expect(result).toEqual([])
      expect(cacheService.get).toHaveBeenCalledWith({
        key: "cms:page-categories:en:all",
      })
    })

    it("uses default locale and slug when options are missing", async () => {
      const { service, cacheService } = createServiceWithCache()

      cacheService.get.mockResolvedValue(null)
      fetchMock.mockResolvedValue(createFetchResponse({ categories: [] }))

      const result = await service.listPageCategoriesWithPages()

      expect(result).toEqual([])
      expect(cacheService.get).toHaveBeenCalledWith({
        key: "cms:page-categories:default:all",
      })
    })
  })

  describe("private helpers", () => {
    it("returns empty string when buildQuery receives undefined", () => {
      const service = createServiceWithoutCache()
      const query = (service as unknown as { buildQuery: (o?: unknown) => string }).buildQuery(
        undefined
      )
      expect(query).toBe("")
    })

    it("returns empty string when buildParamsQuery receives undefined", () => {
      const service = createServiceWithoutCache()
      const query = (
        service as unknown as { buildParamsQuery: (o?: unknown) => string }
      ).buildParamsQuery(undefined)
      expect(query).toBe("")
    })
  })

  describe("listArticleCategoriesWithArticles", () => {
    it("builds query params and caches category results", async () => {
      const { service, cacheService } = createServiceWithCache()
      const categories = [
        {
          id: 1,
          title: "News",
          slug: "news",
          articles: [{ title: "Article 1", slug: "article-1" }],
        },
      ]

      cacheService.get.mockResolvedValue(null)
      fetchMock.mockResolvedValue(createFetchResponse({ categories }))

      const result = await service.listArticleCategoriesWithArticles({
        locale: "en",
        categorySlug: "news",
      })

      expect(result).toEqual(categories)
      expect(cacheService.get).toHaveBeenCalledWith({
        key: "cms:article-categories:en:news",
      })

      const [url] = fetchMock.mock.calls[0] as [string]
      const parsedUrl = new URL(url)
      expect(parsedUrl.pathname).toBe("/api/article-categories-with-articles")
      expect(parsedUrl.searchParams.get("locale")).toBe("en")
      expect(parsedUrl.searchParams.get("categorySlug")).toBe("news")

      expect(cacheService.set).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: expect.arrayContaining([
            "cms",
            "cms:article-categories",
            "cms:article-categories:locale:en",
          ]),
        })
      )
    })

    it("returns empty list when categories are empty", async () => {
      const { service, cacheService } = createServiceWithCache()

      cacheService.get.mockResolvedValue(null)
      fetchMock.mockResolvedValue(createFetchResponse({ categories: [] }))

      const result = await service.listArticleCategoriesWithArticles()

      expect(result).toEqual([])
    })

    it("returns empty list when no categories match filter", async () => {
      const { service, cacheService } = createServiceWithCache()

      cacheService.get.mockResolvedValue(null)
      fetchMock.mockResolvedValue(createFetchResponse({ categories: [] }))

      const result = await service.listArticleCategoriesWithArticles({
        locale: "en",
      })

      expect(result).toEqual([])
    })
  })

  describe("invalidateCache", () => {
    it("no-ops when caching is unavailable", async () => {
      const service = createServiceWithoutCache()

      await expect(
        service.invalidateCache("pages", "home", "en")
      ).resolves.toBeUndefined()
    })

    it("clears key and locale tag for pages", async () => {
      const { service, cacheService } = createServiceWithCache()

      cacheService.clear.mockResolvedValue(undefined)

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

      cacheService.clear.mockResolvedValue(undefined)

      await service.invalidateCache("hero-carousels")

      expect(cacheService.clear).toHaveBeenLastCalledWith({
        tags: ["cms:hero-carousels"],
      })
    })

    it("clears article cache key and article-category locale tag", async () => {
      const { service, cacheService } = createServiceWithCache()

      cacheService.clear.mockResolvedValue(undefined)

      await service.invalidateCache("articles", "hello-world", "cs")

      expect(cacheService.clear).toHaveBeenNthCalledWith(1, {
        key: "cms:articles:hello-world:cs",
      })
      expect(cacheService.clear).toHaveBeenNthCalledWith(2, {
        tags: ["cms:article-categories:locale:cs"],
      })
    })

    it("clears page category tags when locale is missing", async () => {
      const { service, cacheService } = createServiceWithCache()

      cacheService.clear.mockResolvedValue(undefined)

      await service.invalidateCache("page-categories")

      expect(cacheService.clear).toHaveBeenCalledWith({
        tags: ["cms:page-categories"],
      })
    })

    it("clears article-category locale tag when locale is provided", async () => {
      const { service, cacheService } = createServiceWithCache()

      cacheService.clear.mockResolvedValue(undefined)

      await service.invalidateCache("article-categories", undefined, "sk")

      expect(cacheService.clear).toHaveBeenCalledWith({
        tags: ["cms:article-categories:locale:sk"],
      })
    })

    it("handles unknown collections without tags", async () => {
      const { service, cacheService } = createServiceWithCache()

      cacheService.clear.mockResolvedValue(undefined)

      await service.invalidateCache("unknown-collection")

      expect(cacheService.clear).not.toHaveBeenCalled()
    })

    it("treats 'null' locale string as missing and clears all locales", async () => {
      const { service, cacheService } = createServiceWithCache()

      cacheService.clear.mockResolvedValue(undefined)

      await service.invalidateCache("pages", "home", "null")

      expect(cacheService.clear).toHaveBeenCalledWith({
        tags: ["cms:pages", "cms:page-categories"],
      })
    })
  })
})
