import type {
  MedusaResponse,
  MedusaStoreRequest,
} from "@medusajs/framework/http"
import {
  requireExactBodyString,
  setPrivateNoStore,
} from "../../private-flow-utils"
import { isPrivateFlowNotFoundError, issuePaymentReturnState } from "../helpers"

type IssuePaymentReturnBody = {
  cart_id?: string
  provider_id?: string
}

export async function POST(
  request: MedusaStoreRequest<IssuePaymentReturnBody>,
  response: MedusaResponse
) {
  setPrivateNoStore(response)
  try {
    const cartId = requireExactBodyString(request.body, "cart_id")
    const providerId = requireExactBodyString(request.body, "provider_id")
    response.json(await issuePaymentReturnState(request, cartId, providerId))
  } catch (error) {
    if (isPrivateFlowNotFoundError(error)) {
      throw error
    }
    response.status(503).json({
      message: "Payment return verification is temporarily unavailable.",
    })
  }
}
