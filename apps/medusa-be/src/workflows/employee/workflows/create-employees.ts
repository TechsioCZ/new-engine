import {
  createWorkflow,
  WorkflowResponse,
  when,
} from "@medusajs/framework/workflows-sdk"

import type { ModuleCreateEmployee, QueryGraphEmployee } from "../../../types"
import { validateCompanyActiveStep } from "../../company/steps"
import {
  createOrRestoreEmployeeStep,
  prepareEmployeeCustomerLinkStep,
  setAdminRoleStep,
} from "../steps"
import { addEmployeeToCustomerGroupStep } from "../steps/add-employee-to-customer-group"

interface WorkflowInput {
  employeeData: ModuleCreateEmployee
  customerId: string
}

export const createEmployeesWorkflow = createWorkflow(
  "create-employees",
  (input: WorkflowInput): WorkflowResponse<QueryGraphEmployee> => {
    validateCompanyActiveStep(input.employeeData.company_id)
    prepareEmployeeCustomerLinkStep({
      company_id: input.employeeData.company_id,
      customer_id: input.customerId,
    })

    const employee = createOrRestoreEmployeeStep(input.employeeData)

    when(input.employeeData, (employeeData) =>
      Boolean(employeeData.is_admin),
    ).then(() => {
      setAdminRoleStep({
        customerId: input.customerId,
        employeeId: employee.id,
      })
    })

    addEmployeeToCustomerGroupStep({
      customer_id: input.customerId,
      employee_id: employee.id,
    })

    return new WorkflowResponse(employee)
  },
)
