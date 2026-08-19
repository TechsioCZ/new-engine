import type {
  MedusaResponse,
  MedusaStoreRequest,
} from "@medusajs/framework/http"
import {
  requireExactBodyString,
  setPrivateNoStore,
} from "../../private-flow-utils"
import {
  issueGuestOrderConfirmationToken,
  retrievePrivateFlowOrder,
} from "../helpers"

type IssueOrderConfirmationBody = {
  cart_id?: string
  public_order_id?: string
}

export async function POST(
  request: MedusaStoreRequest<IssueOrderConfirmationBody>,
  response: MedusaResponse
) {
  setPrivateNoStore(response)
  const publicOrderId = requireExactBodyString(request.body, "public_order_id")
  const cartId = requireExactBodyString(request.body, "cart_id")
  const { order, salesChannelId } = await retrievePrivateFlowOrder(
    request,
    publicOrderId
  )
  const orderToken = await issueGuestOrderConfirmationToken(
    request,
    order,
    salesChannelId,
    cartId
  )

  response.json({ order_token: orderToken, public_order_id: order.id })
}
