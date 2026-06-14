import type { BlogTopicKey } from "@/lib/storefront/blog-content"

export type CmsMedia = {
  alt?: string | null
  url?: string | null
}

export type CmsCategory = {
  id: number | string
  slug?: string | null
  title?: string | null
}

export type CmsArticleSummary = {
  excerpt?: string | null
  featuredImage?: CmsMedia | string | null
  slug?: string | null
  title?: string | null
}

export type CmsArticleCategory = CmsCategory & {
  articles?: CmsArticleSummary[] | null
}

export type CmsArticle = {
  author?: {
    firstName?: string | null
    lastName?: string | null
  } | null
  category?: CmsCategory | null
  content?: string | null
  excerpt?: string | null
  featuredImage?: CmsMedia | string | null
  id: number | string
  publishedDate?: string | null
  readingTime?: number | null
  slug?: string | null
  tags?: string[] | null
  title?: string | null
}

export type CmsPage = {
  category?: CmsCategory | null
  content?: string | null
  id: number | string
  meta?: {
    description?: string | null
    title?: string | null
  } | null
  publishedDate?: string | null
  slug?: string | null
  title?: string | null
}

export type CmsBlogTopic = Exclude<BlogTopicKey, "all">
