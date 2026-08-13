import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { mapCmsArticleToBlogPost } from "./cms-blog-mappers"
import type { CmsArticle } from "./cms-types"

const article: CmsArticle = {
  id: 1,
  slug: "article",
  title: "Article",
  excerpt: "Excerpt",
  featuredImage: { url: "https://cms.example.com/article.webp" },
  primaryCategory: { id: 1, slug: "health", title: "Health" },
  publishedDate: "2026-07-24T00:00:00.000Z",
  readingTime: 5,
  sidebar: {
    promoImage: {
      alt: "Summer sale",
      url: "https://cms.example.com/sidebar.webp",
    },
    product: { productExternalId: "4362" },
  },
  author: {
    displayName: "Herbatika redakcia",
    role: "Author",
    bio: "Biography",
    portrait: { url: "https://cms.example.com/author.webp" },
  },
  contentSegments: [
    { type: "html", html: '<h2 id="first">First</h2>' },
    {
      type: "productCarousel",
      products: [{ productExternalId: "42", productSlug: "legacy-handle" }],
    },
    { type: "html", html: "<p>After carousel</p>" },
  ],
  tableOfContents: [
    { id: "first", level: 2, title: "First" },
    { id: "first", level: 2, title: "Duplicate" },
    { id: "invalid id", level: 3, title: "Invalid" },
  ],
  relatedArticles: [
    {
      id: 2,
      slug: "related",
      title: "Related",
      excerpt: "Related excerpt",
      featuredImage: { url: "https://cms.example.com/related.webp" },
      primaryCategory: { id: 1, slug: "health", title: "Health" },
      publishedDate: "2026-07-23T00:00:00.000Z",
      readingTime: 3,
    },
  ],
  tags: ["Health"],
}

describe("mapCmsArticleToBlogPost", () => {
  it("preserves structured content order and public article metadata", () => {
    const post = mapCmsArticleToBlogPost(article)

    assert.ok(post)
    assert.deepEqual(
      post.contentSegments.map(({ type }) => type),
      ["html", "productCarousel", "html"]
    )
    assert.deepEqual(post.tableOfContents, [
      { id: "first", level: 2, title: "First" },
    ])
    assert.equal(post.author?.name, "Herbatika redakcia")
    assert.equal(post.author?.imageSrc, "https://cms.example.com/author.webp")
    assert.deepEqual(post.sidebar, {
      promoImage: {
        alt: "Summer sale",
        src: "https://cms.example.com/sidebar.webp",
      },
      product: { productExternalId: "4362", productSlug: undefined },
    })
    assert.deepEqual(
      post.relatedPosts.map(({ slug }) => slug),
      ["related"]
    )
  })
})
