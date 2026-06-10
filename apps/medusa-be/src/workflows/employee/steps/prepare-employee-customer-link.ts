import type { Link } from "@medusajs/framework/modules-sdk"
import type {
  IAuthModuleService,
  ICustomerModuleService,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { COMPANY_MODULE } from "../../../modules/company"
import type { ICompanyModuleService } from "../../../types"
import { getProviderIdentityIdsWithoutActiveAdminRole } from "../utils/admin-auth-metadata"

type PrepareEmployeeCustomerLinkInput = {
  company_id: string
  customer_id: string
}

type EmployeeCustomerLinkRow = {
  customer_id?: string
  employee_id?: string
}

type EmployeeCustomerLinkCompensation = {
  deleted_employees: Array<{
    company_id: string
    customer_id: string
    id: string
    is_admin: boolean
    spending_limit: number
  }>
  links: Array<{ customer_id: string; employee_id: string }>
  provider_identity_ids: string[]
  restored_customer_groups: Array<{
    customer_group_id: string
    customer_id: string
  }>
}

type EmployeeWithCompany = {
  company?: {
    customer_group?: { id?: string } | null
    deleted_at?: Date | null
    id?: string
    name?: string
  } | null
  customer?: {
    email?: string | null
    id?: string
  } | null
  deleted_at?: Date | null
  id: string
  is_admin?: boolean
  spending_limit?: number
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

    const { data: existingLinks } = (await query.graph({
      entity: EMPLOYEE_CUSTOMER_LINK_ENTRY_POINT,
      fields: ["customer_id", "employee_id"],
      filters: {
        customer_id: input.customer_id,
      },
    })) as { data: EmployeeCustomerLinkRow[] }
    const employeeIds = [
      ...new Set(
        existingLinks
          .map((existingLink) => existingLink.employee_id)
          .filter((employeeId): employeeId is string => Boolean(employeeId))
      ),
    ]

    if (!employeeIds.length) {
      return new StepResponse(undefined, {
        deleted_employees: [],
        links: [],
        provider_identity_ids: [],
        restored_customer_groups: [],
      })
    }

    const { data: employees } = await query.graph({
      entity: "employee",
      fields: [
        "id",
        "deleted_at",
        "is_admin",
        "spending_limit",
        "company.*",
        "company.customer_group.*",
        "customer.email",
        "customer.id",
      ],
      filters: { id: employeeIds },
      withDeleted: true,
    })
    const typedEmployees = employees as EmployeeWithCompany[]
    const staleEmployees = typedEmployees.filter(
      (employee) =>
        employee.company?.deleted_at ||
        (employee.deleted_at && employee.company?.id !== input.company_id)
    )
    const activeEmployee = typedEmployees.find(
      (employee) => !(employee.deleted_at || employee.company?.deleted_at)
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

    const staleEmployeeIds = staleEmployees.map((employee) => employee.id)
    const deletedEmployees = staleEmployees.flatMap((employee) => {
      if (!(employee.company?.id && employee.customer?.id)) {
        return []
      }

      return [
        {
          company_id: employee.company.id,
          customer_id: employee.customer.id,
          id: employee.id,
          is_admin: employee.is_admin ?? false,
          spending_limit: employee.spending_limit ?? 0,
        },
      ]
    })
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
    const staleCustomerGroups = staleEmployees.flatMap((employee) => {
      if (!(employee.customer?.id && employee.company?.customer_group?.id)) {
        return []
      }

      return [
        {
          customer_group_id: employee.company.customer_group.id,
          customer_id: employee.customer.id,
        },
      ]
    })
    const staleAdminCandidates = staleEmployees
      .filter((employee) => employee.is_admin)
      .map((employee) => ({
        customer_id: employee.customer?.id,
        email: employee.customer?.email,
      }))
    const providerIdentityIds =
      await getProviderIdentityIdsWithoutActiveAdminRole({
        candidates: staleAdminCandidates,
        excludedEmployeeIds: staleEmployeeIds,
        query,
      })

    await Promise.all(
      staleLinks.map((staleLink) =>
        link.dismiss(
          getEmployeeCustomerLink(staleLink.employee_id, staleLink.customer_id)
        )
      )
    )

    if (staleCustomerGroups.length) {
      const customerModuleService = container.resolve<ICustomerModuleService>(
        Modules.CUSTOMER
      )

      await customerModuleService.removeCustomerFromGroup(staleCustomerGroups)
    }

    if (providerIdentityIds.length) {
      const authModuleService = container.resolve<IAuthModuleService>(
        Modules.AUTH
      )

      await authModuleService.updateProviderIdentities(
        providerIdentityIds.map((providerIdentityId) => ({
          id: providerIdentityId,
          user_metadata: {
            role: null,
          },
        }))
      )
    }

    if (staleEmployeeIds.length) {
      await companyModuleService.softDeleteEmployees(staleEmployeeIds)
    }

    return new StepResponse(undefined, {
      deleted_employees: deletedEmployees,
      links: staleLinks,
      provider_identity_ids: providerIdentityIds,
      restored_customer_groups: staleCustomerGroups,
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
    const customerModuleService = container.resolve<ICustomerModuleService>(
      Modules.CUSTOMER
    )

    if (input.deleted_employees.length) {
      await companyModuleService.restoreEmployees(
        input.deleted_employees.map((employee) => employee.id)
      )
    }

    if (input.restored_customer_groups.length) {
      await customerModuleService.addCustomerToGroup(
        input.restored_customer_groups
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

    if (input.provider_identity_ids.length) {
      const authModuleService = container.resolve<IAuthModuleService>(
        Modules.AUTH
      )

      await authModuleService.updateProviderIdentities(
        input.provider_identity_ids.map((providerIdentityId) => ({
          id: providerIdentityId,
          user_metadata: {
            role: "company_admin",
          },
        }))
      )
    }
  }
)
