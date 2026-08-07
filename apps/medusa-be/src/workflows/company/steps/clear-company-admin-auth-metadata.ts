import type { IAuthModuleService, Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { isRecord } from "@techsio/std/object"

import { getProviderIdentityIdsWithoutActiveAdminRole } from "../../employee/utils/admin-auth-metadata"

interface CompanyEmployee {
  customer?: {
    email?: string | null
    id?: string | null
  } | null
  is_admin?: boolean
}

interface CompanyWithEmployees {
  employees: CompanyEmployee[]
}

const isOptionalNullableString = (value: unknown) =>
  value === undefined || value === null || typeof value === "string"

const isOptionalCustomer = (value: unknown): boolean => {
  if (value === undefined || value === null) {
    return true
  }
  if (!isRecord(value)) {
    return false
  }
  return (
    isOptionalNullableString(value["email"]) &&
    isOptionalNullableString(value["id"])
  )
}

const isCompanyEmployee = (value: unknown): value is CompanyEmployee => {
  if (!isRecord(value) || !isOptionalCustomer(value["customer"])) {
    return false
  }

  const isAdmin = value["is_admin"]
  return isAdmin === undefined || typeof isAdmin === "boolean"
}

const parseCompany = (value: unknown): CompanyWithEmployees => {
  if (!isRecord(value)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Company query returned invalid company data.",
    )
  }

  const { employees } = value
  if (employees === undefined || employees === null) {
    return { employees: [] }
  }
  if (
    !Array.isArray(employees) ||
    employees.some(
      (employee) => employee !== null && !isCompanyEmployee(employee),
    )
  ) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Company query returned invalid employee data.",
    )
  }

  return { employees: employees.filter(isCompanyEmployee) }
}

const parseCompanies = (value: unknown): CompanyWithEmployees[] => {
  if (!isRecord(value) || !Array.isArray(value["data"])) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Company query returned an invalid response.",
    )
  }

  return value["data"].map(parseCompany)
}

export const clearCompanyAdminAuthMetadataStep = createStep(
  "clear-company-admin-auth-metadata",
  async (
    companyIds: string[],
    { container },
  ): Promise<StepResponse<undefined, string[]>> => {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const companiesResult: unknown = await query.graph({
      entity: "company",
      fields: [
        "id",
        "employees.is_admin",
        "employees.customer.email",
        "employees.customer.id",
      ],
      filters: { id: companyIds },
    })
    const companies = parseCompanies(companiesResult)
    const adminCandidates = companies.flatMap((company) =>
      company.employees.flatMap((employee) =>
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
      ),
    )
    const providerIdentityIds =
      await getProviderIdentityIdsWithoutActiveAdminRole({
        candidates: adminCandidates,
        excludedCompanyIds: companyIds,
        query,
      })

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

    return new StepResponse(undefined, providerIdentityIds)
  },
  async (providerIdentityIds: string[] | undefined, { container }) => {
    if (providerIdentityIds === undefined || providerIdentityIds.length === 0) {
      return
    }

    const authModuleService = container.resolve<IAuthModuleService>(
      Modules.AUTH,
    )

    await authModuleService.updateProviderIdentities(
      providerIdentityIds.map((providerIdentityId) => ({
        id: providerIdentityId,
        user_metadata: {
          role: "company_admin",
        },
      })),
    )
  },
)
