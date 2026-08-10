import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import type { ModuleCompanyApplicationStatus } from "../../../types"
import {
  updateCompanyApplicationStatusStep,
  validateCompanyActiveStep,
} from "../steps"

type UpdateCompanyApplicationStatusWorkflowInput = {
  id: string
  status: ModuleCompanyApplicationStatus
}

export const updateCompanyApplicationStatusWorkflow = createWorkflow(
  "update-company-application-status",
  (input: UpdateCompanyApplicationStatusWorkflowInput) => {
    validateCompanyActiveStep(input.id)

    return new WorkflowResponse(updateCompanyApplicationStatusStep(input))
  }
)
