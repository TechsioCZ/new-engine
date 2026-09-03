import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { requestCustomerAccountDeactivationWorkflow } from "../../../../../workflows/customer/workflows/request-customer-account-deactivation"
import {
  resolveExactMarketSalesChannelId,
  setPrivateNoStore,
} from "../../../private-flow-utils"
import type { StoreDeactivateCustomerAccountSchemaType } from "../../validators"

export async function POST(
  req: AuthenticatedMedusaRequest<StoreDeactivateCustomerAccountSchemaType>,
  res: MedusaResponse
) {
  setPrivateNoStore(res)
  const salesChannelId = resolveExactMarketSalesChannelId(req)
  const { result } = await requestCustomerAccountDeactivationWorkflow(
    req.scope
  ).run({
    input: {
      customer_id: req.auth_context.actor_id,
      sales_channel_id: salesChannelId,
    },
  })

  res.status(200).json({
    customer_id: result.customer_id,
    sent: result.sent,
  })
}
