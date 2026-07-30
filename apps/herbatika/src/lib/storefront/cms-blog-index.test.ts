import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { BlogPost } from "./blog-content"
import {
  buildCmsBlogPage,
  mapBlogPostToCard,
} from "./cms-blog-index"
import {
  ALL_BLOG_CATEGORIES_KEY,
  resolveBlogListingApiHref,
  resolveBlogListingHref,
} from "./blog-routing"
import { blogQueryParsers } from "./blog-query-state"

const post: BlogPost = {
  id: "cms-1",
  slug: "test-article",
  title: "Test article",
  excerpt: "Short summary",
  contentHtml: "<p>Large article body</p>",
  imageSrc: "http://localhost:8083/api/media/file/test.webp",
  category: {
    slug: "blog",
    title: "Blog",
  },
  tags: ["Health"],
  publishedAt: "2026-07-24T00:00:00.000Z",
  author: "Herbatika redakcia",
  authorRole: "Article author",
  authorBio: "Long author biography",
  readingTime: "4 min",
  lead: "Article lead",
}

describe("mapBlogPostToCard", () => {
  it("keeps only fields rendered by blog cards", () => {
    assert.deepEqual(mapBlogPostToCard(post), {
      id: "cms-1",
      slug: "test-article",
      title: "Test article",
      excerpt: "Short summary",
      imageSrc: "http://localhost:8083/api/media/file/test.webp",
      category: {
        slug: "blog",
        title: "Blog",
      },
      publishedAt: "2026-07-24T00:00:00.000Z",
      readingTime: "4 min",
    })
  })
})

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
