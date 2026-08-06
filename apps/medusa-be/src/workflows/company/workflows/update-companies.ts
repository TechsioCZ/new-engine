import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import type { ModuleUpdateCompany } from "../../../types"
import { updateCompaniesStep } from "../steps/update-companies"
import { validateCompanyActiveStep } from "../steps/validate-company-active"

interface UpdateCompaniesWorkflowInput {
  id: string
  update: Omit<ModuleUpdateCompany, "id">
}

export const updateCompaniesWorkflow = createWorkflow(
  "update-companies",
  (input: UpdateCompaniesWorkflowInput) => {
    validateCompanyActiveStep(input.id)

    return new WorkflowResponse(updateCompaniesStep(input))
  },
)
