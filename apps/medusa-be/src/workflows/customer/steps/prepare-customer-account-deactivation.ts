import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

type PrepareCustomerAccountDeactivationInput = {
  customer_id: string
}

type CustomerRecord = {
  deleted_at?: Date | string | null
  email?: string | null
  id: string
}

type ProviderIdentityRecord = {
  auth_identity_id?: string | null
  id: string
}

type PrepareCustomerAccountDeactivationOutput = {
  auth_identity_id?: string
  customer_id: string
}

const hasArrayData = <T>(
  value: unknown
): value is {
  data: T[]
} => {
  if (!(value && typeof value === "object")) {
    return false
  }

  return Array.isArray((value as { data?: unknown }).data)
}

export const prepareCustomerAccountDeactivationStep = createStep(
  "prepare-customer-account-deactivation",
  async (
    input: PrepareCustomerAccountDeactivationInput,
    { container }
  ): Promise<StepResponse<PrepareCustomerAccountDeactivationOutput>> => {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)

    const customerResult: unknown = await query.graph({
      entity: "customer",
      fields: ["id", "email", "deleted_at"],
      filters: { id: input.customer_id },
    })

    if (!hasArrayData<CustomerRecord>(customerResult)) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Unexpected response shape while loading customer account."
      )
    }

    const [customer] = customerResult.data

    if (!customer) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Customer account was not found."
      )
    }

    if (customer.deleted_at) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Customer account is already deactivated."
      )
    }

    let authIdentityId: string | undefined

    if (customer.email) {
      const providerIdentityResult: unknown = await query.graph({
        entity: "provider_identity",
        fields: ["id", "auth_identity_id"],
        filters: {
          entity_id: customer.email,
          provider: "emailpass",
        },
      })

      if (!hasArrayData<ProviderIdentityRecord>(providerIdentityResult)) {
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          "Unexpected response shape while loading auth identity."
        )
      }

      const [providerIdentity] = providerIdentityResult.data

      authIdentityId = providerIdentity?.auth_identity_id ?? undefined
    }

    return new StepResponse({
      auth_identity_id: authIdentityId,
      customer_id: customer.id,
    })
  }
)
