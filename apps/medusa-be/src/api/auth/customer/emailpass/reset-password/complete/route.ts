import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import {
  privateFlowNotFound,
  setPrivateNoStore,
} from "../../../../../store/private-flow-utils"
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

  const authModule = request.scope.resolve(Modules.AUTH)
  try {
    await authModule.consumePasswordResetToken({
      entity_id: claims.entityId,
      jti: claims.jti,
      provider: "emailpass",
    })
  } catch {
    return privateFlowNotFound()
  }

  const { authIdentity, error, success } = await authModule.updateProvider(
    "emailpass",
    { entity_id: claims.entityId, password }
  )
  if (!(success && authIdentity)) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      error || "Unauthorized"
    )
  }

  response.status(200).json({ success: true })
}
