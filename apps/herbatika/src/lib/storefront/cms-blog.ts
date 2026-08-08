import { getRecordValue, isRecord } from "@techsio/std/object"

import type { BlogPost } from "./blog-content"
import { parseCmsArticle, parseCmsArticleCategory } from "./cms-blog-parser"
import { mapCmsArticleToBlogPost } from "./cms-blog-render-model"
import { fetchCmsJson } from "./cms-client"
import type { CmsArticleCategory } from "./cms-types"

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0

const fetchCmsArticleCategories = async () => {
  const response = await fetchCmsJson("article-categories")
  if (!isRecord(response)) {
    return []
  }
  const categoriesValue = getRecordValue(response, "articleCategories")
  const rawCategories = Array.isArray(categoriesValue) ? categoriesValue : []

  return rawCategories
    .map(parseCmsArticleCategory)
    .filter((category): category is CmsArticleCategory => category !== null)
}

const fetchCmsArticleBySlug = async (slug: string) => {
  const response = await fetchCmsJson(`articles/${encodeURIComponent(slug)}`)

  return isRecord(response)
    ? parseCmsArticle(getRecordValue(response, "article"))
    : null
}

export const fetchCmsBlogPost = async (slug: string) => {
  const article = await fetchCmsArticleBySlug(slug)

  return article ? mapCmsArticleToBlogPost(article) : null
}

export const fetchCmsBlogPosts = async () => {
  const categories = await fetchCmsArticleCategories()
  const slugSet = new Set<string>()
  for (const category of categories) {
    for (const article of category.articles ?? []) {
      const slug = article.slug?.trim()
      if (isNonEmptyString(slug)) {
        slugSet.add(slug)
      }
    }
  }
  const articles = await Promise.all([...slugSet].map(fetchCmsArticleBySlug))

  return articles
    .map((article) => (article ? mapCmsArticleToBlogPost(article) : null))
    .filter((post): post is BlogPost => Boolean(post))
    .toSorted(
      (left, right) =>
        new Date(right.publishedAt).getTime() -
        new Date(left.publishedAt).getTime(),
    )
}
