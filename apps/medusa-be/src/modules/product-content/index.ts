import { Module } from "@medusajs/framework/utils"
import ProductContentModuleService from "./service"

export const PRODUCT_CONTENT_MODULE = "productContent"

export default Module(PRODUCT_CONTENT_MODULE, {
  service: ProductContentModuleService,
})
