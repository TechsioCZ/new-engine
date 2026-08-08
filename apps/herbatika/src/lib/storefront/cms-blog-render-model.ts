import type { BlogPost, BlogTopicKey } from "./blog-content"
import {
  resolveCmsMediaUrl,
  rewriteCmsHtmlMediaUrls,
  stripCmsHtml,
} from "./cms-client"
import type { CmsArticle, CmsBlogTopic, CmsCategory } from "./cms-types"

const DEFAULT_CMS_TOPIC: CmsBlogTopic = "zdravie"
const DEFAULT_AUTHOR_IMAGE =
  "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&w=320&q=80"
const DEFAULT_ARTICLE_IMAGE =
  "https://images.unsplash.com/photo-1461354464878-ad92f492a5a0?auto=format&fit=crop&w=1200&q=80"

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0

const resolveTopicFromCategory = (
  category: CmsCategory | null | undefined,
): Exclude<BlogTopicKey, "all"> => {
  const slug = category?.slug

  if (slug === null || slug === undefined) {
    return DEFAULT_CMS_TOPIC
  }

  switch (slug) {
    case "beauty":
    case "krasa": {
      return "krasa"
    }
    case "fitness":
    case "sport": {
      return "fitness"
    }
    default: {
      return DEFAULT_CMS_TOPIC
    }
  }
}

const resolveAuthorName = (article: CmsArticle) => {
  const authorParts = [
    article.author?.firstName?.trim(),
    article.author?.lastName?.trim(),
  ].filter(Boolean)

  return authorParts.length > 0 ? authorParts.join(" ") : "Herbatika redakcia"
}

export const mapCmsArticleToBlogPost = (
  article: CmsArticle,
): BlogPost | null => {
  const slug = article.slug?.trim()
  const title = article.title?.trim()

  if (!isNonEmptyString(slug) || !isNonEmptyString(title)) {
    return null
  }

  const categoryLabel = article.category?.title?.trim()
  const tags = (article.tags ?? []).filter(isNonEmptyString)
  if (isNonEmptyString(categoryLabel)) {
    tags.push(categoryLabel)
  }
  const contentHtml = rewriteCmsHtmlMediaUrls(article.content ?? "")
  const excerpt =
    article.excerpt?.trim() ?? stripCmsHtml(contentHtml).slice(0, 180)

  return {
    author: resolveAuthorName(article),
    authorBio:
      "Redakčný tím Herbatika pripravuje odborný obsah o zdraví, výžive a prírodnej starostlivosti.",
    authorImageSrc: DEFAULT_AUTHOR_IMAGE,
    authorRole: "Článok pre vás pripravila",
    bulletPoints: [],
    contentHtml,
    excerpt,
    id: `cms-${article.id}`,
    imageSrc:
      resolveCmsMediaUrl(article.featuredImage) ?? DEFAULT_ARTICLE_IMAGE,
    lead: excerpt,
    publishedAt: article.publishedDate ?? new Date(0).toISOString(),
    readingTime: `${Math.max(article.readingTime ?? 1, 1)} min`,
    sections: [],
    slug,
    tags: tags.length > 0 ? tags : ["Novinky"],
    title,
    topic: resolveTopicFromCategory(article.category),
  }
}
