import { Module } from "@medusajs/framework/utils"
import StorefrontUrlAssignmentModuleService from "./service"

export const STOREFRONT_URL_ASSIGNMENT_MODULE = "storefrontUrlAssignment"

export default Module(STOREFRONT_URL_ASSIGNMENT_MODULE, {
  service: StorefrontUrlAssignmentModuleService,
})
