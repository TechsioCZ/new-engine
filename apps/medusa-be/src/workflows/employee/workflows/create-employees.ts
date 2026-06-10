import { Modules } from "@medusajs/framework/utils"
import {
  createWorkflow,
  WorkflowResponse,
  when,
} from "@medusajs/framework/workflows-sdk"
import { createRemoteLinkStep } from "@medusajs/medusa/core-flows"
import { COMPANY_MODULE } from "../../../modules/company"
import type { ModuleCreateEmployee, ModuleEmployee } from "../../../types"
import { validateCompanyActiveStep } from "../../company/steps"
import {
  createEmployeesStep,
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

    const employee = createEmployeesStep(input.employeeData)

    createRemoteLinkStep([
      {
        [COMPANY_MODULE]: {
          employee_id: employee.id,
        },
        [Modules.CUSTOMER]: {
          customer_id: input.customerId,
        },
      },
    ])

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
