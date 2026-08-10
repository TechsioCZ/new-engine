import type { DeleteEntityInput, Link } from "@medusajs/framework/modules-sdk"
import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { omitUndefined } from "@techsio/std/object"

import { COMPANY_MODULE } from "../../../modules/company"
import type {
  ICompanyModuleService,
  ModuleCreateEmployee,
  QueryGraphEmployee,
} from "../../../types"

type EmployeeDeletionDate = Date | string | null

interface EmployeeCustomerLinkRow {
  customer_id?: string
  deleted_at?: EmployeeDeletionDate
  employee_id?: string
}

interface RestorableEmployee {
  company?: {
    deleted_at?: EmployeeDeletionDate
    id?: string
  } | null
  deleted_at?: EmployeeDeletionDate
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
    { container },
  ): Promise<
    StepResponse<QueryGraphEmployee, CreateOrRestoreEmployeeCompensation>
  > => {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const link = container.resolve<Link>(ContainerRegistrationKeys.LINK)
    const companyModuleService =
      container.resolve<ICompanyModuleService>(COMPANY_MODULE)

    const existingLinksResult: { data: EmployeeCustomerLinkRow[] } =
      await query.graph({
        entity: EMPLOYEE_CUSTOMER_LINK_ENTRY_POINT,
        fields: ["customer_id", "deleted_at", "employee_id"],
        filters: {
          customer_id: input.customer_id,
        },
        withDeleted: true,
      })
    const { data: existingLinks } = existingLinksResult
    const employeeIds = [
      ...new Set(
        existingLinks
          .map((existingLink) => existingLink.employee_id)
          .filter(
            (employeeId): employeeId is string =>
              employeeId !== undefined && employeeId !== "",
          ),
      ),
    ]

    const existingEmployeesResult: { data: RestorableEmployee[] } =
      employeeIds.length > 0
        ? await query.graph({
            entity: "employee",
            fields: [
              "id",
              "deleted_at",
              "is_admin",
              "spending_limit",
              "company.id",
              "company.deleted_at",
            ],
            filters: { id: employeeIds },
            withDeleted: true,
          })
        : { data: [] }
    const { data: existingEmployees } = existingEmployeesResult
    const activeOtherCompanyEmployee = existingEmployees.find(
      (existingEmployee) => {
        const employeeIsActive =
          existingEmployee.deleted_at === null ||
          existingEmployee.deleted_at === undefined
        const companyIsActive =
          existingEmployee.company?.deleted_at === null ||
          existingEmployee.company?.deleted_at === undefined
        return (
          employeeIsActive &&
          companyIsActive &&
          existingEmployee.company?.id !== input.company_id
        )
      },
    )
    const restorableEmployee = existingEmployees.find((existingEmployee) => {
      const employeeIsDeleted =
        existingEmployee.deleted_at !== null &&
        existingEmployee.deleted_at !== undefined
      return (
        activeOtherCompanyEmployee === undefined &&
        employeeIsDeleted &&
        existingEmployee.company?.id === input.company_id
      )
    })

    if (restorableEmployee !== undefined) {
      const restoredLinkInput = getEmployeeLinkDeleteInput(
        restorableEmployee.id,
      )

      await companyModuleService.restoreEmployees([restorableEmployee.id])
      await link.restore(restoredLinkInput)
      const updatedEmployee = await companyModuleService.updateEmployees(
        omitUndefined({
          id: restorableEmployee.id,
          is_admin: input.is_admin,
          spending_limit: input.spending_limit,
        }),
      )

      const restoredEmployeeResult: { data: QueryGraphEmployee[] } =
        await query.graph(
          {
            entity: "employee",
            fields: ["id", "company.*"],
            filters: { id: updatedEmployee.id },
          },
          { throwIfKeyNotFound: true },
        )
      const [restoredEmployee] = restoredEmployeeResult.data

      if (restoredEmployee === undefined) {
        throw new MedusaError(
          MedusaError.Types.NOT_FOUND,
          `Restored employee "${updatedEmployee.id}" was not found`,
        )
      }

      return new StepResponse(restoredEmployee, {
        action: "restored",
        employee_id: restorableEmployee.id,
        previous_is_admin: restorableEmployee.is_admin ?? false,
        previous_spending_limit: restorableEmployee.spending_limit ?? 0,
        restored_link_input: restoredLinkInput,
      })
    }

    const createdEmployee = await companyModuleService.createEmployees(input)

    await link.create(
      getEmployeeCustomerLink(createdEmployee.id, input.customer_id),
    )

    const createdEmployeeQueryResult: { data: QueryGraphEmployee[] } =
      await query.graph(
        {
          entity: "employee",
          fields: ["id", "company.*"],
          filters: { id: createdEmployee.id },
        },
        { throwIfKeyNotFound: true },
      )
    const [createdEmployeeResult] = createdEmployeeQueryResult.data

    if (createdEmployeeResult === undefined) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Created employee "${createdEmployee.id}" was not found`,
      )
    }

    return new StepResponse(createdEmployeeResult, {
      action: "created",
      customer_id: input.customer_id,
      employee_id: createdEmployeeResult.id,
    })
  },
  async (
    input: CreateOrRestoreEmployeeCompensation | undefined,
    { container },
  ) => {
    if (input === undefined) {
      return
    }

    const link = container.resolve<Link>(ContainerRegistrationKeys.LINK)
    const companyModuleService =
      container.resolve<ICompanyModuleService>(COMPANY_MODULE)

    if (input.action === "created") {
      await link.dismiss(
        getEmployeeCustomerLink(input.employee_id, input.customer_id),
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
  },
)
