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
  deleted_at?: Date | string | null
  is_admin?: boolean
}

interface CompanyWithEmployees {
  employees?: CompanyEmployee[]
}

interface RestoreCompanyAdminAuthMetadataCompensation {
  admin_candidates: {
    customer_id: string | null | undefined
    email: string | null | undefined
  }[]
  company_ids: string[]
  provider_identity_ids: string[]
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

const isOptionalDeletedAt = (value: unknown): boolean => {
  if (value === undefined || value === null) {
    return true
  }
  return typeof value === "string" || value instanceof Date
}

const isCompanyEmployee = (value: unknown): value is CompanyEmployee => {
  if (!isRecord(value)) {
    return false
  }

  const { customer, deleted_at: deletedAt, is_admin: isAdmin } = value
  if (!isOptionalCustomer(customer) || !isOptionalDeletedAt(deletedAt)) {
    return false
  }
  return isAdmin === undefined || typeof isAdmin === "boolean"
}

const isCompanyWithEmployees = (
  value: unknown,
): value is CompanyWithEmployees => {
  if (!isRecord(value)) {
    return false
  }
  const { employees } = value
  return (
    employees === undefined ||
    (Array.isArray(employees) && employees.every(isCompanyEmployee))
  )
}

const getGraphData = (value: unknown, context: string): unknown[] => {
  if (!isRecord(value) || !Array.isArray(value["data"])) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `${context} returned an invalid response.`,
    )
  }
  return value["data"]
}

export const restoreCompanyAdminAuthMetadataStep = createStep(
  "restore-company-admin-auth-metadata",
  async (
    companyIds: string[],
    { container },
  ): Promise<
    StepResponse<undefined, RestoreCompanyAdminAuthMetadataCompensation>
  > => {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const companyResult: unknown = await query.graph({
      entity: "company",
      fields: [
        "id",
        "employees.deleted_at",
        "employees.is_admin",
        "employees.customer.email",
        "employees.customer.id",
      ],
      filters: { id: companyIds },
    })
    const companyData = getGraphData(companyResult, "Company query")
    if (!companyData.every(isCompanyWithEmployees)) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Company query returned invalid employee data.",
      )
    }

    const adminCandidates: RestoreCompanyAdminAuthMetadataCompensation["admin_candidates"] =
      []
    for (const company of companyData) {
      for (const employee of company.employees ?? []) {
        if (
          employee.is_admin === true &&
          (employee.deleted_at === undefined || employee.deleted_at === null)
        ) {
          adminCandidates.push({
            customer_id: employee.customer?.id,
            email: employee.customer?.email,
          })
        }
      }
    }

    const adminEmails = [
      ...new Set(
        adminCandidates
          .map((candidate) => candidate.email)
          .filter(
            (email): email is string =>
              typeof email === "string" && email.length > 0,
          ),
      ),
    ]
    let providerIdentityData: unknown[] = []
    if (adminEmails.length > 0) {
      const providerIdentityResult: unknown = await query.graph({
        entity: "provider_identity",
        fields: ["id"],
        filters: {
          entity_id: adminEmails,
          provider: "emailpass",
        },
      })
      providerIdentityData = getGraphData(
        providerIdentityResult,
        "Provider identity query",
      )
    }
    const providerIdentityIds = providerIdentityData.map((value) => {
      if (!isRecord(value) || typeof value["id"] !== "string") {
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          "Provider identity query returned an invalid record.",
        )
      }
      return value["id"]
    })

    if (providerIdentityIds.length > 0) {
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
    }

    return new StepResponse(undefined, {
      admin_candidates: adminCandidates,
      company_ids: companyIds,
      provider_identity_ids: providerIdentityIds,
    })
  },
  async (
    input: RestoreCompanyAdminAuthMetadataCompensation | undefined,
    { container },
  ) => {
    if (input === undefined || input.provider_identity_ids.length === 0) {
      return
    }

    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const providerIdentityIds =
      await getProviderIdentityIdsWithoutActiveAdminRole({
        candidates: input.admin_candidates,
        excludedCompanyIds: input.company_ids,
        query,
      })
    const providerIdentityIdSet = new Set(providerIdentityIds)
    const providerIdentityIdsToClear = input.provider_identity_ids.filter(
      (providerIdentityId) => providerIdentityIdSet.has(providerIdentityId),
    )

    if (providerIdentityIdsToClear.length === 0) {
      return
    }

    const authModuleService = container.resolve<IAuthModuleService>(
      Modules.AUTH,
    )

    await authModuleService.updateProviderIdentities(
      providerIdentityIdsToClear.map((providerIdentityId) => ({
        id: providerIdentityId,
        user_metadata: {
          role: null,
        },
      })),
    )
  },
)
