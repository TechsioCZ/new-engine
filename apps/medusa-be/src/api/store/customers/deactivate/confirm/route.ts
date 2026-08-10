import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { deactivateCustomerAccountWorkflow } from "../../../../../workflows/customer/workflows/deactivate-customer-account"
import { verifyCustomerAccountDeactivationWorkflow } from "../../../../../workflows/customer/workflows/verify-customer-account-deactivation"
import type { StoreConfirmDeactivateCustomerAccountSchemaType } from "../../validators"

const post = async (
  req: MedusaRequest<StoreConfirmDeactivateCustomerAccountSchemaType>,
  res: MedusaResponse,
) => {
  const { result: verified } = await verifyCustomerAccountDeactivationWorkflow(
    req.scope,
  ).run({
    input: {
      token: req.validatedBody.token,
    },
  })

  const { result } = await deactivateCustomerAccountWorkflow(req.scope).run({
    input: {
      customer_id: verified.customer_id,
      deactivation_nonce: verified.deactivation_nonce,
    },
  })

  res.status(200).json({
    auth_identity_deleted: result.auth_identity_deleted,
    customer_id: result.customer_id,
    deleted: result.deleted,
  })
}

export { post as POST }
