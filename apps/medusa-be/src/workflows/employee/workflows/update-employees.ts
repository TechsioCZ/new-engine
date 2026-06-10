import {
  createWorkflow,
  transform,
  type WorkflowData,
  WorkflowResponse,
  when,
} from "@medusajs/framework/workflows-sdk"
import type { ModuleUpdateEmployee, QueryEmployee } from "../../../types"
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
  ): WorkflowResponse<QueryEmployee> => {
    validateCompanyActiveStep(input.company_id)

    const previousEmployee = getEmployeeAdminStateStep({
      company_id: input.company_id,
      id: input.id,
    })
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
        email: adminRoleChange.email,
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
