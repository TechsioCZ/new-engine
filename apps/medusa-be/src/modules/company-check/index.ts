import { Module } from "@medusajs/framework/utils"
import { CompanyCheckModuleService } from "./service"

export const COMPANY_CHECK_MODULE = "company_check"

export default Module(COMPANY_CHECK_MODULE, {
  service: CompanyCheckModuleService,
})

export type { CompanyCheckModuleService } from "./service"
export type { CompanyInfo } from "./types"
