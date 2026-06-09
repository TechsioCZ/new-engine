import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import type { ModuleUpdateCompany } from "../../../types"
import { updateCompaniesStep } from "../steps"

type UpdateCompaniesWorkflowInput = {
  id: string
  update: Omit<ModuleUpdateCompany, "id">
}

export const updateCompaniesWorkflow = createWorkflow(
  "update-companies",
  (input: UpdateCompaniesWorkflowInput) =>
    new WorkflowResponse(updateCompaniesStep(input))
)
