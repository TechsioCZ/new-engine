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
  category?: CmsCategory | null
  excerpt?: string | null
  featuredImage?: CmsMedia | string | null
  id?: number | string
  primaryCategory?: CmsCategory | null
  publishedDate?: string | null
  readingTime?: number | null
  slug?: string | null
  title?: string | null
}

export type CmsArticleCategory = CmsCategory & {
  articles?: CmsArticleSummary[] | null
}

export type CmsProductReference = {
  productExternalId?: string | null
  productSlug?: string | null
}

export type CmsArticleContentSegment =
  | {
      type: "html"
      html: string
    }
  | {
      type: "productCarousel"
      products: CmsProductReference[]
    }

export type CmsArticle = {
  author?: {
    displayName?: string | null
    role?: string | null
    bio?: string | null
    portrait?: CmsMedia | string | null
  } | null
  category?: CmsCategory | null
  categories?: CmsCategory[] | null
  contentSegments?: CmsArticleContentSegment[] | null
  excerpt?: string | null
  featuredImage?: CmsMedia | string | null
  id: number | string
  publishedDate?: string | null
  primaryCategory?: CmsCategory | null
  readingTime?: number | null
  relatedArticles?: CmsArticleSummary[] | null
  tableOfContents?: Array<{
    id?: string | null
    level?: number | null
    title?: string | null
  }> | null
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

export type CmsHeroCarousel = {
  button?: string | null
  buttonHref?: string | null
  heading?: string | null
  id: number | string
  image?: CmsMedia | string | null
  subheading?: string | null
}
