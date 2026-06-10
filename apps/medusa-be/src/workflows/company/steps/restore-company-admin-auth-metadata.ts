import type { IAuthModuleService } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

type CompanyWithEmployees = {
  employees?: Array<{
    customer?: {
      email?: string | null
    } | null
    deleted_at?: Date | string | null
    is_admin?: boolean
  }>
}

type ProviderIdentity = {
  id?: string
}

export const restoreCompanyAdminAuthMetadataStep = createStep(
  "restore-company-admin-auth-metadata",
  async (
    companyIds: string[],
    { container }
  ): Promise<StepResponse<undefined, string[]>> => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: companies } = (await query.graph({
      entity: "company",
      fields: [
        "id",
        "employees.deleted_at",
        "employees.is_admin",
        "employees.customer.email",
      ],
      filters: { id: companyIds },
    })) as { data: CompanyWithEmployees[] }
    const adminEmails = [
      ...new Set(
        companies
          .flatMap((company) => company.employees ?? [])
          .filter((employee) => employee.is_admin && !employee.deleted_at)
          .map((employee) => employee.customer?.email)
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

    return new StepResponse(undefined, providerIdentityIds)
  },
  async (providerIdentityIds: string[] | undefined, { container }) => {
    if (!providerIdentityIds?.length) {
      return
    }

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
)
