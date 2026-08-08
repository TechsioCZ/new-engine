import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { deactivateCustomerAccountWorkflow } from "../../../../../workflows/customer/workflows/deactivate-customer-account"
import { verifyCustomerAccountDeactivationWorkflow } from "../../../../../workflows/customer/workflows/verify-customer-account-deactivation"
import type { StoreConfirmDeactivateCustomerAccountSchemaType } from "../../validators"

export async function POST(
  req: MedusaRequest<StoreConfirmDeactivateCustomerAccountSchemaType>,
  res: MedusaResponse
) {
  const { result: verified } = await verifyCustomerAccountDeactivationWorkflow(
    req.scope
  ).run({
    input: {
      token: req.validatedBody.token,
    },
  })

  const { result } = await deactivateCustomerAccountWorkflow(req.scope).run({
    input: {
      customer_id: verified.customer_id,
    },
  })

  res.status(200).json({
    auth_identity_deleted: result.auth_identity_deleted,
    customer_id: result.customer_id,
    deleted: result.deleted,
  })
}
