import { Module } from "@medusajs/framework/utils"
import { PRODUCT_LIST_MODULE } from "./constants"
import ProductListModuleService from "./service"

export default Module(PRODUCT_LIST_MODULE, {
  service: ProductListModuleService,
})
