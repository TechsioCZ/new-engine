import type {
  MedusaResponse,
  MedusaStoreRequest,
} from "@medusajs/framework/http"
import {
  createCartSessionToken,
  requireCartSessionSecret,
  serializeCartSessionCookie,
} from "../../../../utils/cart-session"
import {
  requireExactBodyString,
  setPrivateNoStore,
} from "../../private-flow-utils"
import { retrieveMarketCart } from "../helpers"

type SyncCartSessionBody = {
  cart_id?: string
}

export async function POST(
  request: MedusaStoreRequest<SyncCartSessionBody>,
  response: MedusaResponse
) {
  setPrivateNoStore(response)
  const cartId = requireExactBodyString(request.body, "cart_id")
  const { cart, salesChannelId } = await retrieveMarketCart(request, cartId)
  const cartSession = createCartSessionToken(
    { cart_id: cart.id, sales_channel_id: salesChannelId },
    requireCartSessionSecret()
  )

  response.setHeader("Set-Cookie", serializeCartSessionCookie(cartSession))
  response.json({ cart_id: cart.id, cart_session: cartSession })
}
