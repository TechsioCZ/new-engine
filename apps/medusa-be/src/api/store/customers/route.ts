import { createCustomerAccountWorkflow } from "@medusajs/core-flows"
import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { createOrReactivateCustomerAccountWorkflow } from "../../../workflows/customer/workflows/create-or-reactivate-customer-account"
import {
  hasInactiveCustomerWithEmail,
  normalizeEmail,
  refetchCustomer,
} from "./helpers"
import type { StoreCreateCustomerAccountSchemaType } from "./validators"

export async function POST(
  req: AuthenticatedMedusaRequest<StoreCreateCustomerAccountSchemaType>,
  res: MedusaResponse
) {
  if (req.auth_context.actor_id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Request already authenticated as a customer."
    )
  }

  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const customerData = {
    ...req.validatedBody,
    email: normalizeEmail(req.validatedBody.email),
  }

  if (
    await hasInactiveCustomerWithEmail({
      email: customerData.email,
      query,
    })
  ) {
    const { result: reactivatedResult } =
      await createOrReactivateCustomerAccountWorkflow(req.scope).run({
        input: {
          auth_identity_id: req.auth_context.auth_identity_id,
          company_name: customerData.company_name,
          email: customerData.email,
          first_name: customerData.first_name,
          last_name: customerData.last_name,
          metadata: customerData.metadata,
          phone: customerData.phone,
        },
      })

    res.status(200).json({
      customer: reactivatedResult.customer,
    })
    return
  }

  const { result } = await createCustomerAccountWorkflow(req.scope).run({
    input: {
      authIdentityId: req.auth_context.auth_identity_id,
      customerData,
    },
  })

  const customer = await refetchCustomer(
    result.id,
    req.scope,
    req.queryConfig.fields
  )

  res.status(200).json({ customer })
}
