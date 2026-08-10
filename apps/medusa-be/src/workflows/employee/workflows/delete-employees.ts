import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import type { WorkflowData } from "@medusajs/framework/workflows-sdk"

import { validateCompanyActiveStep } from "../../company/steps/validate-company-active"
import { deleteEmployeesStep } from "../steps/delete-employees"

interface DeleteEmployeesWorkflowInput {
  company_id?: string
  id: string | string[]
}

export const deleteEmployeesWorkflow = createWorkflow(
  "delete-employees",
  (
    input: WorkflowData<DeleteEmployeesWorkflowInput>,
  ): WorkflowResponse<string> => {
    validateCompanyActiveStep(input.company_id)
    deleteEmployeesStep(input)

    return new WorkflowResponse("Company customers deleted")
  },
)
