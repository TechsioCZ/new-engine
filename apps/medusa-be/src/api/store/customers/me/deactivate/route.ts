import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { requestCustomerAccountDeactivationWorkflow } from "../../../../../workflows/customer/workflows/request-customer-account-deactivation"
import type { StoreDeactivateCustomerAccountSchemaType } from "../../validators"

const post = async (
  req: AuthenticatedMedusaRequest<StoreDeactivateCustomerAccountSchemaType>,
  res: MedusaResponse,
) => {
  const { result } = await requestCustomerAccountDeactivationWorkflow(
    req.scope,
  ).run({
    input: {
      customer_id: req.auth_context.actor_id,
    },
  })

  res.status(200).json({
    customer_id: result.customer_id,
    sent: result.sent,
  })
}

export { post as POST }
