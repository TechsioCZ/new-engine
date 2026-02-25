import { defineLink } from "@medusajs/framework/utils"
import ApprovalModule from "../modules/approval"
import CompanyModule from "../modules/company"

export default defineLink(
  CompanyModule.linkable.company,
  ApprovalModule.linkable.approvalSettings
)
