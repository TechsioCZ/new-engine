import { describe, expect, it } from "vitest"
import { FALLBACK_IMAGE_SRC } from "@/components/fallback-image.constants"
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

    expect(post).not.toBeNull()
    if (!post) {
      throw new Error("Expected the CMS article to map to a blog post")
    }

    expect(post.contentSegments.map(({ type }) => type)).toEqual([
      "html",
      "productCarousel",
      "html",
    ])
    expect(post.tableOfContents).toEqual([
      { id: "first", level: 2, title: "First" },
    ])
    expect(post.author?.name).toBe("Herbatika redakcia")
    expect(post.author?.imageSrc).toBe("https://cms.example.com/author.webp")
    expect(post.sourceId).toBe("1")
    expect(post.sidebar).toEqual({
      promoImage: {
        alt: "Summer sale",
        src: "https://cms.example.com/sidebar.webp",
      },
      product: { productExternalId: "4362" },
    })
    expect(post.relatedPosts.map(({ slug }) => slug)).toEqual(["related"])
    expect(post.relatedPosts.map(({ sourceId }) => sourceId)).toEqual(["2"])
  })

  it("keeps an article visible when its featured image is unavailable", () => {
    const post = mapCmsArticleToBlogPost({ ...article, featuredImage: null })

    expect(post?.imageSrc).toBe(FALLBACK_IMAGE_SRC)
  })

  it("fails closed when the stable Payload document ID is invalid", () => {
    expect(mapCmsArticleToBlogPost({ ...article, id: " " })).toBeNull()
  })

  it("omits absent optional fields so the mapped post is JSON-safe", () => {
    const post = mapCmsArticleToBlogPost({
      ...article,
      author: null,
      sidebar: {
        product: { productExternalId: "4362", productSlug: undefined },
      },
    })

    expect(post).not.toHaveProperty("author")
    expect(post?.sidebar?.product).toEqual({ productExternalId: "4362" })
    expect(JSON.parse(JSON.stringify(post))).toEqual(post)
  })
})
