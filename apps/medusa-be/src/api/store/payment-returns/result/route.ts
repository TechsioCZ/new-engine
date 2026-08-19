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
  resolvePaymentResultSession,
} from "../helpers"

type ResolvePaymentResultBody = {
  result_token?: string
}

export async function POST(
  request: MedusaStoreRequest<ResolvePaymentResultBody>,
  response: MedusaResponse
) {
  setPrivateNoStore(response)
  try {
    response.json(
      await resolvePaymentResultSession(
        request,
        requireExactBodyString(request.body, "result_token")
      )
    )
  } catch (error) {
    if (isPrivateFlowNotFoundError(error)) {
      throw error
    }
    response.status(503).json({
      message: "Payment result verification is temporarily unavailable.",
    })
  }
}
