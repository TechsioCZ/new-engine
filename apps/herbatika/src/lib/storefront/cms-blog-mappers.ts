import type {
  BlogArticleContentSegment,
  BlogCardItem,
  BlogCategory,
  BlogPost,
  BlogProductReference,
  BlogTableOfContentsItem,
} from "./blog-content"
import { isBlogHeadingId } from "./blog-heading-id"
import {
  resolveCmsMediaUrl,
  rewriteCmsHtmlMediaUrls,
  stripCmsHtml,
} from "./cms-content"
import {
  type CmsArticleIndexEntry,
  resolveCmsBlogCategory,
} from "./cms-blog-index"
import type {
  CmsArticle,
  CmsArticleSummary,
} from "./cms-types"

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0

const mapCmsAuthor = (article: CmsArticle) => {
  const name = article.author?.displayName?.trim()
  if (!name) {
    return
  }

  const imageSrc = resolveCmsMediaUrl(article.author?.portrait)
  return {
    name,
    ...(article.author?.role?.trim()
      ? { role: article.author.role.trim() }
      : {}),
    ...(article.author?.bio?.trim()
      ? { bio: article.author.bio.trim() }
      : {}),
    ...(imageSrc ? { imageSrc } : {}),
  }
}

const mapTableOfContents = (value: unknown): BlogTableOfContentsItem[] => {
  if (!Array.isArray(value)) {
    return []
  }

  const seenIds = new Set<string>()
  return value.flatMap((item) => {
    if (!(item && typeof item === "object")) {
      return []
    }

    const { id, level, title } = item as Record<string, unknown>
    const normalizedId = isNonEmptyString(id) ? id.trim() : ""
    if (
      !isBlogHeadingId(normalizedId) ||
      seenIds.has(normalizedId) ||
      !isNonEmptyString(title) ||
      (level !== 2 && level !== 3)
    ) {
      return []
    }

    seenIds.add(normalizedId)
    return [{ id: normalizedId, level, title: title.trim() }]
  })
}

const mapCmsContentSegments = (value: unknown): BlogArticleContentSegment[] => {
  if (!Array.isArray(value)) {
    return []
  }

  const contentSegments: BlogArticleContentSegment[] = []
  for (const segment of value) {
    if (!(segment && typeof segment === "object")) {
      continue
    }

    const { html, products, type } = segment as Record<string, unknown>
    if (type === "html" && typeof html === "string") {
      const normalizedHtml = rewriteCmsHtmlMediaUrls(html).trim()
      if (normalizedHtml) {
        contentSegments.push({ type: "html", html: normalizedHtml })
      }
      continue
    }

    if (type !== "productCarousel" || !Array.isArray(products)) {
      continue
    }

    const productReferences: BlogProductReference[] = []
    for (const product of products) {
      if (!(product && typeof product === "object")) {
        continue
      }

      const reference = product as Record<string, unknown>
      const productExternalId = isNonEmptyString(reference.productExternalId)
        ? reference.productExternalId.trim()
        : undefined
      const productSlug = isNonEmptyString(reference.productSlug)
        ? reference.productSlug.trim()
        : undefined

      if (productExternalId || productSlug) {
        productReferences.push({ productExternalId, productSlug })
      }
    }

    if (productReferences.length > 0) {
      contentSegments.push({
        type: "productCarousel",
        products: productReferences,
      })
    }
  }

  return contentSegments
}

const mapCmsArticleSummaryToBlogCard = (
  article: CmsArticleSummary,
  fallbackCategory?: BlogCategory
): BlogCardItem | null => {
  const slug = article.slug?.trim()
  const title = article.title?.trim()
  const imageSrc = resolveCmsMediaUrl(article.featuredImage)
  if (!(slug && title && imageSrc)) {
    return null
  }

  return {
    id: `cms-${article.id ?? slug}`,
    slug,
    title,
    excerpt: article.excerpt?.trim() ?? "",
    imageSrc,
    category: resolveCmsBlogCategory(
      article.primaryCategory ?? article.category,
      fallbackCategory
    ),
    publishedAt: article.publishedDate ?? "",
    readingTime: `${Math.max(article.readingTime ?? 1, 1)} min`,
  }
}

export const mapCmsArticleToBlogPost = (
  article: CmsArticle,
  fallbackCategory?: BlogCategory
): BlogPost | null => {
  const card = mapCmsArticleSummaryToBlogCard(article, fallbackCategory)
  if (!card) {
    return null
  }

  const contentSegments = mapCmsContentSegments(article.contentSegments)
  const contentHtml = contentSegments
    .flatMap((segment) => (segment.type === "html" ? [segment.html] : []))
    .join(" ")
  const excerpt =
    article.excerpt?.trim() || stripCmsHtml(contentHtml).slice(0, 180)
  const tags = (article.tags ?? []).filter(isNonEmptyString)
  const relatedPosts = (article.relatedArticles ?? [])
    .flatMap((relatedArticle) => {
      const relatedPost = mapCmsArticleSummaryToBlogCard(relatedArticle)
      return relatedPost && relatedPost.slug !== card.slug ? [relatedPost] : []
    })
    .slice(0, 4)

  return {
    ...card,
    excerpt,
    tags: tags.length > 0 ? tags : [card.category.title],
    author: mapCmsAuthor(article),
    relatedPosts,
    lead: excerpt,
    contentSegments,
    tableOfContents: mapTableOfContents(article.tableOfContents),
  }
}

export const mapCmsArticleIndexToCards = (
  entries: CmsArticleIndexEntry[]
) =>
  entries.flatMap(({ category, summary }) => {
    const post = mapCmsArticleSummaryToBlogCard(summary, category)
    return post ? [post] : []
  })
