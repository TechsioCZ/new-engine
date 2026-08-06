import type { BlogTopicKey } from "@/lib/storefront/blog-content"

interface CmsMedia {
  alt?: string | null
  url?: string | null
}

type Nullish<T> = T | null | undefined
export type CmsMediaValue = Nullish<CmsMedia | string>

export interface CmsCategory {
  id: number | string
  slug?: string | null
  title?: string | null
}

interface CmsArticleSummary {
  excerpt?: string | null
  featuredImage?: CmsMediaValue
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
  featuredImage?: CmsMediaValue
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
    image?: CmsMediaValue
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
  image?: CmsMediaValue
  subheading?: string | null
}

export type CmsBlogTopic = Exclude<BlogTopicKey, "all">
