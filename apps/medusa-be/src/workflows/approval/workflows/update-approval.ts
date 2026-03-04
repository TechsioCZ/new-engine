/* istanbul ignore file */
import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import type { ModuleUpdateApproval } from "../../../types"
import { updateApprovalStatusStep, updateApprovalStep } from "../steps"

export const updateApprovalsWorkflow = createWorkflow(
  "update-approvals",
  (input: ModuleUpdateApproval) => {
    const updatedApproval = updateApprovalStep(input)

    updateApprovalStatusStep(updatedApproval)

    return new WorkflowResponse(updatedApproval)
  }
)
