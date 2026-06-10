import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import type { ModuleDeleteCompany } from "../../../types"
import { deleteApprovalSettingsStep } from "../../approval/steps"
import {
  deleteCompaniesStep,
  removeCompanyCustomerGroupLinkStep,
} from "../steps"

export const deleteCompaniesWorkflow = createWorkflow(
  "delete-companies",
  (input: ModuleDeleteCompany) => {
    removeCompanyCustomerGroupLinkStep(input.id)

    deleteCompaniesStep([input.id])

    deleteApprovalSettingsStep({
      companyIds: [input.id],
    })

    return new WorkflowResponse(undefined)
  }
)
