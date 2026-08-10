import type {
  IAuthModuleService,
  ProviderIdentityDTO,
  Query,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import type { QueryCompanyProjection } from "../../../types/company/query"
import { getProviderIdentityIdsWithoutActiveAdminRole } from "../../employee/utils/admin-auth-metadata"

interface RestoreCompanyAdminAuthMetadataCompensation {
  admin_candidates: {
    customer_id: string | null | undefined
    email: string | null | undefined
  }[]
  company_ids: string[]
  provider_identity_ids: string[]
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
    const companyResult: { data: QueryCompanyProjection[] } = await query.graph(
      {
        entity: "company",
        fields: [
          "id",
          "employees.deleted_at",
          "employees.is_admin",
          "employees.customer.email",
          "employees.customer.id",
        ],
        filters: { id: companyIds },
      },
    )
    const companyData = companyResult.data

    const adminCandidates: RestoreCompanyAdminAuthMetadataCompensation["admin_candidates"] =
      []
    for (const company of companyData) {
      for (const employee of company.employees ?? []) {
        if (
          employee?.is_admin === true &&
          (employee?.deleted_at === undefined || employee.deleted_at === null)
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
    let providerIdentityData: Pick<ProviderIdentityDTO, "id">[] = []
    if (adminEmails.length > 0) {
      const providerIdentityResult: {
        data: Pick<ProviderIdentityDTO, "id">[]
      } = await query.graph({
        entity: "provider_identity",
        fields: ["id"],
        filters: {
          entity_id: adminEmails,
          provider: "emailpass",
        },
      })
      providerIdentityData = providerIdentityResult.data
    }
    const providerIdentityIds = providerIdentityData.map(
      (providerIdentity) => providerIdentity.id,
    )

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
