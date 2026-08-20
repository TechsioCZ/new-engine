import { createHash } from "node:crypto"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { jwtVerify } from "jose"
import {
  privateFlowNotFound,
  setPrivateNoStore,
} from "../../../../../store/private-flow-utils"

type PasswordResetTokenRecord = {
  entity_id: string
  expires_at: Date | string
  id: string
  token_hash: string
}

const requireJwtSecret = () => {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Password-reset validation is not configured."
    )
  }
  return secret
}

const readExactBearerToken = (authorization: string | undefined) => {
  if (!authorization?.startsWith("Bearer ")) {
    return privateFlowNotFound()
  }

  const token = authorization.slice("Bearer ".length)
  if (!token || token !== token.trim() || token.includes(" ")) {
    return privateFlowNotFound()
  }

  return token
}

export async function POST(request: MedusaRequest, response: MedusaResponse) {
  setPrivateNoStore(response)
  const header = request.headers.authorization
  const token = readExactBearerToken(Array.isArray(header) ? undefined : header)
  const jwtSecret = requireJwtSecret()

  let payload: Awaited<ReturnType<typeof jwtVerify>>["payload"]
  try {
    const verified = await jwtVerify(token, new TextEncoder().encode(jwtSecret))
    payload = verified.payload
  } catch {
    return privateFlowNotFound()
  }

  if (
    payload.actor_type !== "customer" ||
    payload.provider !== "emailpass" ||
    payload.purpose !== "reset" ||
    typeof payload.entity_id !== "string" ||
    typeof payload.jti !== "string"
  ) {
    return privateFlowNotFound()
  }

  const query = request.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "auth_password_reset_token",
    fields: ["id", "entity_id", "token_hash", "expires_at"],
    filters: {
      token_hash: createHash("sha256").update(payload.jti).digest("hex"),
    },
    pagination: { take: 1 },
  })
  const resetToken = (data as PasswordResetTokenRecord[])[0]

  if (
    !resetToken ||
    resetToken.entity_id !== payload.entity_id ||
    new Date(resetToken.expires_at).getTime() <= Date.now()
  ) {
    return privateFlowNotFound()
  }

  response.json({ valid: true })
}
