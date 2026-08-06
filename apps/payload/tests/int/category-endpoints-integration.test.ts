import { isRecord } from "@techsio/std/object"
import type { headersWithCors, PayloadRequest } from "payload"
import type { Mock } from "vitest"
import { describe, expect, it, vi } from "vitest"

import { articleCategoriesWithArticlesEndpoint } from "@/lib/endpoints/article-categories-with-articles"
import { pageCategoriesWithPagesEndpoint } from "@/lib/endpoints/page-categories-with-pages"

vi.mock(import("payload"), () => ({
  headersWithCors: vi.fn<typeof headersWithCors>(
    ({ headers }: { headers: Headers }) => headers,
  ),
}))

type FindMock = Mock<
  (options: Record<string, unknown>) => Promise<{ docs: unknown[] }>
>

type TestPayloadRequest = PayloadRequest & {
  payload: PayloadRequest["payload"] & {
    find: FindMock
  }
}

const createFindMock = (): FindMock =>
  vi.fn<(options: Record<string, unknown>) => Promise<{ docs: unknown[] }>>()

const isTestPayloadRequest = (value: unknown): value is TestPayloadRequest => {
  if (!isRecord(value)) {
    return false
  }

  const { headers, payload } = value
  if (!(headers instanceof Headers) || !isRecord(payload)) {
    return false
  }

  const { find } = payload
  return vi.isMockFunction(find)
}

const createRequest = (url: string): TestPayloadRequest => {
  const request: unknown = {
    headers: new Headers(),
    payload: {
      config: {
        localization: { localeCodes: ["en"] },
      },
      find: createFindMock(),
    },
    url,
  }

  if (!isTestPayloadRequest(request)) {
    throw new TypeError("Failed to create a valid Payload test request.")
  }

  return request
}

const readJsonBody = async (
  response: Response,
): Promise<Record<string, unknown>> => {
  const value: unknown = await response.json()
  if (!isRecord(value)) {
    throw new TypeError("Expected a JSON object response body")
  }
  return value
}

describe("category endpoints", () => {
  it("groups articles by category and applies filters", async () => {
    const docs = [
      {
        category: { id: 1, slug: "news", title: "News" },
        excerpt: "Intro",
        featuredImage: { url: "/img-1.png" },
        slug: "article-1",
        title: "Article 1",
      },
      {
        category: { id: 1, slug: "news", title: "News" },
        excerpt: null,
        featuredImage: null,
        slug: "article-2",
        title: "Article 2",
      },
      {
        category: { id: 2, slug: "updates", title: "Updates" },
        excerpt: "Other",
        featuredImage: { url: "/img-3.png" },
        slug: "article-3",
        title: "Article 3",
      },
      {
        category: null,
        slug: "no-category",
        title: "No Category",
      },
    ]

    const req = createRequest("http://localhost?locale=en&categorySlug=news")
    req.payload.find.mockResolvedValue({ docs })

    const response = await articleCategoriesWithArticlesEndpoint.handler(req)
    const body = await readJsonBody(response)
    const { categories } = body

    expect(req.payload.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "articles",
        locale: "en",
        req,
        where: expect.objectContaining({
          "category.slug": { equals: "news" },
          status: { equals: "published" },
        }) as unknown,
      }),
    )

    expect(categories).toStrictEqual([
      {
        articles: [
          {
            excerpt: "Intro",
            featuredImage: "/img-1.png",
            slug: "article-1",
            title: "Article 1",
          },
          {
            excerpt: null,
            featuredImage: null,
            slug: "article-2",
            title: "Article 2",
          },
        ],
        id: 1,
        slug: "news",
        title: "News",
      },
      {
        articles: [
          {
            excerpt: "Other",
            featuredImage: "/img-3.png",
            slug: "article-3",
            title: "Article 3",
          },
        ],
        id: 2,
        slug: "updates",
        title: "Updates",
      },
    ])
  })

  it("groups pages by category", async () => {
    const docs = [
      {
        category: { id: 10, slug: "docs", title: "Docs" },
        slug: "page-1",
        title: "Page 1",
      },
      {
        category: { id: 10, slug: "docs", title: "Docs" },
        slug: "page-2",
        title: "Page 2",
      },
      {
        category: { id: 11, slug: "guides", title: "Guides" },
        slug: "page-3",
        title: "Page 3",
      },
    ]

    const req = createRequest("http://localhost?locale=en")
    req.payload.find.mockResolvedValue({ docs })

    const response = await pageCategoriesWithPagesEndpoint.handler(req)
    const body = await readJsonBody(response)
    const { categories } = body

    expect(req.payload.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "pages",
        locale: "en",
        req,
        where: expect.objectContaining({
          status: { equals: "published" },
        }) as unknown,
      }),
    )

    expect(categories).toStrictEqual([
      {
        id: 10,
        pages: [
          { slug: "page-1", title: "Page 1" },
          { slug: "page-2", title: "Page 2" },
        ],
        slug: "docs",
        title: "Docs",
      },
      {
        id: 11,
        pages: [{ slug: "page-3", title: "Page 3" }],
        slug: "guides",
        title: "Guides",
      },
    ])
  })
})
