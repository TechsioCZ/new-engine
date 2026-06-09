import type { Link } from "@medusajs/framework/modules-sdk"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { COMPANY_MODULE } from "../../../modules/company"
import type { ICompanyModuleService } from "../../../types"

type PrepareEmployeeCustomerLinkInput = {
  company_id: string
  customer_id: string
}

type EmployeeCustomerLinkRow = {
  customer_id?: string
  employee_id?: string
}

type EmployeeCustomerLinkCompensation = {
  links: Array<{ customer_id: string; employee_id: string }>
  soft_deleted_employee_ids: string[]
}

type EmployeeWithCompany = {
  company?: {
    deleted_at?: Date | null
    id?: string
    name?: string
  } | null
  id: string
}

const getEmployeeCustomerLink = (employeeId: string, customerId: string) => ({
  [COMPANY_MODULE]: {
    employee_id: employeeId,
  },
  [Modules.CUSTOMER]: {
    customer_id: customerId,
  },
})

const getCustomerEmployeeLinkFilter = (customerId: string) => ({
  [COMPANY_MODULE]: {},
  [Modules.CUSTOMER]: {
    customer_id: customerId,
  },
})

export const prepareEmployeeCustomerLinkStep = createStep(
  "prepare-employee-customer-link",
  async (
    input: PrepareEmployeeCustomerLinkInput,
    { container }
  ): Promise<StepResponse<undefined, EmployeeCustomerLinkCompensation>> => {
    const link = container.resolve<Link>(ContainerRegistrationKeys.LINK)
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const companyModuleService =
      container.resolve<ICompanyModuleService>(COMPANY_MODULE)

    const existingLinks = (await link.list(
      getCustomerEmployeeLinkFilter(input.customer_id)
    )) as EmployeeCustomerLinkRow[]
    const employeeIds = [
      ...new Set(
        existingLinks
          .map((existingLink) => existingLink.employee_id)
          .filter((employeeId): employeeId is string => Boolean(employeeId))
      ),
    ]

    if (!employeeIds.length) {
      return new StepResponse(undefined, {
        links: [],
        soft_deleted_employee_ids: [],
      })
    }

    const { data: employees } = await query.graph({
      entity: "employee",
      fields: ["id", "company.*"],
      filters: { id: employeeIds },
      withDeleted: true,
    })
    const typedEmployees = employees as EmployeeWithCompany[]
    const activeEmployee = typedEmployees.find(
      (employee) => !employee.company?.deleted_at
    )

    if (activeEmployee) {
      const companyName =
        activeEmployee.company?.name ?? activeEmployee.company?.id
      const message =
        activeEmployee.company?.id === input.company_id
          ? "Customer is already an employee of this company."
          : `Customer is already an employee of active company "${companyName}".`

      throw new MedusaError(MedusaError.Types.INVALID_DATA, message)
    }

    const staleEmployeeIds = typedEmployees
      .filter((employee) => employee.company?.deleted_at)
      .map((employee) => employee.id)
    const staleLinks = existingLinks
      .filter(
        (
          existingLink
        ): existingLink is { customer_id: string; employee_id: string } =>
          Boolean(existingLink.customer_id && existingLink.employee_id)
      )
      .filter((existingLink) =>
        staleEmployeeIds.includes(existingLink.employee_id)
      )

    await Promise.all(
      staleLinks.map((staleLink) =>
        link.dismiss(
          getEmployeeCustomerLink(staleLink.employee_id, staleLink.customer_id)
        )
      )
    )

    if (staleEmployeeIds.length) {
      await companyModuleService.softDeleteEmployees(staleEmployeeIds)
    }

    return new StepResponse(undefined, {
      links: staleLinks,
      soft_deleted_employee_ids: staleEmployeeIds,
    })
  },
  async (
    input: EmployeeCustomerLinkCompensation | undefined,
    { container }
  ) => {
    if (!input) {
      return
    }

    const link = container.resolve<Link>(ContainerRegistrationKeys.LINK)
    const companyModuleService =
      container.resolve<ICompanyModuleService>(COMPANY_MODULE)

    if (input.soft_deleted_employee_ids.length) {
      await companyModuleService.restoreEmployees(
        input.soft_deleted_employee_ids
      )
    }

    await Promise.all(
      input.links.map((existingLink) =>
        link.create(
          getEmployeeCustomerLink(
            existingLink.employee_id,
            existingLink.customer_id
          )
        )
      )
    )
  }
)
