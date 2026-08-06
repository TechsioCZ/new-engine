import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import type { ModuleUpdateApproval } from "../../../types"
import { updateApprovalStep } from "../steps/update-approval"
import { updateApprovalStatusStep } from "../steps/update-approval-statuses"

export const updateApprovalsWorkflow = createWorkflow(
  "update-approvals",
  (input: ModuleUpdateApproval) => {
    const updatedApproval = updateApprovalStep(input)

    updateApprovalStatusStep(updatedApproval)

    return new WorkflowResponse(updatedApproval)
  },
)
