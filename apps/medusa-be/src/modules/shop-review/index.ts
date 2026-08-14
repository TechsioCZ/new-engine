import { Module } from "@medusajs/framework/utils"
import bootstrapZboziAccessTokenRefresh from "./loaders/bootstrap-zbozi-access-token-refresh"
import ShopReviewModuleService from "./service"

export const SHOP_REVIEW_MODULE = "shopReview"

export default Module(SHOP_REVIEW_MODULE, {
  service: ShopReviewModuleService,
  loaders: [bootstrapZboziAccessTokenRefresh],
})

export type { default as ShopReviewModuleService } from "./service"
export type {
  ShopReviewProvider,
  ShopReviewProviderResponse,
  ShopReviewTrustSummary,
} from "./types"
