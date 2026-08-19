import { beforeEach, describe, expect, it, vi } from "vitest"
import { PAYLOAD_MODULE } from "../../../../../../src/modules/payload"

const mockCmsService = {
  getFooterNavigation: vi.fn(),
  getPublishedPage: vi.fn(),
  getPublishedPageById: vi.fn(),
  getPublishedArticle: vi.fn(),
  getPublishedArticleById: vi.fn(),
  listPageCategoriesWithPages: vi.fn(),
  listArticleCategoriesWithArticles: vi.fn(),
  listHeroCarousels: vi.fn(),
}

vi.mock("../../../../../../src/modules/payload", () => ({
  PAYLOAD_MODULE: "payload",
}))

const createMockRequest = ({
  locale,
  params = {},
  validatedQuery = {},
}: {
  locale?: string
  params?: Record<string, string | undefined>
  validatedQuery?: Record<string, unknown>
} = {}) =>
  ({
    params,
    validatedQuery: { ...(locale ? { locale } : {}), ...validatedQuery },
    locale,
    scope: {
      resolve: vi.fn((key: string) => {
        if (key === PAYLOAD_MODULE) {
          return mockCmsService
        }
        return
      }),
    },
  }) as any

const createMockResponse = () =>
  ({
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  }) as any

describe("Store CMS routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("requires one of the four exact storefront CMS locales", async () => {
    const { StoreCmsPageByIdSchema } = await import(
      "../../../../../../src/api/store/cms/pages/by-id/[id]/route"
    )

    expect(StoreCmsPageByIdSchema.safeParse({ locale: "sk" }).success).toBe(
      true
    )
    expect(StoreCmsPageByIdSchema.safeParse({ locale: "en" }).success).toBe(
      false
    )
    expect(StoreCmsPageByIdSchema.safeParse({}).success).toBe(false)
  })

  it("passes request locale to published page lookup", async () => {
    const { GET } = await import(
      "../../../../../../src/api/store/cms/pages/[slug]/route"
    )
    const req = createMockRequest({
      locale: "cs",
      params: { slug: "about-us" },
      validatedQuery: {},
    })
    const res = createMockResponse()
    const page = { id: "page_1", slug: "about-us" }

    mockCmsService.getPublishedPage.mockResolvedValue(page)

    await GET(req, res)

    expect(mockCmsService.getPublishedPage).toHaveBeenCalledWith(
      "about-us",
      "cs"
    )
    expect(res.json).toHaveBeenCalledWith({ page })
  })

  it("passes request locale to footer navigation lookup", async () => {
    const { GET } = await import(
      "../../../../../../src/api/store/cms/navigation/footer/route"
    )
    const req = createMockRequest({ locale: "ro" })
    const res = createMockResponse()
    const footerNavigation = { columns: [] }

    mockCmsService.getFooterNavigation.mockResolvedValue(footerNavigation)

    await GET(req, res)

    expect(mockCmsService.getFooterNavigation).toHaveBeenCalledWith("ro")
    expect(res.json).toHaveBeenCalledWith({ footerNavigation })
  })

  it("passes request locale to published article lookup", async () => {
    const { GET } = await import(
      "../../../../../../src/api/store/cms/articles/[slug]/route"
    )
    const req = createMockRequest({
      locale: "sk",
      params: { slug: "news" },
      validatedQuery: {},
    })
    const res = createMockResponse()
    const article = { id: "article_1", slug: "news" }

    mockCmsService.getPublishedArticle.mockResolvedValue(article)

    await GET(req, res)

    expect(mockCmsService.getPublishedArticle).toHaveBeenCalledWith(
      "news",
      "sk"
    )
    expect(res.json).toHaveBeenCalledWith({ article })
  })

  it("reads a published page by stable Payload ID and exact locale", async () => {
    const { GET } = await import(
      "../../../../../../src/api/store/cms/pages/by-id/[id]/route"
    )
    const req = createMockRequest({ locale: "ro", params: { id: "77" } })
    const res = createMockResponse()
    const page = { id: 77, slug: "legacy-slug" }
    mockCmsService.getPublishedPageById.mockResolvedValue(page)

    await GET(req, res)

    expect(mockCmsService.getPublishedPageById).toHaveBeenCalledWith("77", "ro")
    expect(res.json).toHaveBeenCalledWith({ page })
  })

  it("reads a published article by stable Payload ID and exact locale", async () => {
    const { GET } = await import(
      "../../../../../../src/api/store/cms/articles/by-id/[id]/route"
    )
    const req = createMockRequest({ locale: "hu", params: { id: "88" } })
    const res = createMockResponse()
    const article = { id: 88, slug: "legacy-slug" }
    mockCmsService.getPublishedArticleById.mockResolvedValue(article)

    await GET(req, res)

    expect(mockCmsService.getPublishedArticleById).toHaveBeenCalledWith(
      "88",
      "hu"
    )
    expect(res.json).toHaveBeenCalledWith({ article })
  })

  it("maps upstream CMS failures to an explicit 503", async () => {
    const { GET } = await import(
      "../../../../../../src/api/store/cms/pages/by-id/[id]/route"
    )
    const req = createMockRequest({ locale: "sk", params: { id: "77" } })
    const res = createMockResponse()
    mockCmsService.getPublishedPageById.mockRejectedValue(
      new Error("Payload unavailable")
    )

    await GET(req, res)

    expect(res.status).toHaveBeenCalledWith(503)
    expect(res.json).toHaveBeenCalledWith({
      message: "CMS source is unavailable",
    })
  })

  it("passes request locale to page category listing", async () => {
    const { GET } = await import(
      "../../../../../../src/api/store/cms/page-categories/route"
    )
    const req = createMockRequest({
      locale: "cs",
      validatedQuery: { categorySlug: "guides" },
    })
    const res = createMockResponse()
    const pageCategories = [{ id: "page-category_1", slug: "guides" }]

    mockCmsService.listPageCategoriesWithPages.mockResolvedValue(pageCategories)

    await GET(req, res)

    expect(mockCmsService.listPageCategoriesWithPages).toHaveBeenCalledWith({
      categorySlug: "guides",
      locale: "cs",
    })
    expect(res.json).toHaveBeenCalledWith({ pageCategories })
  })

  it("passes request locale to article category listing", async () => {
    const { GET } = await import(
      "../../../../../../src/api/store/cms/article-categories/route"
    )
    const req = createMockRequest({
      locale: "en",
      validatedQuery: { categorySlug: "journal" },
    })
    const res = createMockResponse()
    const articleCategories = [{ id: "article-category_1", slug: "journal" }]

    mockCmsService.listArticleCategoriesWithArticles.mockResolvedValue(
      articleCategories
    )

    await GET(req, res)

    expect(
      mockCmsService.listArticleCategoriesWithArticles
    ).toHaveBeenCalledWith({
      categorySlug: "journal",
      locale: "en",
    })
    expect(res.json).toHaveBeenCalledWith({ articleCategories })
  })

  it("passes request locale to hero carousel listing", async () => {
    const { GET } = await import(
      "../../../../../../src/api/store/cms/hero-carousels/route"
    )
    const req = createMockRequest({
      locale: "cs",
      validatedQuery: { limit: 5, page: 2, sort: "-updatedAt" },
    })
    const res = createMockResponse()
    const heroCarousels = [{ id: "hero-carousel_1" }]

    mockCmsService.listHeroCarousels.mockResolvedValue(heroCarousels)

    await GET(req, res)

    expect(mockCmsService.listHeroCarousels).toHaveBeenCalledWith({
      limit: 5,
      locale: "cs",
      page: 2,
      sort: "-updatedAt",
    })
    expect(res.json).toHaveBeenCalledWith({ heroCarousels })
  })
})
