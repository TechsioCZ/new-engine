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

export const prepareCustomerAccountDeactivationStep = createStep(
  "prepare-customer-account-deactivation",
  async (
    input: PrepareCustomerAccountDeactivationInput,
    { container }
  ): Promise<StepResponse<PrepareCustomerAccountDeactivationOutput>> => {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)

    const {
      data: [customer],
    } = (await query.graph({
      entity: "customer",
      fields: ["id", "email", "deleted_at"],
      filters: { id: input.customer_id },
    })) as { data: CustomerRecord[] }

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
      const {
        data: [providerIdentity],
      } = (await query.graph({
        entity: "provider_identity",
        fields: ["id", "auth_identity_id"],
        filters: {
          entity_id: customer.email,
          provider: "emailpass",
        },
      })) as { data: ProviderIdentityRecord[] }

      authIdentityId = providerIdentity?.auth_identity_id ?? undefined
    }

    return new StepResponse({
      auth_identity_id: authIdentityId,
      customer_id: customer.id,
    })
  }
)
