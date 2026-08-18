import { Module } from "@medusajs/framework/utils"
import ClaimCaseModuleService from "./service"

export const CLAIM_CASE_MODULE = "claimCase"

export default Module(CLAIM_CASE_MODULE, {
  service: ClaimCaseModuleService,
})
