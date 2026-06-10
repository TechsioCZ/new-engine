import type { DeleteEntityInput, Link } from "@medusajs/framework/modules-sdk"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { COMPANY_MODULE } from "../../../modules/company"
import type {
  ICompanyModuleService,
  ModuleCreateEmployee,
  ModuleEmployee,
} from "../../../types"

type EmployeeCustomerLinkRow = {
  customer_id?: string
  deleted_at?: Date | string | null
  employee_id?: string
}

type RestorableEmployee = {
  company?: { id?: string } | null
  deleted_at?: Date | string | null
  id: string
  is_admin?: boolean
  spending_limit?: number
}

type CreateOrRestoreEmployeeCompensation =
  | {
      action: "created"
      customer_id: string
      employee_id: string
    }
  | {
      action: "restored"
      employee_id: string
      previous_is_admin: boolean
      previous_spending_limit: number
      restored_link_input: DeleteEntityInput
    }

const EMPLOYEE_CUSTOMER_LINK_ENTRY_POINT = "employee_customer"

const getEmployeeCustomerLink = (employeeId: string, customerId: string) => ({
  [COMPANY_MODULE]: {
    employee_id: employeeId,
  },
  [Modules.CUSTOMER]: {
    customer_id: customerId,
  },
})

const getEmployeeLinkDeleteInput = (employeeId: string): DeleteEntityInput => ({
  [COMPANY_MODULE]: {
    employee_id: [employeeId],
  },
})

export const createOrRestoreEmployeeStep = createStep(
  "create-or-restore-employee",
  async (
    input: ModuleCreateEmployee,
    { container }
  ): Promise<
    StepResponse<ModuleEmployee, CreateOrRestoreEmployeeCompensation>
  > => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const link = container.resolve<Link>(ContainerRegistrationKeys.LINK)
    const companyModuleService =
      container.resolve<ICompanyModuleService>(COMPANY_MODULE)

    const { data: existingLinks } = (await query.graph({
      entity: EMPLOYEE_CUSTOMER_LINK_ENTRY_POINT,
      fields: ["customer_id", "deleted_at", "employee_id"],
      filters: {
        customer_id: input.customer_id,
      },
      withDeleted: true,
    })) as { data: EmployeeCustomerLinkRow[] }
    const employeeIds = [
      ...new Set(
        existingLinks
          .map((existingLink) => existingLink.employee_id)
          .filter((employeeId): employeeId is string => Boolean(employeeId))
      ),
    ]

    const { data: existingEmployees } = employeeIds.length
      ? ((await query.graph({
          entity: "employee",
          fields: [
            "id",
            "deleted_at",
            "is_admin",
            "spending_limit",
            "company.id",
          ],
          filters: { id: employeeIds },
          withDeleted: true,
        })) as { data: RestorableEmployee[] })
      : { data: [] }
    const restorableEmployee = existingEmployees.find(
      (existingEmployee) =>
        existingEmployee.deleted_at &&
        existingEmployee.company?.id === input.company_id
    )

    if (restorableEmployee) {
      const restoredLinkInput = getEmployeeLinkDeleteInput(
        restorableEmployee.id
      )

      await companyModuleService.restoreEmployees([restorableEmployee.id])
      await link.restore(restoredLinkInput)
      const updatedEmployee = await companyModuleService.updateEmployees({
        id: restorableEmployee.id,
        is_admin: input.is_admin,
        spending_limit: input.spending_limit,
      })

      const {
        data: [restoredEmployee],
      } = await query.graph(
        {
          entity: "employee",
          fields: ["id", "company.*"],
          filters: { id: updatedEmployee.id },
        },
        { throwIfKeyNotFound: true }
      )

      return new StepResponse(restoredEmployee as unknown as ModuleEmployee, {
        action: "restored",
        employee_id: restorableEmployee.id,
        previous_is_admin: restorableEmployee.is_admin ?? false,
        previous_spending_limit: restorableEmployee.spending_limit ?? 0,
        restored_link_input: restoredLinkInput,
      })
    }

    const createdEmployee = await companyModuleService.createEmployees(input)

    await link.create(
      getEmployeeCustomerLink(createdEmployee.id, input.customer_id)
    )

    const {
      data: [createdEmployeeResult],
    } = await query.graph(
      {
        entity: "employee",
        filters: { id: createdEmployee.id },
        fields: ["id", "company.*"],
      },
      { throwIfKeyNotFound: true }
    )

    return new StepResponse(
      createdEmployeeResult as unknown as ModuleEmployee,
      {
        action: "created",
        customer_id: input.customer_id,
        employee_id: createdEmployeeResult.id,
      }
    )
  },
  async (
    input: CreateOrRestoreEmployeeCompensation | undefined,
    { container }
  ) => {
    if (!input) {
      return
    }

    const link = container.resolve<Link>(ContainerRegistrationKeys.LINK)
    const companyModuleService =
      container.resolve<ICompanyModuleService>(COMPANY_MODULE)

    if (input.action === "created") {
      await link.dismiss(
        getEmployeeCustomerLink(input.employee_id, input.customer_id)
      )
      await companyModuleService.deleteEmployees([input.employee_id])
      return
    }

    await companyModuleService.updateEmployees({
      id: input.employee_id,
      is_admin: input.previous_is_admin,
      spending_limit: input.previous_spending_limit,
    })
    await link.delete(input.restored_link_input)
    await companyModuleService.softDeleteEmployees([input.employee_id])
  }
)
