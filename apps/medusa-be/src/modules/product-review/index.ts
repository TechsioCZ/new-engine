import { Module } from "@medusajs/framework/utils"
import ProductReviewModuleService from "./service"

export const PRODUCT_REVIEW_MODULE = "product_review"

export default Module(PRODUCT_REVIEW_MODULE, {
  service: ProductReviewModuleService,
})
