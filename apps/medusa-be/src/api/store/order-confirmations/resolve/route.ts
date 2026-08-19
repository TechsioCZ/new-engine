import type {
  MedusaResponse,
  MedusaStoreRequest,
} from "@medusajs/framework/http"
import {
  requireExactBodyString,
  setPrivateNoStore,
} from "../../private-flow-utils"
import {
  assertOrderOwnerOrGuestToken,
  retrievePrivateFlowOrder,
} from "../helpers"

type ResolveOrderConfirmationBody = {
  order_token?: string
  public_order_id?: string
}

export async function POST(
  request: MedusaStoreRequest<ResolveOrderConfirmationBody>,
  response: MedusaResponse
) {
  setPrivateNoStore(response)
  const publicOrderId = requireExactBodyString(request.body, "public_order_id")
  const orderToken =
    typeof request.body?.order_token === "string"
      ? request.body.order_token
      : undefined
  const { order, safeOrder, salesChannelId } = await retrievePrivateFlowOrder(
    request,
    publicOrderId
  )
  await assertOrderOwnerOrGuestToken(request, order, salesChannelId, orderToken)

  response.json({ order: safeOrder })
}
