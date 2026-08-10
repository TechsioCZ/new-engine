import type { IAuthModuleService, Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import type { QueryCompanyProjection } from "../../../types/company/query"
import { getProviderIdentityIdsWithoutActiveAdminRole } from "../../employee/utils/admin-auth-metadata"

export const clearCompanyAdminAuthMetadataStep = createStep(
  "clear-company-admin-auth-metadata",
  async (
    companyIds: string[],
    { container },
  ): Promise<StepResponse<undefined, string[]>> => {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const companiesResult: { data: QueryCompanyProjection[] } =
      await query.graph({
        entity: "company",
        fields: [
          "id",
          "employees.is_admin",
          "employees.customer.email",
          "employees.customer.id",
        ],
        filters: { id: companyIds },
      })
    const adminCandidates = companiesResult.data.flatMap((company) =>
      (company.employees ?? []).flatMap((employee) =>
        employee !== null && employee.is_admin === true
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
