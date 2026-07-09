import { Module } from "@medusajs/framework/utils"
import StorefrontTextModuleService from "./service"

export const STOREFRONT_TEXT_MODULE = "storefront_text"

export default Module(STOREFRONT_TEXT_MODULE, {
  service: StorefrontTextModuleService,
})
