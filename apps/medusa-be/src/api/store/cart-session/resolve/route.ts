import type {
  MedusaResponse,
  MedusaStoreRequest,
} from "@medusajs/framework/http"
import {
  requireExactBodyString,
  setPrivateNoStore,
} from "../../private-flow-utils"
import {
  assertExactSignedCartSession,
  projectCheckoutStepState,
  retrieveMarketCart,
} from "../helpers"

type ResolveCartSessionBody = {
  cart_id?: string
}

export async function POST(
  request: MedusaStoreRequest<ResolveCartSessionBody>,
  response: MedusaResponse
) {
  setPrivateNoStore(response)
  const cartId = requireExactBodyString(request.body, "cart_id")
  const { cart, salesChannelId } = await retrieveMarketCart(request, cartId)
  assertExactSignedCartSession(request, cartId, salesChannelId)

  response.json({
    cart_id: cart.id,
    ...projectCheckoutStepState(cart),
  })
}
