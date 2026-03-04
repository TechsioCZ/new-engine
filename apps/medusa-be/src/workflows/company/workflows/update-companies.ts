import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import type { ModuleUpdateCompany } from "../../../types"
import { updateCompaniesStep } from "../steps"

export const updateCompaniesWorkflow = createWorkflow(
  "update-companies",
  (input: ModuleUpdateCompany) =>
    new WorkflowResponse(updateCompaniesStep(input))
)
