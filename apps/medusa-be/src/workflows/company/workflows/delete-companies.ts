import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import type { ModuleDeleteCompany } from "../../../types"
import { deleteApprovalSettingsStep } from "../../approval/steps/delete-approval-settings"
import { clearCompanyAdminAuthMetadataStep } from "../steps/clear-company-admin-auth-metadata"
import { deleteCompaniesStep } from "../steps/delete-companies"
import { removeCompanyCustomerGroupLinkStep } from "../steps/remove-company-customer-group-link"

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
  },
)
