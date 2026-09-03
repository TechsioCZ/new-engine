import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { deactivateCustomerAccountWorkflow } from "../../../../../workflows/customer/workflows/deactivate-customer-account"
import { verifyCustomerAccountDeactivationWorkflow } from "../../../../../workflows/customer/workflows/verify-customer-account-deactivation"
import {
  privateFlowNotFound,
  resolveExactMarketSalesChannelId,
  setPrivateNoStore,
} from "../../../private-flow-utils"
import type { StoreConfirmDeactivateCustomerAccountSchemaType } from "../../validators"

export async function POST(
  req: MedusaRequest<StoreConfirmDeactivateCustomerAccountSchemaType>,
  res: MedusaResponse
) {
  setPrivateNoStore(res)
  const salesChannelId = resolveExactMarketSalesChannelId(req)
  const { result: verified } = await verifyCustomerAccountDeactivationWorkflow(
    req.scope
  ).run({
    input: {
      token: req.validatedBody.token,
    },
  })

  if (verified.sales_channel_id !== salesChannelId) {
    return privateFlowNotFound()
  }

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
