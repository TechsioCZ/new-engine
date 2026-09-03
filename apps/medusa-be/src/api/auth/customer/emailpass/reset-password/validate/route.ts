import { createHash } from "node:crypto"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
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

type PasswordResetTokenRecord = {
  entity_id: string
  expires_at: Date | string
  id: string
  token_hash: string
}

export async function POST(request: MedusaRequest, response: MedusaResponse) {
  setPrivateNoStore(response)
  const authority = await resolveExactPasswordResetMarketAuthority(request)
  const token = readExactPasswordResetBearerToken(request)
  const claims = await verifyMarketBoundPasswordResetToken(
    token,
    requirePasswordResetSecret(),
    authority
  )

  const query = request.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "auth_password_reset_token",
    fields: ["id", "entity_id", "token_hash", "expires_at"],
    filters: {
      token_hash: createHash("sha256").update(claims.jti).digest("hex"),
    },
    pagination: { take: 1 },
  })
  const resetToken = (data as PasswordResetTokenRecord[])[0]

  if (
    !resetToken ||
    resetToken.entity_id !== claims.entityId ||
    new Date(resetToken.expires_at).getTime() <= Date.now()
  ) {
    return privateFlowNotFound()
  }

  response.json({ valid: true })
}
