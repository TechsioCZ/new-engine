import { describe, expect, it } from "vitest"
import { toCmsStoreArticle } from "../../../../../src/modules/payload/article-store-dto"
import { CmsArticleSchema } from "../../../../../src/modules/payload/schemas"

const media = {
  id: 10,
  url: "/api/media/file/article.webp",
  alt: "Article",
  width: 600,
  height: 350,
  privateMediaField: "removed",
}

const category = {
  id: 20,
  title: "Zdraví",
  slug: "zdravi",
  privateCategoryField: "removed",
}

const relatedArticle = (id: number) => ({
  id,
  slug: `related-${id}`,
  title: `Related ${id}`,
  excerpt: `Excerpt ${id}`,
  featuredImage: media,
  primaryCategory: category,
  status: "published" as const,
  publishedDate: "2026-07-31T00:00:00.000Z",
  readingTime: 4,
  content: { private: true },
})

describe("toCmsStoreArticle", () => {
  it("returns only the public article fields", () => {
    const article = CmsArticleSchema.parse({
      id: 1,
      slug: "article",
      title: "Article",
      excerpt: "Excerpt",
      content: {
        root: {
          type: "root",
          children: [],
          version: 1,
        },
      },
      contentHTML: "<p>Article</p>",
      featuredImage: media,
      category,
      categories: [category],
      primaryCategory: category,
      articleAuthor: {
        id: 30,
        displayName: "Herbatika redakcia",
        role: "Článok pre vás pripravila",
        bio: "Odborný obsah o zdraví.",
        portrait: media,
        email: "private@example.com",
        apiKey: "private-key",
      },
      meta: {
        title: "SEO title",
        description: "SEO description",
        image: media,
        privateMetaField: "removed",
      },
      status: "published",
      publishedDate: "2026-07-31T00:00:00.000Z",
      readingTime: 6,
      tags: ["zdravie"],
      relatedArticles: [relatedArticle(2)],
      arbitraryFutureField: "removed",
    })

    const result = toCmsStoreArticle(article)
    const serialized = JSON.stringify(result)

    expect(Object.keys(result).sort()).toEqual(
      [
        "author",
        "categories",
        "category",
        "contentSegments",
        "excerpt",
        "featuredImage",
        "id",
        "meta",
        "primaryCategory",
        "publishedDate",
        "readingTime",
        "relatedArticles",
        "slug",
        "tableOfContents",
        "tags",
        "title",
      ].sort()
    )
    expect(result.author).toEqual({
      id: 30,
      displayName: "Herbatika redakcia",
      role: "Článok pre vás pripravila",
      bio: "Odborný obsah o zdraví.",
      portrait: {
        id: 10,
        url: "/api/media/file/article.webp",
        alt: "Article",
        width: 600,
        height: 350,
      },
    })
    expect(serialized).not.toContain("private@example.com")
    expect(serialized).not.toContain("private-key")
    expect(serialized).not.toContain("arbitraryFutureField")
    expect(serialized).not.toContain("privateMediaField")
    expect(serialized).not.toContain("privateCategoryField")
    expect(serialized).not.toContain("privateMetaField")
    expect(serialized).not.toContain('"contentHTML"')
    expect(serialized).not.toContain('"content"')
  })

  it("keeps at most four available localized related articles", () => {
    const article = CmsArticleSchema.parse({
      id: 1,
      slug: "article",
      title: "Article",
      relatedArticles: [
        99,
        { ...relatedArticle(2), status: "draft" },
        { ...relatedArticle(3), title: null },
        relatedArticle(4),
        relatedArticle(5),
        relatedArticle(6),
        relatedArticle(7),
        relatedArticle(8),
      ],
    })

    expect(toCmsStoreArticle(article).relatedArticles.map(({ id }) => id)).toEqual([
      4, 5, 6, 7,
    ])
  })
})
