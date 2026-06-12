import type { IAuthModuleService } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { getProviderIdentityIdsWithoutActiveAdminRole } from "../../employee/utils/admin-auth-metadata"

type CompanyWithEmployees = {
  employees?: Array<{
    customer?: {
      email?: string | null
      id?: string | null
    } | null
    deleted_at?: Date | string | null
    is_admin?: boolean
  }>
}

type RestoreCompanyAdminAuthMetadataCompensation = {
  admin_candidates: Array<{
    customer_id?: string | null
    email?: string | null
  }>
  company_ids: string[]
  provider_identity_ids: string[]
}

type ProviderIdentity = {
  id?: string
}

export const restoreCompanyAdminAuthMetadataStep = createStep(
  "restore-company-admin-auth-metadata",
  async (
    companyIds: string[],
    { container }
  ): Promise<
    StepResponse<undefined, RestoreCompanyAdminAuthMetadataCompensation>
  > => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: companies } = (await query.graph({
      entity: "company",
      fields: [
        "id",
        "employees.deleted_at",
        "employees.is_admin",
        "employees.customer.email",
        "employees.customer.id",
      ],
      filters: { id: companyIds },
    })) as { data: CompanyWithEmployees[] }
    const adminCandidates = companies
      .flatMap((company) => company.employees ?? [])
      .filter((employee) => employee.is_admin && !employee.deleted_at)
      .map((employee) => ({
        customer_id: employee.customer?.id,
        email: employee.customer?.email,
      }))
    const adminEmails = [
      ...new Set(
        adminCandidates
          .map((candidate) => candidate.email)
          .filter((email): email is string => Boolean(email))
      ),
    ]
    const { data: providerIdentities }: { data: ProviderIdentity[] } =
      adminEmails.length
        ? await query.graph({
            entity: "provider_identity",
            fields: ["id"],
            filters: {
              entity_id: adminEmails,
              provider: "emailpass",
            },
          })
        : { data: [] }
    const providerIdentityIds = providerIdentities
      .map((providerIdentity) => providerIdentity.id)
      .filter((providerIdentityId): providerIdentityId is string =>
        Boolean(providerIdentityId)
      )

    if (providerIdentityIds.length) {
      const authModuleService = container.resolve<IAuthModuleService>(
        Modules.AUTH
      )

      await authModuleService.updateProviderIdentities(
        providerIdentityIds.map((providerIdentityId) => ({
          id: providerIdentityId,
          user_metadata: {
            role: "company_admin",
          },
        }))
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
    { container }
  ) => {
    if (!input?.provider_identity_ids.length) {
      return
    }

    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const providerIdentityIds =
      await getProviderIdentityIdsWithoutActiveAdminRole({
        candidates: input.admin_candidates,
        excludedCompanyIds: input.company_ids,
        query,
      })
    const providerIdentityIdSet = new Set(providerIdentityIds)
    const providerIdentityIdsToClear = input.provider_identity_ids.filter(
      (providerIdentityId) => providerIdentityIdSet.has(providerIdentityId)
    )

    if (!providerIdentityIdsToClear.length) {
      return
    }

    const authModuleService = container.resolve<IAuthModuleService>(
      Modules.AUTH
    )

    await authModuleService.updateProviderIdentities(
      providerIdentityIdsToClear.map((providerIdentityId) => ({
        id: providerIdentityId,
        user_metadata: {
          role: null,
        },
      }))
    )
  }
)
