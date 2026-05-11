const mockCmsService = {
  getPublishedPage: jest.fn(),
  getPublishedArticle: jest.fn(),
  listPageCategoriesWithPages: jest.fn(),
  listArticleCategoriesWithArticles: jest.fn(),
  listHeroCarousels: jest.fn(),
}

jest.mock("../../../../modules/payload", () => ({
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
    validatedQuery,
    locale,
    scope: {
      resolve: jest.fn((key: string) => {
        if (key === "payload") {
          return mockCmsService
        }
        return
      }),
    },
  }) as any

const createMockResponse = () =>
  ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  }) as any

describe("Store CMS routes", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("passes request locale to published page lookup", async () => {
    const { GET } = await import("../pages/[slug]/route")
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

  it("passes request locale to published article lookup", async () => {
    const { GET } = await import("../articles/[slug]/route")
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

  it("passes request locale to page category listing", async () => {
    const { GET } = await import("../page-categories/route")
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
    const { GET } = await import("../article-categories/route")
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
    const { GET } = await import("../hero-carousels/route")
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
