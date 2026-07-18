import {
  createWorkflow,
  transform,
  type WorkflowData,
  WorkflowResponse,
  when,
} from "@medusajs/framework/workflows-sdk"

import type { ModuleEmployee, ModuleUpdateEmployee } from "../../../types"
import { validateCompanyActiveStep } from "../../company/steps"
import {
  getEmployeeAdminStateStep,
  removeAdminRoleStep,
  setAdminRoleStep,
  updateEmployeesStep,
} from "../steps"

export const updateEmployeesWorkflow = createWorkflow(
  "update-employees",
  (
    input: WorkflowData<ModuleUpdateEmployee>
  ): WorkflowResponse<ModuleEmployee> => {
    validateCompanyActiveStep(input.company_id)

    const previousEmployeeInput = transform({ input }, ({ input: data }) => {
      const stepInput: { company_id?: string; id: string } = { id: data.id }
      if (data.company_id !== undefined) {
        stepInput.company_id = data.company_id
      }
      return stepInput
    })
    const previousEmployee = getEmployeeAdminStateStep(previousEmployeeInput)
    const updateInput = transform(
      { input, previousEmployee },
      (updateData) => updateData.input
    )
    const updatedEmployee = updateEmployeesStep(updateInput)

    const adminRoleChange = transform(
      { previousEmployee, updatedEmployee },
      (roleData) => ({
        customerId: roleData.updatedEmployee.customer?.id ?? "",
        email: roleData.updatedEmployee.customer?.email ?? "",
        employeeId: roleData.updatedEmployee.id,
        shouldRemoveAdminRole:
          roleData.previousEmployee.is_admin &&
          !roleData.updatedEmployee.is_admin &&
          !!roleData.updatedEmployee.customer?.email,
        shouldSetAdminRole:
          !roleData.previousEmployee.is_admin &&
          roleData.updatedEmployee.is_admin &&
          !!roleData.updatedEmployee.customer?.id,
      })
    )

    when(
      adminRoleChange,
      ({ shouldRemoveAdminRole }) => shouldRemoveAdminRole
    ).then(() => {
      removeAdminRoleStep({
        customer_id: adminRoleChange.customerId,
        email: adminRoleChange.email,
        excluded_employee_ids: [adminRoleChange.employeeId],
      })
    })

    when(adminRoleChange, ({ shouldSetAdminRole }) => shouldSetAdminRole).then(
      () => {
        setAdminRoleStep({
          customerId: adminRoleChange.customerId,
          employeeId: updatedEmployee.id,
        })
      }
    )

    return new WorkflowResponse(updatedEmployee)
  }
)
