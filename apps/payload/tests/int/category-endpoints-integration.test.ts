import { getRecordValue, isRecord } from "@techsio/std/object"
import type { headersWithCors } from "payload"
import { describe, expect, it, vi } from "vitest"

import { articleCategoriesWithArticlesEndpoint } from "@/lib/endpoints/article-categories-with-articles"
import { pageCategoriesWithPagesEndpoint } from "@/lib/endpoints/page-categories-with-pages"

vi.mock(import("payload"), () => ({
  headersWithCors: vi.fn<typeof headersWithCors>(
    ({ headers }: { headers: Headers }) => headers,
  ),
}))

const createFindMock = () => vi.fn<(options: unknown) => Promise<unknown>>()

const createRequest = (url: string) => ({
  headers: new Headers(),
  payload: {
    config: {
      localization: { localeCodes: ["en"] },
    },
    find: createFindMock(),
  },
  url,
})

const getLastFindOptions = (req: ReturnType<typeof createRequest>): object => {
  const call = req.payload.find.mock.lastCall
  if (call === undefined) {
    throw new Error("Expected Payload find to have been called")
  }

  const [options] = call
  if (!isRecord(options)) {
    throw new TypeError("Expected Payload find options")
  }
  return options
}

const getWhere = (options: object): object => {
  const where = getRecordValue(options, "where")
  if (!isRecord(where)) {
    throw new TypeError("Expected Payload find where filter")
  }
  return where
}

const invokeEndpoint = async (
  handler: CallableFunction,
  req: ReturnType<typeof createRequest>,
): Promise<Response> => {
  const result: unknown = Reflect.apply(handler, undefined, [req])
  const response = await Promise.resolve(result)
  if (!(response instanceof Response)) {
    throw new TypeError("Expected endpoint handler to return a response")
  }
  return response
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

    const response = await invokeEndpoint(
      articleCategoriesWithArticlesEndpoint.handler,
      req,
    )
    const body: unknown = await response.json()

    const findOptions = getLastFindOptions(req)
    const where = getWhere(findOptions)
    expect({
      categorySlug: getRecordValue(where, "category.slug"),
      collection: getRecordValue(findOptions, "collection"),
      locale: getRecordValue(findOptions, "locale"),
      req: getRecordValue(findOptions, "req"),
      status: getRecordValue(where, "status"),
    }).toStrictEqual({
      categorySlug: { equals: "news" },
      collection: "articles",
      locale: "en",
      req,
      status: { equals: "published" },
    })

    expect(body).toStrictEqual({
      categories: [
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
      ],
    })
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

    const response = await invokeEndpoint(
      pageCategoriesWithPagesEndpoint.handler,
      req,
    )
    const body: unknown = await response.json()

    const findOptions = getLastFindOptions(req)
    const where = getWhere(findOptions)
    expect({
      collection: getRecordValue(findOptions, "collection"),
      locale: getRecordValue(findOptions, "locale"),
      req: getRecordValue(findOptions, "req"),
      status: getRecordValue(where, "status"),
    }).toStrictEqual({
      collection: "pages",
      locale: "en",
      req,
      status: { equals: "published" },
    })

    expect(body).toStrictEqual({
      categories: [
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
      ],
    })
  })
})
