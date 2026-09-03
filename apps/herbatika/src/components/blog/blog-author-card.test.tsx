import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { mapCmsArticleToBlogPost } from "@/lib/storefront/cms-blog-mappers"
import type { CmsArticle } from "@/lib/storefront/cms-types"
import type { HerbatikaLocale } from "@/lib/storefront/market-context"
import { BlogAuthorCard } from "./blog-author-card"

const article: CmsArticle = {
  id: 1,
  slug: "article",
  title: "Article",
  excerpt: "Excerpt",
  author: {
    displayName: "Herbatika redakcia",
  },
}

const renderAuthorCard = (locale: HerbatikaLocale) => {
  const post = mapCmsArticleToBlogPost(article, undefined, locale)
  if (!post) {
    throw new Error("Expected the CMS article to map to a blog post")
  }

  return renderToStaticMarkup(<BlogAuthorCard post={post} />)
}

describe("BlogAuthorCard editorial author localization", () => {
  it("renders the Romanian editorial identity for RO", () => {
    const markup = renderAuthorCard("ro-RO")

    expect(markup).toContain("Redacția Herbatica")
    expect(markup).not.toContain("Herbatika redakcia")
  })

  it("preserves the Slovak editorial identity for SK", () => {
    const markup = renderAuthorCard("sk-SK")

    expect(markup).toContain("Herbatika redakcia")
    expect(markup).not.toContain("Redacția Herbatica")
  })
})
