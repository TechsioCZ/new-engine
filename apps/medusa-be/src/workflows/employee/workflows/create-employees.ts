import {
  createWorkflow,
  WorkflowResponse,
  when,
} from "@medusajs/framework/workflows-sdk"

import type { ModuleCreateEmployee, QueryGraphEmployee } from "../../../types"
import { validateCompanyActiveStep } from "../../company/steps/validate-company-active"
import { addEmployeeToCustomerGroupStep } from "../steps/add-employee-to-customer-group"
import { createOrRestoreEmployeeStep } from "../steps/create-or-restore-employee"
import { prepareEmployeeCustomerLinkStep } from "../steps/prepare-employee-customer-link"
import { setAdminRoleStep } from "../steps/set-admin-role"

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

    const { then: setAdminRoleWhenRequested } = when(
      input.employeeData,
      (employeeData) => employeeData.is_admin === true,
    )
    setAdminRoleWhenRequested(() => {
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
