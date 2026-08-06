import { Module } from "@medusajs/framework/utils"

import PayloadModuleService from "./service"

/** Module registration key for the Payload integration. */
export const PAYLOAD_MODULE = "payload"

/** Medusa module definition for the Payload integration. */
export default Module(PAYLOAD_MODULE, {
  service: PayloadModuleService,
})

export type {
  CmsArticleCategoryDTO,
  CmsArticleDTO,
  CmsCategoryListOptions,
  CmsHeroCarouselDTO,
  CmsListOptions,
  CmsPageCategoryDTO,
  CmsPageDTO,
  CmsSeo,
  CmsStatus,
  CmsVisibility,
  PayloadApiResponse,
  PayloadBulkResult,
  PayloadItemResult,
  PayloadModuleOptions,
  PayloadQueryOptions,
} from "./types"
