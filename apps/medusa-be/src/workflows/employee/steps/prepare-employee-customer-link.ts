import type { Link } from "@medusajs/framework/modules-sdk"
import type {
  IAuthModuleService,
  ICustomerModuleService,
  Query,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { z } from "@medusajs/framework/zod"

import { COMPANY_MODULE } from "../../../modules/company"
import type { ICompanyModuleService } from "../../../types"
import { getProviderIdentityIdsWithoutActiveAdminRole } from "../utils/admin-auth-metadata"

interface PrepareEmployeeCustomerLinkInput {
  company_id: string
  customer_id: string
}

const isNonEmptyOptionalString = (value: string | undefined): value is string =>
  value !== undefined && value.length > 0

const employeeCustomerLinkRowSchema = z.object({
  customer_id: z.string().optional(),
  employee_id: z.string().optional(),
  id: z.string().optional(),
})

interface EmployeeCustomerLinkCompensation {
  deleted_employees: {
    company_id: string
    customer_id: string
    id: string
    is_admin: boolean
    spending_limit: number
  }[]
  links: { customer_id: string; employee_id: string }[]
  provider_identity_ids: string[]
  restored_customer_groups: {
    customer_group_id: string
    customer_id: string
  }[]
}

const employeeWithCompanySchema = z.object({
  company: z
    .object({
      customer_group: z
        .object({ id: z.string().optional() })
        .nullable()
        .optional(),
      deleted_at: z.union([z.date(), z.string()]).nullable().optional(),
      id: z.string().optional(),
      name: z.string().optional(),
    })
    .nullable()
    .optional(),
  customer: z
    .object({
      email: z.string().nullable().optional(),
      id: z.string().optional(),
    })
    .nullable()
    .optional(),
  deleted_at: z.union([z.date(), z.string()]).nullable().optional(),
  id: z.string().min(1),
  is_admin: z.boolean().optional(),
  spending_limit: z.number().optional(),
})
const employeeCustomerLinksQuerySchema = z.object({
  data: z.array(employeeCustomerLinkRowSchema),
})
const employeesQuerySchema = z.object({
  data: z.array(employeeWithCompanySchema),
})

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
    { container },
  ): Promise<StepResponse<undefined, EmployeeCustomerLinkCompensation>> => {
    const link = container.resolve<Link>(ContainerRegistrationKeys.LINK)
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const companyModuleService =
      container.resolve<ICompanyModuleService>(COMPANY_MODULE)

    const existingLinksQueryResult: unknown = await query.graph({
      entity: EMPLOYEE_CUSTOMER_LINK_ENTRY_POINT,
      fields: ["id", "customer_id", "employee_id"],
      filters: {
        customer_id: input.customer_id,
      },
      withDeleted: true,
    })
    const existingLinks = employeeCustomerLinksQuerySchema.parse(
      existingLinksQueryResult,
    ).data
    const employeeIds = [
      ...new Set(
        existingLinks.flatMap((existingLink) => {
          const employeeId = existingLink.employee_id
          return employeeId === undefined || employeeId.length === 0
            ? []
            : [employeeId]
        }),
      ),
    ]

    if (employeeIds.length === 0) {
      return new StepResponse(undefined, {
        deleted_employees: [],
        links: [],
        provider_identity_ids: [],
        restored_customer_groups: [],
      })
    }

    const employeesQueryResult: unknown = await query.graph({
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
    const typedEmployees = employeesQuerySchema.parse(employeesQueryResult).data
    const staleEmployees = typedEmployees.filter((employee) => {
      const companyDeletedAt = employee.company?.deleted_at
      const companyId = employee.company?.id
      const companyIsDeleted =
        companyDeletedAt !== null && companyDeletedAt !== undefined
      const employeeIsDeleted =
        employee.deleted_at !== null && employee.deleted_at !== undefined

      return (
        companyIsDeleted ||
        (employeeIsDeleted && companyId !== input.company_id)
      )
    })
    const activeEmployee = typedEmployees.find((employee) => {
      const companyDeletedAt = employee.company?.deleted_at
      const companyIsActive =
        companyDeletedAt === null || companyDeletedAt === undefined
      const employeeIsActive =
        employee.deleted_at === null || employee.deleted_at === undefined
      return companyIsActive && employeeIsActive
    })

    if (activeEmployee !== undefined) {
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
      if (
        employee.company?.id === undefined ||
        employee.company.id.length === 0 ||
        employee.customer?.id === undefined ||
        employee.customer.id.length === 0
      ) {
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
    const staleEmployeeIdSet = new Set(staleEmployeeIds)
    const staleLinks = existingLinks.filter(
      (
        existingLink,
      ): existingLink is {
        customer_id: string
        employee_id: string
        id: string
      } => {
        if (
          !isNonEmptyOptionalString(existingLink.customer_id) ||
          !isNonEmptyOptionalString(existingLink.employee_id)
        ) {
          return false
        }
        if (!isNonEmptyOptionalString(existingLink.id)) {
          return false
        }
        return staleEmployeeIdSet.has(existingLink.employee_id)
      },
    )
    const staleCustomerGroups = staleEmployees.flatMap((employee) => {
      if (
        employee.customer?.id === undefined ||
        employee.customer.id.length === 0 ||
        employee.company?.customer_group?.id === undefined ||
        employee.company.customer_group.id.length === 0
      ) {
        return []
      }

      return [
        {
          customer_group_id: employee.company.customer_group.id,
          customer_id: employee.customer.id,
        },
      ]
    })
    const staleAdminCandidates = staleEmployees.flatMap((employee) =>
      employee.is_admin === true
        ? [
            {
              ...(employee.customer?.id === undefined
                ? {}
                : { customer_id: employee.customer.id }),
              ...(employee.customer?.email === undefined
                ? {}
                : { email: employee.customer.email }),
            },
          ]
        : [],
    )
    const providerIdentityIds =
      await getProviderIdentityIdsWithoutActiveAdminRole({
        candidates: staleAdminCandidates,
        excludedEmployeeIds: staleEmployeeIds,
        query,
      })

    await Promise.all(
      staleLinks.map(
        async (staleLink) =>
          await link.dismiss(
            getEmployeeCustomerLink(
              staleLink.employee_id,
              staleLink.customer_id,
            ),
          ),
      ),
    )

    if (staleCustomerGroups.length > 0) {
      const customerModuleService = container.resolve<ICustomerModuleService>(
        Modules.CUSTOMER,
      )

      await customerModuleService.removeCustomerFromGroup(staleCustomerGroups)
    }

    if (providerIdentityIds.length > 0) {
      const authModuleService = container.resolve<IAuthModuleService>(
        Modules.AUTH,
      )

      await authModuleService.updateProviderIdentities(
        providerIdentityIds.map((providerIdentityId) => ({
          id: providerIdentityId,
          user_metadata: {
            role: null,
          },
        })),
      )
    }

    if (staleEmployeeIds.length > 0) {
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
    { container },
  ) => {
    if (input === undefined) {
      return
    }

    const link = container.resolve<Link>(ContainerRegistrationKeys.LINK)
    const companyModuleService =
      container.resolve<ICompanyModuleService>(COMPANY_MODULE)
    const customerModuleService = container.resolve<ICustomerModuleService>(
      Modules.CUSTOMER,
    )

    if (input.deleted_employees.length > 0) {
      await companyModuleService.restoreEmployees(
        input.deleted_employees.map((employee) => employee.id),
      )
    }

    if (input.restored_customer_groups.length > 0) {
      await customerModuleService.addCustomerToGroup(
        input.restored_customer_groups,
      )
    }

    await Promise.all(
      input.links.map(
        async (existingLink) =>
          await link.create(
            getEmployeeCustomerLink(
              existingLink.employee_id,
              existingLink.customer_id,
            ),
          ),
      ),
    )

    if (input.provider_identity_ids.length > 0) {
      const authModuleService = container.resolve<IAuthModuleService>(
        Modules.AUTH,
      )

      await authModuleService.updateProviderIdentities(
        input.provider_identity_ids.map((providerIdentityId) => ({
          id: providerIdentityId,
          user_metadata: {
            role: "company_admin",
          },
        })),
      )
    }
  },
)
