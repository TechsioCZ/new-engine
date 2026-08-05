import { describe, expect, it, vi } from "vitest"

vi.mock(import("payload"), () => ({
  headersWithCors: vi.fn(({ headers }: { headers: Headers }) => headers),
}))

import { articleCategoriesWithArticlesEndpoint } from "@/lib/endpoints/article-categories-with-articles"
import { pageCategoriesWithPagesEndpoint } from "@/lib/endpoints/page-categories-with-pages"

const createBaseReq = () => ({
  headers: new Headers(),
  payload: {
    config: {
      localization: { localeCodes: ["en"] },
    },
    find: vi.fn(),
  },
})

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

    const req = {
      ...createBaseReq(),
      url: "http://localhost?locale=en&categorySlug=news",
    } as any
    req.payload.find.mockResolvedValue({ docs })

    const response = await articleCategoriesWithArticlesEndpoint.handler(req)
    const body = await response.json()

    expect(req.payload.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "articles",
        locale: "en",
        req,
        where: expect.objectContaining({
          "category.slug": { equals: "news" },
          status: { equals: "published" },
        }),
      }),
    )

    expect(body.categories).toStrictEqual([
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

    const req = {
      ...createBaseReq(),
      url: "http://localhost?locale=en",
    } as any
    req.payload.find.mockResolvedValue({ docs })

    const response = await pageCategoriesWithPagesEndpoint.handler(req)
    const body = await response.json()

    expect(req.payload.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "pages",
        locale: "en",
        req,
        where: expect.objectContaining({
          status: { equals: "published" },
        }),
      }),
    )

    expect(body.categories).toStrictEqual([
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
