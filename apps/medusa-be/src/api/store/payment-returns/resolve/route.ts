import type {
  MedusaResponse,
  MedusaStoreRequest,
} from "@medusajs/framework/http"
import {
  requireExactBodyString,
  setPrivateNoStore,
} from "../../private-flow-utils"
import {
  isPrivateFlowNotFoundError,
  resolvePaymentReturnState,
} from "../helpers"

type ResolvePaymentReturnBody = {
  cart_id?: string
  payment_session_id?: string
  provider_id?: string
  state?: string
}

export async function POST(
  request: MedusaStoreRequest<ResolvePaymentReturnBody>,
  response: MedusaResponse
) {
  setPrivateNoStore(response)
  try {
    const paymentSessionId =
      typeof request.body?.payment_session_id === "string"
        ? requireExactBodyString(request.body, "payment_session_id")
        : undefined
    response.json(
      await resolvePaymentReturnState(request, {
        cartId: requireExactBodyString(request.body, "cart_id"),
        paymentSessionId,
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
