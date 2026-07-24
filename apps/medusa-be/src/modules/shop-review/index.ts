import { Module } from "@medusajs/framework/utils"
import ShopReviewModuleService from "./service"

export const SHOP_REVIEW_MODULE = "shopReview"

export default Module(SHOP_REVIEW_MODULE, {
  service: ShopReviewModuleService,
})

export type { default as ShopReviewModuleService } from "./service"
export type { ShopReviewProvider, ShopReviewProviderResponse } from "./types"
