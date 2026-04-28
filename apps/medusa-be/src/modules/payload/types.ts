import type { z } from "@medusajs/framework/zod"
import type {
  CmsArticleCategorySchema,
  CmsArticleSchema,
  CmsCategoryListOptionsSchema,
  CmsHeroCarouselSchema,
  CmsListOptionsSchema,
  CmsPageCategorySchema,
  CmsPageSchema,
  CmsSeoSchema,
  CmsStatusSchema,
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
export type CmsArticleCategoryDTO = z.infer<typeof CmsArticleCategorySchema>
export type CmsHeroCarouselDTO = z.infer<typeof CmsHeroCarouselSchema>
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
  populate?: Record<string, boolean>
  locale?: string
  depth?: number
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
