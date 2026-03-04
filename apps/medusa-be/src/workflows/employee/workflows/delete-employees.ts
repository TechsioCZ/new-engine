/* istanbul ignore file */
import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { deleteEmployeesStep } from "../steps"

export const deleteEmployeesWorkflow = createWorkflow(
  "delete-employees",
  (input: string | string[]): WorkflowResponse<string> => {
    deleteEmployeesStep(input)

    return new WorkflowResponse("Company customers deleted")
  }
)
