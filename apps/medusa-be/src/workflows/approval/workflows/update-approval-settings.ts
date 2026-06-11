import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import type { ModuleUpdateApprovalSettings } from "../../../types"
import { validateCompanyActiveStep } from "../../company/steps"
import { updateApprovalSettingsStep } from "../steps"

type UpdateApprovalSettingsWorkflowInput = ModuleUpdateApprovalSettings & {
  company_id?: string
}

export const updateApprovalSettingsWorkflow = createWorkflow(
  "update-approval-settings",
  (input: UpdateApprovalSettingsWorkflowInput) => {
    validateCompanyActiveStep(input.company_id)

    const updateInput = transform({ input }, (data) => ({
      id: data.input.id,
      requires_admin_approval: data.input.requires_admin_approval,
      requires_sales_manager_approval:
        data.input.requires_sales_manager_approval,
    }))

    return new WorkflowResponse(updateApprovalSettingsStep(updateInput))
  }
)
