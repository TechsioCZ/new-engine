import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { completeCustomerPasswordResetWorkflow } from "../../../../../../workflows/customer/workflows/complete-customer-password-reset"
import { setPrivateNoStore } from "../../../../../store/private-flow-utils"
import {
  readExactPasswordResetBearerToken,
  requirePasswordResetSecret,
  resolveExactPasswordResetMarketAuthority,
  verifyMarketBoundPasswordResetToken,
} from "../market-authority"

type CompletePasswordResetBody = Readonly<{
  password?: unknown
}>

export async function POST(
  request: MedusaRequest<CompletePasswordResetBody>,
  response: MedusaResponse
) {
  setPrivateNoStore(response)
  const authority = await resolveExactPasswordResetMarketAuthority(request)
  const token = readExactPasswordResetBearerToken(request)
  const claims = await verifyMarketBoundPasswordResetToken(
    token,
    requirePasswordResetSecret(),
    authority
  )
  const password = request.body?.password
  if (typeof password !== "string" || !password) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "A new password is required."
    )
  }

  await completeCustomerPasswordResetWorkflow(request.scope).run({
    input: { entity_id: claims.entityId, jti: claims.jti, password },
  })

  response.status(200).json({ success: true })
}
