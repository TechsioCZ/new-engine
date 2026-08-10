import {
  createWorkflow,
  transform,
  WorkflowResponse,
  when,
} from "@medusajs/framework/workflows-sdk"
import type { WorkflowData } from "@medusajs/framework/workflows-sdk"

import type { ModuleUpdateEmployee, QueryGraphEmployee } from "../../../types"
import { validateCompanyActiveStep } from "../../company/steps/validate-company-active"
import { getEmployeeAdminStateStep } from "../steps/get-employee-admin-state"
import { removeAdminRoleStep } from "../steps/remove-admin-role"
import { setAdminRoleStep } from "../steps/set-admin-role"
import { updateEmployeesStep } from "../steps/update-employees"

export const updateEmployeesWorkflow = createWorkflow(
  "update-employees",
  (
    input: WorkflowData<ModuleUpdateEmployee>,
  ): WorkflowResponse<QueryGraphEmployee> => {
    validateCompanyActiveStep(input.company_id)

    const previousEmployee = getEmployeeAdminStateStep({
      company_id: input.company_id,
      id: input.id,
    })
    const updateInput = transform(
      { input, previousEmployee },
      (updateData) => updateData.input,
    )
    const updatedEmployee = updateEmployeesStep(updateInput)

    const adminRoleChange = transform(
      { previousEmployee, updatedEmployee },
      (roleData) => {
        const customerId = roleData.updatedEmployee.customer?.id ?? ""
        const customerEmail = roleData.updatedEmployee.customer?.email ?? ""
        return {
          customerId,
          email: customerEmail,
          employeeId: roleData.updatedEmployee.id,
          shouldRemoveAdminRole:
            roleData.previousEmployee.is_admin &&
            !roleData.updatedEmployee.is_admin &&
            customerEmail.length > 0,
          shouldSetAdminRole:
            !roleData.previousEmployee.is_admin &&
            roleData.updatedEmployee.is_admin &&
            customerId.length > 0,
        }
      },
    )

    const { then: removeAdminRoleWhenRequired } = when(
      adminRoleChange,
      ({ shouldRemoveAdminRole }) => shouldRemoveAdminRole,
    )
    removeAdminRoleWhenRequired(() => {
      removeAdminRoleStep({
        customer_id: adminRoleChange.customerId,
        email: adminRoleChange.email,
        excluded_employee_ids: [adminRoleChange.employeeId],
      })
    })

    const { then: setAdminRoleWhenRequired } = when(
      adminRoleChange,
      ({ shouldSetAdminRole }) => shouldSetAdminRole,
    )
    setAdminRoleWhenRequired(() => {
      setAdminRoleStep({
        customerId: adminRoleChange.customerId,
        employeeId: updatedEmployee.id,
      })
    })

    return new WorkflowResponse(updatedEmployee)
  },
)
