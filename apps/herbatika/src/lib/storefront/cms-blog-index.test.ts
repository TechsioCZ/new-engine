import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { buildCmsBlogPage } from "./cms-blog-index"
import {
  ALL_BLOG_CATEGORIES_KEY,
  resolveBlogListingApiHref,
  resolveBlogListingHref,
} from "./blog-routing"
import { blogQueryParsers } from "./blog-query-state"

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

    assert.equal(page.category, "health")
    assert.equal(page.page, 2)
    assert.equal(page.totalItems, 2)
    assert.equal(page.totalPages, 2)
    assert.equal(page.entries[0]?.summary.slug, "second")
  })

  it("falls back to all articles for an unknown category", () => {
    const page = buildCmsBlogPage({
      categories,
      category: "missing",
      page: 1,
      pageSize: 12,
    })

    assert.equal(page.category, "all")
    assert.equal(page.totalItems, 3)
    assert.deepEqual(
      page.categoryFilters.map(({ key, count }) => ({ key, count })),
      [
        { key: "all", count: 3 },
        { key: "health", count: 2 },
        { key: "beauty", count: 1 },
      ]
    )
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

    assert.equal(page.totalItems, 1)
    assert.equal(page.entries[0]?.summary.slug, "shared")
    assert.equal(page.entries[0]?.category.slug, "beauty")
  })
})

describe("resolveBlogListingHref", () => {
  it("omits default category and first page from the query", () => {
    assert.equal(
      resolveBlogListingHref({
        category: ALL_BLOG_CATEGORIES_KEY,
        page: 1,
      }),
      "/blog"
    )
  })

  it("serializes category and page consistently", () => {
    assert.equal(
      resolveBlogListingHref({
        category: "zdravie & krása",
        page: 2,
      }),
      "/blog?category=zdravie+%26+krása&page=2"
    )
  })

  it("builds the equivalent API URL for loading another page", () => {
    assert.equal(
      resolveBlogListingApiHref({
        category: "zdravie & krása",
        page: 3,
      }),
      "/api/blog?category=zdravie+%26+krása&page=3"
    )
  })
})

describe("blogQueryParsers", () => {
  it("normalizes category and accepts positive integer pages", () => {
    assert.equal(blogQueryParsers.category.parseServerSide(" health "), "health")
    assert.equal(blogQueryParsers.page.parseServerSide("4"), 4)
  })

  it("falls back to the default query state for invalid input", () => {
    assert.equal(
      blogQueryParsers.category.parseServerSide(" "),
      ALL_BLOG_CATEGORIES_KEY
    )
    assert.equal(blogQueryParsers.page.parseServerSide("-2"), 1)
    assert.equal(blogQueryParsers.page.parseServerSide("invalid"), 1)
  })
})
