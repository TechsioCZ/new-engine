import { FALLBACK_IMAGE_SRC } from "@/components/fallback-image.constants"
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
  type CmsArticleIndexEntry,
  resolveCmsBlogCategory,
} from "./cms-blog-index"
import {
  resolveCmsMediaUrl,
  rewriteCmsHtmlMediaUrls,
  stripCmsHtml,
} from "./cms-content"
import type { CmsArticle, CmsArticleSummary } from "./cms-types"

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
    ...(article.author?.bio?.trim() ? { bio: article.author.bio.trim() } : {}),
    ...(imageSrc ? { imageSrc } : {}),
  }
}

const mapCmsSidebar = (article: CmsArticle) => {
  const promoImageSrc = resolveCmsMediaUrl(article.sidebar?.promoImage)
  const promoImageAlt =
    article.sidebar?.promoImage &&
    typeof article.sidebar.promoImage === "object"
      ? article.sidebar.promoImage.alt?.trim()
      : undefined
  const productExternalId = article.sidebar?.product?.productExternalId?.trim()
  const productSlug = article.sidebar?.product?.productSlug?.trim()

  if (!(promoImageSrc || productExternalId || productSlug)) {
    return
  }

  return {
    ...(promoImageSrc
      ? {
          promoImage: {
            alt: promoImageAlt || article.title?.trim() || "",
            src: promoImageSrc,
          },
        }
      : {}),
    ...(productExternalId || productSlug
      ? {
          product: {
            productExternalId,
            productSlug,
          },
        }
      : {}),
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

const mapCmsProductReference = (
  value: unknown
): BlogProductReference | null => {
  if (!(value && typeof value === "object")) {
    return null
  }

  const reference = value as Record<string, unknown>
  const productExternalId = isNonEmptyString(reference.productExternalId)
    ? reference.productExternalId.trim()
    : undefined
  const productSlug = isNonEmptyString(reference.productSlug)
    ? reference.productSlug.trim()
    : undefined

  return productExternalId || productSlug
    ? { productExternalId, productSlug }
    : null
}

const mapCmsContentSegment = (
  value: unknown
): BlogArticleContentSegment | null => {
  if (!(value && typeof value === "object")) {
    return null
  }

  const { html, products, type } = value as Record<string, unknown>
  if (type === "html" && typeof html === "string") {
    const normalizedHtml = rewriteCmsHtmlMediaUrls(html).trim()
    return normalizedHtml ? { type: "html", html: normalizedHtml } : null
  }

  if (type !== "productCarousel" || !Array.isArray(products)) {
    return null
  }

  const productReferences = products.flatMap((product) => {
    const reference = mapCmsProductReference(product)
    return reference ? [reference] : []
  })

  return productReferences.length > 0
    ? { type: "productCarousel", products: productReferences }
    : null
}

const mapCmsContentSegments = (value: unknown): BlogArticleContentSegment[] =>
  Array.isArray(value)
    ? value.flatMap((segment) => {
        const mappedSegment = mapCmsContentSegment(segment)
        return mappedSegment ? [mappedSegment] : []
      })
    : []

const mapCmsArticleSummaryToBlogCard = (
  article: CmsArticleSummary,
  fallbackCategory?: BlogCategory
): BlogCardItem | null => {
  const slug = article.slug?.trim()
  const title = article.title?.trim()
  if (!(slug && title)) {
    return null
  }

  return {
    id: `cms-${article.id ?? slug}`,
    slug,
    title,
    excerpt: article.excerpt?.trim() ?? "",
    imageSrc: resolveCmsMediaUrl(article.featuredImage) ?? FALLBACK_IMAGE_SRC,
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
    sidebar: mapCmsSidebar(article),
    lead: excerpt,
    contentSegments,
    tableOfContents: mapTableOfContents(article.tableOfContents),
  }
}

export const mapCmsArticleIndexToCards = (entries: CmsArticleIndexEntry[]) =>
  entries.flatMap(({ category, summary }) => {
    const post = mapCmsArticleSummaryToBlogCard(summary, category)
    return post ? [post] : []
  })
