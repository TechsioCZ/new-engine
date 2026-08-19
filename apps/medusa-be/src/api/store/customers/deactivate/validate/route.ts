import type {
  MedusaResponse,
  MedusaStoreRequest,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { verifyCustomerAccountDeactivationToken } from "../../../../../utils/customer-account-deactivation"
import {
  privateFlowNotFound,
  requireExactBodyString,
  resolveExactMarketSalesChannelId,
  setPrivateNoStore,
} from "../../../private-flow-utils"

type ValidateCustomerDeactivationBody = {
  token?: string
}

const requireDeactivationTokenConfiguration = () => {
  if (!process.env.JWT_SECRET) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Customer deactivation validation is not configured."
    )
  }
}

export async function POST(
  request: MedusaStoreRequest<ValidateCustomerDeactivationBody>,
  response: MedusaResponse
) {
  setPrivateNoStore(response)
  const token = requireExactBodyString(request.body, "token")
  const salesChannelId = resolveExactMarketSalesChannelId(request)
  requireDeactivationTokenConfiguration()

  let verified: Awaited<
    ReturnType<typeof verifyCustomerAccountDeactivationToken>
  >
  try {
    verified = await verifyCustomerAccountDeactivationToken(token)
  } catch {
    return privateFlowNotFound()
  }

  if (!verified.customer_id || verified.sales_channel_id !== salesChannelId) {
    return privateFlowNotFound()
  }

  response.json({ valid: true })
}
