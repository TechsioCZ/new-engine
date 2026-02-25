import type { IAuthModuleService } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

export const removeAdminRoleStep = createStep(
  "remove-admin-role",
  async (
    input: { email: string },
    { container }
  ): Promise<StepResponse<undefined, string>> => {
    const authModuleService = container.resolve<IAuthModuleService>(
      Modules.AUTH
    )

    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const {
      data: [providerIdentity],
    } = await query.graph({
      entity: "provider_identity",
      fields: ["id"],
      filters: {
        provider: "emailpass",
        entity_id: input.email,
      },
    })

    await authModuleService.updateProviderIdentities([
      {
        id: providerIdentity.id,
        user_metadata: {
          role: null,
        },
      },
    ])

    return new StepResponse(undefined, providerIdentity.id)
  },
  async (providerIdentityId: string, { container }) => {
    const authModuleService = container.resolve<IAuthModuleService>(
      Modules.AUTH
    )

    await authModuleService.updateProviderIdentities([
      {
        id: providerIdentityId,
        user_metadata: {
          role: "company_admin",
        },
      },
    ])
  }
)
