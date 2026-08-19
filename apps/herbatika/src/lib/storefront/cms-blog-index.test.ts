import { describe, expect, it } from "vitest"
import { ALL_BLOG_CATEGORIES_KEY, blogQueryParsers } from "./blog-query-state"
import {
  resolveBlogListingApiHref,
  resolveBlogListingHref,
} from "./blog-routing"
import { buildCmsBlogPage } from "./cms-blog-index"

describe("buildCmsBlogPage", () => {
  const categories = [
    {
      id: 1,
      slug: "health",
      title: "Health",
      articles: [
        { slug: "first", title: "First" },
        { slug: "second", title: "Second" },
      ],
    },
    {
      id: 2,
      slug: "beauty",
      title: "Beauty",
      articles: [{ slug: "third", title: "Third" }],
    },
  ]

  it("filters by backend category and paginates the result", () => {
    const page = buildCmsBlogPage({
      categories,
      category: "health",
      page: 2,
      pageSize: 1,
    })

    expect(page.category).toBe("health")
    expect(page.page).toBe(2)
    expect(page.totalItems).toBe(2)
    expect(page.totalPages).toBe(2)
    expect(page.entries[0]?.summary.slug).toBe("second")
  })

  it("falls back to all articles for an unknown category", () => {
    const page = buildCmsBlogPage({
      categories,
      category: "missing",
      page: 1,
      pageSize: 12,
    })

    expect(page.category).toBe("all")
    expect(page.totalItems).toBe(3)
    expect(
      page.categoryFilters.map(({ key, count }) => ({ key, count }))
    ).toEqual([
      { key: "all", count: 3 },
      { key: "health", count: 2 },
      { key: "beauty", count: 1 },
    ])
  })

  it("includes an article in every category returned by the backend", () => {
    const sharedArticle = { slug: "shared", title: "Shared" }
    const page = buildCmsBlogPage({
      categories: [
        { id: 1, slug: "health", title: "Health", articles: [sharedArticle] },
        { id: 2, slug: "beauty", title: "Beauty", articles: [sharedArticle] },
      ],
      category: "beauty",
      page: 1,
      pageSize: 12,
    })

    expect(page.totalItems).toBe(1)
    expect(page.entries[0]?.summary.slug).toBe("shared")
    expect(page.entries[0]?.category.slug).toBe("beauty")
  })

  it("orders articles globally by publication date", () => {
    const page = buildCmsBlogPage({
      categories: [
        {
          id: 1,
          slug: "health",
          title: "Health",
          articles: [
            { publishedDate: "2026-08-01", slug: "older", title: "Older" },
          ],
        },
        {
          id: 2,
          slug: "beauty",
          title: "Beauty",
          articles: [
            { publishedDate: "2026-08-12", slug: "newer", title: "Newer" },
          ],
        },
      ],
      page: 1,
      pageSize: 12,
    })

    expect(page.entries.map(({ summary }) => summary.slug)).toEqual([
      "newer",
      "older",
    ])
  })
})

describe("resolveBlogListingHref", () => {
  it("omits default category and first page from the query", () => {
    expect(
      resolveBlogListingHref("sk", {
        category: ALL_BLOG_CATEGORIES_KEY,
        page: 1,
      })
    ).toBe("/poradna")
  })

  it("serializes category and page consistently", () => {
    expect(
      resolveBlogListingHref("hu", {
        category: "zdravie & krása",
        page: 2,
      })
    ).toBe("/tanacsok?category=zdravie+%26+krása&page=2")
  })

  it("builds the equivalent API URL for loading another page", () => {
    expect(
      resolveBlogListingApiHref({
        category: "zdravie & krása",
        page: 3,
      })
    ).toBe("/api/blog?category=zdravie+%26+krása&page=3")
  })
})

describe("blogQueryParsers", () => {
  it("normalizes category and accepts positive integer pages", () => {
    expect(blogQueryParsers.category.parseServerSide(" health ")).toBe("health")
    expect(blogQueryParsers.page.parseServerSide("4")).toBe(4)
  })

  it("falls back to the default query state for invalid input", () => {
    expect(blogQueryParsers.category.parseServerSide(" ")).toBe(
      ALL_BLOG_CATEGORIES_KEY
    )
    expect(blogQueryParsers.page.parseServerSide("-2")).toBe(1)
    expect(blogQueryParsers.page.parseServerSide("invalid")).toBe(1)
  })
})
