import type { z } from "@medusajs/framework/zod"
import type {
  CmsArticleCategorySchema,
  CmsArticleSchema,
  CmsCategoryListOptionsSchema,
  CmsFooterColumnSlotSchema,
  CmsFooterItemSlotSchema,
  CmsFooterNavigationGlobalSchema,
  CmsFooterNavigationItemSchema,
  CmsHeroCarouselSchema,
  CmsLexicalContentSchema,
  CmsListOptionsSchema,
  CmsPageCategorySchema,
  CmsPageSchema,
  CmsProductReferenceSchema,
  CmsSeoSchema,
  CmsStatusSchema,
  CmsStoreFooterNavigationItemSchema,
  CmsStoreFooterNavigationSchema,
  CmsVisibilitySchema,
} from "./schemas"

/** Configuration options for connecting to the Payload CMS instance. */
export type PayloadModuleOptions = {
  serverUrl: string
  apiKey: string
  userCollection?: string
  contentCacheTtl?: number
  listCacheTtl?: number
  requestTimeoutMs?: number
}

export type CmsVisibility = z.infer<typeof CmsVisibilitySchema>
export type CmsStatus = z.infer<typeof CmsStatusSchema>
export type CmsSeo = z.infer<typeof CmsSeoSchema>
export type CmsPageDTO = z.infer<typeof CmsPageSchema>
export type CmsPageCategoryDTO = z.infer<typeof CmsPageCategorySchema>
export type CmsArticleDTO = z.infer<typeof CmsArticleSchema>
export type CmsLexicalContentDTO = z.infer<typeof CmsLexicalContentSchema>
export type CmsProductReferenceDTO = z.infer<typeof CmsProductReferenceSchema>
export type CmsArticleTableOfContentsItem = {
  id: string
  level: 2 | 3
  title: string
}
export type CmsArticleContentSegment =
  | {
      type: "html"
      html: string
    }
  | {
      type: "productCarousel"
      products: CmsProductReferenceDTO[]
    }
export type CmsArticleCategoryDTO = z.infer<typeof CmsArticleCategorySchema>
export type CmsHeroCarouselDTO = z.infer<typeof CmsHeroCarouselSchema>
export type CmsFooterColumnSlot = z.infer<typeof CmsFooterColumnSlotSchema>
export type CmsFooterItemSlot = z.infer<typeof CmsFooterItemSlotSchema>
export type CmsFooterNavigationItemDTO = z.infer<
  typeof CmsFooterNavigationItemSchema
>
export type CmsFooterNavigationGlobalDTO = z.infer<
  typeof CmsFooterNavigationGlobalSchema
>
export type CmsStoreFooterNavigationItemDTO = z.infer<
  typeof CmsStoreFooterNavigationItemSchema
>
export type CmsStoreFooterNavigationDTO = z.infer<
  typeof CmsStoreFooterNavigationSchema
>
export type CmsListOptions = z.infer<typeof CmsListOptionsSchema>
export type CmsCategoryListOptions = z.infer<
  typeof CmsCategoryListOptionsSchema
>

/** Query options supported by the Payload REST API list endpoint. */
export type PayloadQueryOptions = {
  limit?: number
  page?: number
  where?: Record<string, unknown>
  sort?: string
  select?: Record<string, boolean>
  populate?: Record<string, Record<string, boolean>>
  locale?: string
  "fallback-locale"?: "false" | "none"
  depth?: number
}

export type CmsStoreMediaDTO = {
  id: number | string
  alt: string | null
  url: string
  width: number | null
  height: number | null
}

export type CmsStoreArticleCategoryDTO = {
  id: number | string
  title: string
  slug: string
}

export type CmsStoreArticleAuthorDTO = {
  id: number | string
  displayName: string
  role: string | null
  bio: string | null
  portrait: CmsStoreMediaDTO | null
}

export type CmsStoreArticleSidebarDTO = {
  promoImage: CmsStoreMediaDTO | null
  product: CmsProductReferenceDTO | null
}

export type CmsStoreRelatedArticleDTO = {
  id: number | string
  slug: string
  title: string
  excerpt: string | null
  featuredImage: CmsStoreMediaDTO | null
  primaryCategory: CmsStoreArticleCategoryDTO | null
  publishedDate: string | null
  readingTime: number | null
}

export type CmsStoreArticleDTO = {
  id: number | string
  slug: string
  title: string
  excerpt: string | null
  featuredImage: CmsStoreMediaDTO | null
  sidebar: CmsStoreArticleSidebarDTO | null
  category: CmsStoreArticleCategoryDTO | null
  categories: CmsStoreArticleCategoryDTO[]
  primaryCategory: CmsStoreArticleCategoryDTO | null
  author: CmsStoreArticleAuthorDTO | null
  meta: {
    title: string | null
    description: string | null
    image: CmsStoreMediaDTO | null
  } | null
  publishedDate: string | null
  readingTime: number | null
  tags: string[]
  contentSegments: CmsArticleContentSegment[]
  tableOfContents: CmsArticleTableOfContentsItem[]
  relatedArticles: CmsStoreRelatedArticleDTO[]
}

/** Response wrapper for single-document Payload API results. */
export type PayloadItemResult<T> = {
  doc: T
  message: string
}

/** Response wrapper for list-based Payload API results. */
export type PayloadBulkResult<T> = {
  docs: T[]
  totalDocs: number
  limit: number
  page: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
  nextPage: number | null
  prevPage: number | null
  pagingCounter: number
}

/** Generic error envelope for API responses. */
export type PayloadApiResponse<T> = {
  data?: T
  errors?: Array<{ message: string; field?: string }>
  message?: string
}
