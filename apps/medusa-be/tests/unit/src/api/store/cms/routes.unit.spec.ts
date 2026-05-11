import { beforeEach, describe, expect, it, vi } from "vitest"
import { PAYLOAD_MODULE } from "../../../../../../src/modules/payload"

const mockCmsService = {
  getPublishedPage: vi.fn(),
  getPublishedArticle: vi.fn(),
  listPageCategoriesWithPages: vi.fn(),
  listArticleCategoriesWithArticles: vi.fn(),
  listHeroCarousels: vi.fn(),
}

vi.mock("../../../../../../src/modules/payload", () => ({
  PAYLOAD_MODULE: "payload",
}))

const createMockRequest = ({
  params = {},
  validatedQuery = {},
}: {
  params?: Record<string, string | undefined>
  validatedQuery?: Record<string, unknown>
} = {}) =>
  ({
    params,
    validatedQuery,
    locale: "request-locale-should-not-be-used",
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

  it("passes validated locale to published page lookup", async () => {
    const { GET } = await import(
      "../../../../../../src/api/store/cms/pages/[slug]/route"
    )
    const req = createMockRequest({
      params: { slug: "about-us" },
      validatedQuery: { locale: "cs" },
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

  it("passes validated locale to published article lookup", async () => {
    const { GET } = await import(
      "../../../../../../src/api/store/cms/articles/[slug]/route"
    )
    const req = createMockRequest({
      params: { slug: "news" },
      validatedQuery: { locale: "sk" },
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

  it("passes validated locale to page category listing", async () => {
    const { GET } = await import(
      "../../../../../../src/api/store/cms/page-categories/route"
    )
    const req = createMockRequest({
      validatedQuery: { categorySlug: "guides", locale: "cs" },
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

  it("passes validated locale to article category listing", async () => {
    const { GET } = await import(
      "../../../../../../src/api/store/cms/article-categories/route"
    )
    const req = createMockRequest({
      validatedQuery: { categorySlug: "journal", locale: "en" },
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

  it("passes validated locale to hero carousel listing", async () => {
    const { GET } = await import(
      "../../../../../../src/api/store/cms/hero-carousels/route"
    )
    const req = createMockRequest({
      validatedQuery: { limit: 5, locale: "cs", page: 2, sort: "-updatedAt" },
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
