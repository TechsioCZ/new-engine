import { Module } from "@medusajs/framework/utils"
import StorefrontTextModuleService from "./service"

export const STOREFRONT_TEXT_MODULE = "storefrontText"

export default Module(STOREFRONT_TEXT_MODULE, {
  service: StorefrontTextModuleService,
})
