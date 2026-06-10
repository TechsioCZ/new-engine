import type { IAuthModuleService } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { getProviderIdentityIdsWithoutActiveAdminRole } from "../utils/admin-auth-metadata"

type SetAdminRoleCompensation = {
  customerId: string
  email: string
  employeeId: string
  providerIdentityId: string
}

export const setAdminRoleStep = createStep(
  "set-admin-role",
  async (
    input: { employeeId: string; customerId: string },
    { container }
  ): Promise<StepResponse<undefined, SetAdminRoleCompensation>> => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

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
      return new StepResponse(undefined)
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
      return new StepResponse(undefined)
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

    if (!providerIdentity) {
      return new StepResponse(undefined)
    }

    await authModuleService.updateProviderIdentities([
      {
        id: providerIdentity.id,
        user_metadata: {
          role: "company_admin",
        },
      },
    ])

    return new StepResponse(undefined, {
      customerId: input.customerId,
      email: customer.email,
      employeeId: input.employeeId,
      providerIdentityId: providerIdentity.id,
    })
  },
  async (input: SetAdminRoleCompensation | undefined, { container }) => {
    if (!input) {
      return
    }

    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const providerIdentityIds =
      await getProviderIdentityIdsWithoutActiveAdminRole({
        candidates: [
          {
            customer_id: input.customerId,
            email: input.email,
          },
        ],
        excludedEmployeeIds: [input.employeeId],
        query,
      })

    if (!providerIdentityIds.includes(input.providerIdentityId)) {
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
