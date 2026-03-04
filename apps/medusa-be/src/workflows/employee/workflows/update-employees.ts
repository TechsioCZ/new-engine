/* istanbul ignore file */
import { when } from "@medusajs/framework/workflows-sdk"
import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import type { ModuleUpdateEmployee, QueryEmployee } from "../../../types"
import { removeAdminRoleStep, updateEmployeesStep } from "../steps"

export const updateEmployeesWorkflow = createWorkflow(
  "update-employees",
  (input: ModuleUpdateEmployee): WorkflowResponse<QueryEmployee> => {
    const updatedEmployee = updateEmployeesStep(input)

    when(updatedEmployee, ({ is_admin }) => is_admin === false).then(() => {
      removeAdminRoleStep({
        email: updatedEmployee.customer.email,
      })
    })

    return new WorkflowResponse(updatedEmployee)
  }
)
