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
    is_admin?: boolean
  }>
}

export const clearCompanyAdminAuthMetadataStep = createStep(
  "clear-company-admin-auth-metadata",
  async (
    companyIds: string[],
    { container }
  ): Promise<StepResponse<undefined, string[]>> => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: companies } = (await query.graph({
      entity: "company",
      fields: [
        "id",
        "employees.is_admin",
        "employees.customer.email",
        "employees.customer.id",
      ],
      filters: { id: companyIds },
    })) as { data: CompanyWithEmployees[] }
    const adminCandidates = companies
      .flatMap((company) => company.employees ?? [])
      .filter((employee) => employee.is_admin)
      .map((employee) => ({
        customer_id: employee.customer?.id,
        email: employee.customer?.email,
      }))
    const providerIdentityIds =
      await getProviderIdentityIdsWithoutActiveAdminRole({
        candidates: adminCandidates,
        excludedCompanyIds: companyIds,
        query,
      })

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
          role: "company_admin",
        },
      }))
    )
  }
)
