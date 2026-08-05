import type { BlogTopicKey } from "@/lib/storefront/blog-content"

export interface CmsMedia {
  alt?: string | null
  url?: string | null
}

export interface CmsCategory {
  id: number | string
  slug?: string | null
  title?: string | null
}

interface CmsArticleSummary {
  excerpt?: string | null
  featuredImage?: CmsMedia | string | null
  slug?: string | null
  title?: string | null
}

export type CmsArticleCategory = CmsCategory & {
  articles?: CmsArticleSummary[] | null
}

export interface CmsArticle {
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

export interface CmsPage {
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

export interface CmsHeroCarousel {
  button?: string | null
  buttonHref?: string | null
  heading?: string | null
  id: number | string
  image?: CmsMedia | string | null
  subheading?: string | null
}

export type CmsBlogTopic = Exclude<BlogTopicKey, "all">
