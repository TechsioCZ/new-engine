import {
  createWorkflow,
  WorkflowResponse,
  when,
} from "@medusajs/framework/workflows-sdk"
import type { ModuleCreateEmployee, ModuleEmployee } from "../../../types"
import { validateCompanyActiveStep } from "../../company/steps"
import {
  createOrRestoreEmployeeStep,
  prepareEmployeeCustomerLinkStep,
  setAdminRoleStep,
} from "../steps"
import { addEmployeeToCustomerGroupStep } from "../steps/add-employee-to-customer-group"

type WorkflowInput = {
  employeeData: ModuleCreateEmployee
  customerId: string
}

export const createEmployeesWorkflow = createWorkflow(
  "create-employees",
  (input: WorkflowInput): WorkflowResponse<ModuleEmployee> => {
    validateCompanyActiveStep(input.employeeData.company_id)
    prepareEmployeeCustomerLinkStep({
      company_id: input.employeeData.company_id,
      customer_id: input.customerId,
    })

    const employee = createOrRestoreEmployeeStep(input.employeeData)

    when(input.employeeData, (employeeData) => employeeData.is_admin).then(
      () => {
        setAdminRoleStep({
          employeeId: employee.id,
          customerId: input.customerId,
        })
      }
    )

    addEmployeeToCustomerGroupStep({
      customer_id: input.customerId,
      employee_id: employee.id,
    })

    return new WorkflowResponse(employee)
  }
)
