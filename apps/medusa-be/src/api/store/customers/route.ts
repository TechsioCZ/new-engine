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
import { normalizeEmail } from "../../../utils/email"
import { reactivateCustomerAccountWorkflow } from "../../../workflows/customer/workflows/reactivate-customer-account"
import { findInactiveCustomerWithEmail, refetchCustomer } from "./helpers"
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
  const inactiveCustomer = await findInactiveCustomerWithEmail({
    email: customerData.email,
    query,
  })

  if (inactiveCustomer) {
    const { result: reactivatedResult } =
      await reactivateCustomerAccountWorkflow(req.scope).run({
        input: {
          auth_identity_id: req.auth_context.auth_identity_id,
          company_name: customerData.company_name,
          customer: inactiveCustomer,
          email: customerData.email,
          first_name: customerData.first_name,
          last_name: customerData.last_name,
          metadata: customerData.metadata,
          phone: customerData.phone,
        },
      })

    const customer = await refetchCustomer(
      reactivatedResult.customer.id,
      query,
      req.queryConfig.fields
    )

    res.status(200).json({ customer })
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
    query,
    req.queryConfig.fields
  )

  res.status(200).json({ customer })
}
