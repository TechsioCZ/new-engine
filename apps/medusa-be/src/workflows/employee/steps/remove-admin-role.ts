import type { IAuthModuleService } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { getProviderIdentityIdsWithoutActiveAdminRole } from "../utils/admin-auth-metadata"

export const removeAdminRoleStep = createStep(
  "remove-admin-role",
  async (
    input: {
      customer_id?: string
      email: string
      excluded_employee_ids?: string[]
    },
    { container }
  ): Promise<StepResponse<undefined, string[]>> => {
    const authModuleService = container.resolve<IAuthModuleService>(
      Modules.AUTH
    )

    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const providerIdentityIds =
      await getProviderIdentityIdsWithoutActiveAdminRole({
        candidates: [
          {
            customer_id: input.customer_id,
            email: input.email,
          },
        ],
        excludedEmployeeIds: input.excluded_employee_ids ?? [],
        query,
      })

    if (!providerIdentityIds.length) {
      return new StepResponse(undefined, [])
    }

    await authModuleService.updateProviderIdentities(
      providerIdentityIds.map((providerIdentityId) => ({
        id: providerIdentityId,
        user_metadata: {
          role: null,
        },
      }))
    )

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
