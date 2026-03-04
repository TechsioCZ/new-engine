import type { IAuthModuleService } from "@medusajs/framework/types"
import type { RemoteQueryFunction } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

export const setAdminRoleStep = createStep(
  "set-admin-role",
  async (
    input: { employeeId: string; customerId: string },
    { container }
  ): Promise<
    StepResponse<undefined, { providerIdentityId: string | undefined }>
  > => {
    const query = container.resolve<RemoteQueryFunction>(
      ContainerRegistrationKeys.QUERY
    )

    const {
      data: [employee],
    } = await query.graph(
      {
        entity: "employee",
        fields: ["id", "is_admin", "customer.has_account"],
        filters: {
          id: input.employeeId,
        },
      },
      { throwIfKeyNotFound: true }
    )

    if (employee.customer?.has_account === false) {
      return new StepResponse(undefined, { providerIdentityId: undefined })
    }

    const {
      data: [customer],
    } = await query.graph(
      {
        entity: "customer",
        fields: ["email"],
        filters: {
          id: input.customerId,
        },
      },
      { throwIfKeyNotFound: true }
    )

    if (!customer.email) {
      return new StepResponse(undefined, { providerIdentityId: undefined })
    }

    const {
      data: [providerIdentity],
    } = await query.graph({
      entity: "provider_identity",
      fields: ["*"],
      filters: {
        provider: "emailpass",
        entity_id: customer.email,
      },
    })

    const authModuleService = container.resolve<IAuthModuleService>(
      Modules.AUTH
    )

    if (providerIdentity) {
      await authModuleService.updateProviderIdentities([
        {
          id: providerIdentity.id,
          user_metadata: {
            role: "company_admin",
          },
        },
      ])
    }

    return new StepResponse(undefined, {
      providerIdentityId: providerIdentity?.id,
    })
  },
  async (input, { container }) => {
    if (!input?.providerIdentityId) {
      return
    }

    const authModuleService = container.resolve<IAuthModuleService>(
      Modules.AUTH
    )

    await authModuleService.updateProviderIdentities([
      {
        id: input.providerIdentityId,
        user_metadata: {
          role: null,
        },
      },
    ])
  }
)
