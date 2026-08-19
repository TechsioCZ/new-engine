import type {
  MedusaResponse,
  MedusaStoreRequest,
} from "@medusajs/framework/http"
import {
  requireExactBodyString,
  setPrivateNoStore,
} from "../../private-flow-utils"
import { bindPaymentReturnState, isPrivateFlowNotFoundError } from "../helpers"

type BindPaymentReturnBody = {
  cart_id?: string
  payment_session_id?: string
  provider_id?: string
  state?: string
}

export async function POST(
  request: MedusaStoreRequest<BindPaymentReturnBody>,
  response: MedusaResponse
) {
  setPrivateNoStore(response)
  try {
    response.json(
      await bindPaymentReturnState(request, {
        cartId: requireExactBodyString(request.body, "cart_id"),
        paymentSessionId: requireExactBodyString(
          request.body,
          "payment_session_id"
        ),
        providerId: requireExactBodyString(request.body, "provider_id"),
        state: requireExactBodyString(request.body, "state"),
      })
    )
  } catch (error) {
    if (isPrivateFlowNotFoundError(error)) {
      throw error
    }
    response.status(503).json({
      message: "Payment return verification is temporarily unavailable.",
    })
  }
}
