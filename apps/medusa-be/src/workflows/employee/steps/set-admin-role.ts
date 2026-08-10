import type { IAuthModuleService, Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { z } from "@medusajs/framework/zod"

import { getProviderIdentityIdsWithoutActiveAdminRole } from "../utils/admin-auth-metadata"

interface SetAdminRoleCompensation {
  customerId: string
  email: string
  employeeId: string
  providerIdentityId: string
}

const employeeQuerySchema = z.object({
  data: z.array(
    z.object({
      customer: z.object({ has_account: z.boolean().optional() }).optional(),
    }),
  ),
})
const customerQuerySchema = z.object({
  data: z.array(z.object({ email: z.string().nullable().optional() })),
})
const providerIdentityQuerySchema = z.object({
  data: z.array(z.object({ id: z.string().min(1) })),
})

export const setAdminRoleStep = createStep(
  "set-admin-role",
  async (
    input: { employeeId: string; customerId: string },
    { container },
  ): Promise<StepResponse<undefined, SetAdminRoleCompensation>> => {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)

    const employeeQueryResult: unknown = await query.graph(
      {
        entity: "employee",
        fields: ["id", "is_admin", "customer.has_account"],
        filters: {
          id: input.employeeId,
        },
      },
      { throwIfKeyNotFound: true },
    )
    const [employee] = employeeQuerySchema.parse(employeeQueryResult).data

    if (employee === undefined) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Employee "${input.employeeId}" was not found`,
      )
    }

    if (employee.customer?.has_account === false) {
      return new StepResponse(undefined)
    }

    const customerQueryResult: unknown = await query.graph(
      {
        entity: "customer",
        fields: ["email"],
        filters: {
          id: input.customerId,
        },
      },
      { throwIfKeyNotFound: true },
    )
    const [customer] = customerQuerySchema.parse(customerQueryResult).data

    if (customer === undefined) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Customer "${input.customerId}" was not found`,
      )
    }

    if (
      customer.email === null ||
      customer.email === undefined ||
      customer.email.length === 0
    ) {
      return new StepResponse(undefined)
    }

    const providerIdentityQueryResult: unknown = await query.graph({
      entity: "provider_identity",
      fields: ["*"],
      filters: {
        entity_id: customer.email,
        provider: "emailpass",
      },
    })
    const [providerIdentity] = providerIdentityQuerySchema.parse(
      providerIdentityQueryResult,
    ).data

    const authModuleService = container.resolve<IAuthModuleService>(
      Modules.AUTH,
    )

    if (providerIdentity === undefined) {
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
    if (input === undefined) {
      return
    }

    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
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
      Modules.AUTH,
    )

    await authModuleService.updateProviderIdentities([
      {
        id: input.providerIdentityId,
        user_metadata: {
          role: null,
        },
      },
    ])
  },
)
