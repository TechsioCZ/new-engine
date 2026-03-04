import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import type { ModuleUpdateApprovalSettings } from "../../../types"
import { updateApprovalSettingsStep } from "../steps"

export const updateApprovalSettingsWorkflow = createWorkflow(
  "update-approval-settings",
  (input: ModuleUpdateApprovalSettings) =>
    new WorkflowResponse(updateApprovalSettingsStep(input))
)
