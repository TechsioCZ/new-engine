import {
  createWorkflow,
  type WorkflowData,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { validateCompanyActiveStep } from "../../company/steps"
import { deleteEmployeesStep } from "../steps"

type DeleteEmployeesWorkflowInput = {
  company_id?: string
  id: string | string[]
}

export const deleteEmployeesWorkflow = createWorkflow(
  "delete-employees",
  (
    input: WorkflowData<DeleteEmployeesWorkflowInput>
  ): WorkflowResponse<string> => {
    validateCompanyActiveStep(input.company_id)
    deleteEmployeesStep(input)

    return new WorkflowResponse("Company customers deleted")
  }
)
