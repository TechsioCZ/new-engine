import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import type { ModuleDeleteCompany } from "../../../types"
import { deleteApprovalSettingsStep } from "../../approval/steps"
import {
  clearCompanyAdminAuthMetadataStep,
  deleteCompaniesStep,
  removeCompanyCustomerGroupLinkStep,
} from "../steps"

export const deleteCompaniesWorkflow = createWorkflow(
  "delete-companies",
  (input: ModuleDeleteCompany) => {
    removeCompanyCustomerGroupLinkStep({
      company_id: input.id,
      preserve_link: true,
    })

    clearCompanyAdminAuthMetadataStep([input.id])

    deleteCompaniesStep([input.id])

    deleteApprovalSettingsStep({
      companyIds: [input.id],
    })

    return new WorkflowResponse(undefined)
  }
)
