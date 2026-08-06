import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { StoreCmsArticleCategoriesSchemaType } from "../../../../../../src/api/store/cms/article-categories/route"
import type { StoreCmsArticleSchemaType } from "../../../../../../src/api/store/cms/articles/[slug]/route"
import type { StoreCmsHeroCarouselsSchemaType } from "../../../../../../src/api/store/cms/hero-carousels/route"
import type { StoreCmsPageCategoriesSchemaType } from "../../../../../../src/api/store/cms/page-categories/route"
import type { StoreCmsPageSchemaType } from "../../../../../../src/api/store/cms/pages/[slug]/route"
import { PAYLOAD_MODULE } from "../../../../../../src/modules/payload"

const mockCmsService = {
  getPublishedArticle:
    vi.fn<(slug: string, locale?: string) => Promise<unknown>>(),
  getPublishedPage:
    vi.fn<(slug: string, locale?: string) => Promise<unknown>>(),
  listArticleCategoriesWithArticles:
    vi.fn<(options?: Record<string, unknown>) => Promise<unknown>>(),
  listHeroCarousels:
    vi.fn<(options?: Record<string, unknown>) => Promise<unknown>>(),
  listPageCategoriesWithPages:
    vi.fn<(options?: Record<string, unknown>) => Promise<unknown>>(),
}

vi.mock(import("../../../../../../src/modules/payload"), () => ({
  PAYLOAD_MODULE: "payload",
}))

/**
 * Asserts that a plain mock object contains the given keys before narrowing
 * it to a framework type. Building the mock as `unknown` first (instead of
 * the target type) avoids requiring every property of the huge Node
 * request/response interfaces while still validating the shape the route
 * handler actually reads from at runtime.
 */
const assertMockShape: <T>(
  candidate: unknown,
  requiredKeys: readonly (keyof T)[],
) => asserts candidate is T = (candidate, requiredKeys) => {
  if (typeof candidate !== "object" || candidate === null) {
    throw new TypeError("Expected a mock object")
  }

  for (const key of requiredKeys) {
    if (!(key in candidate)) {
      throw new TypeError(`Mock object missing required key: ${String(key)}`)
    }
  }
}

const REQUEST_KEYS = ["locale", "params", "scope", "validatedQuery"] as const

type MockMedusaResponse = MedusaResponse & {
  json: ReturnType<typeof vi.fn>
  status: ReturnType<typeof vi.fn>
}

const createMockRequest = <T>(
  {
    locale,
    params = {},
    validatedQuery = {},
  }: {
    locale?: string
    params?: Record<string, string | undefined>
    validatedQuery?: Record<string, unknown>
  },
  requiredKeys: readonly (keyof T)[],
): T => {
  const candidate: unknown = {
    locale,
    params,
    scope: {
      resolve: vi.fn<(key: string) => unknown>((key) => {
        if (key === PAYLOAD_MODULE) {
          return mockCmsService
        }
        return null
      }),
    },
    validatedQuery,
  }

  assertMockShape<T>(candidate, requiredKeys)
  return candidate
}

const createMockResponse = (): MockMedusaResponse => {
  const candidate: unknown = {
    json: vi.fn<(body?: unknown) => unknown>().mockReturnThis(),
    status: vi.fn<(code?: number) => unknown>().mockReturnThis(),
  }

  assertMockShape<MockMedusaResponse>(candidate, ["json", "status"])
  return candidate
}

describe("Store CMS routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("passes request locale to published page lookup", async () => {
    const { GET } =
      await import("../../../../../../src/api/store/cms/pages/[slug]/route")
    const req = createMockRequest<
      MedusaRequest<unknown, StoreCmsPageSchemaType>
    >(
      {
        locale: "cs",
        params: { slug: "about-us" },
        validatedQuery: {},
      },
      REQUEST_KEYS,
    )
    const res = createMockResponse()
    const page = { id: "page_1", slug: "about-us" }

    mockCmsService.getPublishedPage.mockResolvedValue(page)

    await GET(req, res)

    expect(mockCmsService.getPublishedPage).toHaveBeenCalledWith(
      "about-us",
      "cs",
    )
    expect(res.json).toHaveBeenCalledWith({ page })
  })

  it("passes request locale to published article lookup", async () => {
    const { GET } =
      await import("../../../../../../src/api/store/cms/articles/[slug]/route")
    const req = createMockRequest<
      MedusaRequest<unknown, StoreCmsArticleSchemaType>
    >(
      {
        locale: "sk",
        params: { slug: "news" },
        validatedQuery: {},
      },
      REQUEST_KEYS,
    )
    const res = createMockResponse()
    const article = { id: "article_1", slug: "news" }

    mockCmsService.getPublishedArticle.mockResolvedValue(article)

    await GET(req, res)

    expect(mockCmsService.getPublishedArticle).toHaveBeenCalledWith(
      "news",
      "sk",
    )
    expect(res.json).toHaveBeenCalledWith({ article })
  })

  it("passes request locale to page category listing", async () => {
    const { GET } =
      await import("../../../../../../src/api/store/cms/page-categories/route")
    const req = createMockRequest<
      MedusaRequest<unknown, StoreCmsPageCategoriesSchemaType>
    >(
      {
        locale: "cs",
        validatedQuery: { categorySlug: "guides" },
      },
      REQUEST_KEYS,
    )
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
    const { GET } =
      await import("../../../../../../src/api/store/cms/article-categories/route")
    const req = createMockRequest<
      MedusaRequest<unknown, StoreCmsArticleCategoriesSchemaType>
    >(
      {
        locale: "en",
        validatedQuery: { categorySlug: "journal" },
      },
      REQUEST_KEYS,
    )
    const res = createMockResponse()
    const articleCategories = [{ id: "article-category_1", slug: "journal" }]

    mockCmsService.listArticleCategoriesWithArticles.mockResolvedValue(
      articleCategories,
    )

    await GET(req, res)

    expect(
      mockCmsService.listArticleCategoriesWithArticles,
    ).toHaveBeenCalledWith({
      categorySlug: "journal",
      locale: "en",
    })
    expect(res.json).toHaveBeenCalledWith({ articleCategories })
  })

  it("passes request locale to hero carousel listing", async () => {
    const { GET } =
      await import("../../../../../../src/api/store/cms/hero-carousels/route")
    const req = createMockRequest<
      MedusaRequest<unknown, StoreCmsHeroCarouselsSchemaType>
    >(
      {
        locale: "cs",
        validatedQuery: { limit: 5, page: 2, sort: "-updatedAt" },
      },
      REQUEST_KEYS,
    )
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
