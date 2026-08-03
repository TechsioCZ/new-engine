import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { deactivateCustomerAccountWorkflow } from "../../../../../workflows/customer/workflows/deactivate-customer-account"
import type { StoreDeactivateCustomerAccountSchemaType } from "../../validators"

export async function POST(
  req: AuthenticatedMedusaRequest<StoreDeactivateCustomerAccountSchemaType>,
  res: MedusaResponse
) {
  const { result } = await deactivateCustomerAccountWorkflow(req.scope).run({
    input: {
      customer_id: req.auth_context.actor_id,
    },
  })

  res.status(200).json({
    customer_id: result.customer_id,
    deleted: result.deleted,
  })
}
